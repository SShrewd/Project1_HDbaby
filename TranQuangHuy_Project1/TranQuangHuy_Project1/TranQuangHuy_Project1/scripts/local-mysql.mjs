import { spawn, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  openSync,
  closeSync,
  appendFileSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import net from 'node:net';
import {
  findMysqlBin,
  logTail,
  safeDiagnostic,
  verifyMysqlDirectory,
  mysqlDataStatus,
} from './mysql-support.mjs';

async function start() {
  const root = resolve(import.meta.dirname, '..');
  const runtime = join(root, '.runtime');
  mkdirSync(runtime, { recursive: true });
  const stateFile = join(runtime, 'database.json');
  let state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : undefined;
  const secrets = [state?.password, state?.rootPassword];
  const envPath = join(root, 'backend', '.env');
  if (existsSync(envPath)) {
    const raw = readFileSync(envPath, 'utf8');
    const urlLine = raw.match(/^\s*DATABASE_URL\s*=\s*["']?(mysql:\/\/[^\s"']+)/m)?.[1];
    if (urlLine) {
      const url = new URL(urlLine);
      if (
        url.hostname === '127.0.0.1' &&
        url.port === '3307' &&
        url.username === 'hdbaby' &&
        (!state || decodeURIComponent(url.password) !== state.password)
      ) {
        throw Error(
          'backend/.env khong khop .runtime/database.json tren may nay. Thuong do copy cau hinh tu may cu. Giu nguyen ban cu; giai nen source zip sach vao thu muc moi roi setup. Xem docs/TROUBLESHOOTING.md de chuyen du lieu bang SQL.',
        );
      }
    }
  }
  const bin = findMysqlBin();
  const data = join(runtime, 'mysql');
  const log = join(runtime, 'mysql.log');
  const isOpen = () =>
    new Promise((done) => {
      const socket = net.connect(3307, '127.0.0.1');
      const finish = (open) => {
        socket.destroy();
        done(open);
      };
      socket.setTimeout(1000);
      socket.once('connect', () => finish(true));
      socket.once('error', () => finish(false));
      socket.once('timeout', () => finish(false));
    });
  if (await isOpen()) {
    verifyMysqlDirectory(bin, data, state?.rootPassword);
  } else {
    const dataStatus = mysqlDataStatus(data);
    if (dataStatus === 'incomplete' || (state && dataStatus !== 'initialized'))
      throw Error(
        `Thu muc du lieu MySQL chua day du: ${data}. Khong tu dong initialize vao thu muc nay vi co the con du lieu cu. Xem muc Failed to find valid data directory trong docs/TROUBLESHOOTING.md: sao luu .runtime VA backend/.env, roi setup du lieu demo moi, hoac khoi phuc bang SQL neu can giu du lieu da nhap.`,
      );
    mkdirSync(data, { recursive: true });
    appendFileSync(log, `\n--- HDbaby startup ${new Date().toISOString()} ---\n`);
    console.log(`MySQL bin: ${bin}\nData: ${data}\nLog: ${log}`);
    if (dataStatus === 'empty') {
      const init = spawnSync(
        join(bin, 'mysqld.exe'),
        [
          '--no-defaults',
          `--basedir=${resolve(bin, '..')}`,
          `--datadir=${data}`,
          '--initialize-insecure',
          '--console',
        ],
        { encoding: 'utf8', windowsHide: true, timeout: 120000 },
      );
      appendFileSync(log, safeDiagnostic(`${init.stdout || ''}\n${init.stderr || ''}`, secrets));
      if (init.error || init.status !== 0)
        throw Error(
          `Khoi tao MySQL that bai: ${safeDiagnostic(init.error?.message || init.stderr, secrets)}\nXem ${log}`,
        );
    }
    const out = openSync(log, 'a');
    const daemon = spawn(
      join(bin, 'mysqld.exe'),
      [
        '--no-defaults',
        `--basedir=${resolve(bin, '..')}`,
        `--datadir=${data}`,
        '--port=3307',
        '--bind-address=127.0.0.1',
        '--mysqlx=OFF',
        '--character-set-server=utf8mb4',
        '--collation-server=utf8mb4_unicode_ci',
        '--console',
      ],
      { detached: false, windowsHide: true, stdio: ['ignore', out, out] },
    );
    let failed;
    daemon.once('error', (error) => {
      failed = error.message;
      closeSync(out);
    });
    daemon.once('spawn', () => closeSync(out));
    daemon.once('exit', (code, signal) => {
      failed = `mysqld da thoat (code=${code}, signal=${signal || 'none'})`;
    });
    daemon.unref();
    let ready = false;
    for (let i = 0; i < 120; i++) {
      await new Promise((done) => setTimeout(done, 500));
      if (failed) break;
      if (await isOpen()) {
        ready = true;
        break;
      }
    }
    if (!ready)
      throw Error(
        `Khong khoi dong duoc MySQL. ${safeDiagnostic(failed || 'Het thoi gian cho 60 giay.', secrets)}\n${logTail(log, secrets)}\nDoc log day du: Get-Content .\\.runtime\\mysql.log -Tail 40\nKhong xoa .runtime/mysql de thu lai; hay xem docs/TROUBLESHOOTING.md.`,
      );
    verifyMysqlDirectory(bin, data, state?.rootPassword);
  }
  if (!state) {
    const password = randomBytes(24).toString('hex');
    const rootPassword = randomBytes(24).toString('hex');
    const sql = `CREATE DATABASE IF NOT EXISTS hdbaby_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'hdbaby'@'127.0.0.1' IDENTIFIED BY '${password}'; GRANT ALL PRIVILEGES ON hdbaby_db.* TO 'hdbaby'@'127.0.0.1'; ALTER USER 'root'@'localhost' IDENTIFIED BY '${rootPassword}';`;
    const result = spawnSync(
      join(bin, 'mysql.exe'),
      ['--no-defaults', '--protocol=TCP', '-h', '127.0.0.1', '-P', '3307', '-u', 'root'],
      { input: sql, encoding: 'utf8', windowsHide: true, env: { ...process.env, MYSQL_PWD: '' } },
    );
    if (result.error || result.status !== 0)
      throw Error(safeDiagnostic(result.error?.message || result.stderr, [password, rootPassword]));
    state = { password, rootPassword };
    writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
  }
  if (!existsSync(envPath))
    writeFileSync(
      envPath,
      `DATABASE_URL=mysql://hdbaby:${state.password}@127.0.0.1:3307/hdbaby_db\nJWT_SECRET=${randomBytes(48).toString('hex')}\nPORT=5000\nCLIENT_ORIGIN=http://localhost:5173\nNODE_ENV=development\nDEMO_MODE=true\nRESET_MAIL_DIR=../.runtime/mail\n`,
    );
  console.log('MySQL HDbaby san sang tai 127.0.0.1:3307.');
}
start().catch((error) => {
  console.error(`\n[HDbaby MySQL] ${error.message}`);
  process.exitCode = 1;
});
