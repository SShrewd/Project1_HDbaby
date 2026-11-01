import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export function mysqlDataStatus(data, exists = existsSync, list = readdirSync) {
  if (!exists(data) || list(data).every((name) => name.startsWith('.'))) return 'empty';
  return ['ibdata1', 'mysql.ibd'].every((name) => exists(join(data, name)))
    ? 'initialized'
    : 'incomplete';
}

export function findMysqlBin(env = process.env, exists = existsSync, list = readdirSync) {
  const valid = (dir) => exists(join(dir, 'mysqld.exe')) && exists(join(dir, 'mysql.exe'));
  if (env.MYSQL_BIN) {
    if (!valid(env.MYSQL_BIN))
      throw Error(
        `MYSQL_BIN khong hop le: ${env.MYSQL_BIN}. Thu muc phai chua mysqld.exe va mysql.exe.`,
      );
    return resolve(env.MYSQL_BIN);
  }
  const candidates = ['C:/Program Files/MySQL/MySQL Server 8.0/bin'];
  for (const base of [env.ProgramFiles, env['ProgramFiles(x86)']].filter(Boolean)) {
    const home = join(base, 'MySQL');
    if (exists(home))
      for (const dir of list(home)
        .filter((s) => /^MySQL Server 8\./i.test(s))
        .sort())
        candidates.push(join(home, dir, 'bin'));
  }
  candidates.push(...(env.PATH || env.Path || '').split(';').filter(Boolean));
  const bin = candidates.find(valid);
  if (!bin)
    throw Error(
      "Khong tim thay MySQL Server 8. Cai MySQL Server 8 hoac dat $env:MYSQL_BIN = 'D:\\MySQL\\bin'. Thu muc phai chua ca mysqld.exe va mysql.exe.",
    );
  return resolve(bin);
}

export function safeDiagnostic(message, secrets = []) {
  let value = String(message || 'Khong co chi tiet tu he dieu hanh.');
  for (const secret of secrets.filter(Boolean)) value = value.split(secret).join('[REDACTED]');
  return value.replace(/mysql:\/\/[^\s]+/gi, '[DATABASE_URL REDACTED]');
}

export function logTail(path, secrets = []) {
  if (!existsSync(path)) return 'Chua co mysql.log. Kiem tra quyen ghi thu muc va MYSQL_BIN.';
  return safeDiagnostic(
    readFileSync(path, 'utf8').trim().split(/\r?\n/).slice(-35).join('\n'),
    secrets,
  );
}

export function verifyMysqlDirectory(bin, data, password) {
  const result = spawnSync(
    join(bin, 'mysql.exe'),
    [
      '--no-defaults',
      '--connect-timeout=3',
      '--protocol=TCP',
      '-h',
      '127.0.0.1',
      '-P',
      '3307',
      '-u',
      'root',
      '-N',
      '-e',
      'SELECT @@datadir',
    ],
    {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5000,
      env: { ...process.env, MYSQL_PWD: password || '' },
    },
  );
  if (result.error || result.status !== 0)
    throw Error(
      `Khong xac thuc duoc MySQL tai cong 3307. Co the cong dang thuoc dich vu khac hoac .runtime/database.json khong khop du lieu.\n${safeDiagnostic(result.error?.message || result.stderr, [password])}`,
    );
  if (resolve(result.stdout.trim()).toLowerCase() !== resolve(data).toLowerCase())
    throw Error(
      'Cong 3307 dang thuoc MySQL khac (datadir khong phai .runtime/mysql cua du an nay). Khong thay doi dich vu do. Xem README de dung MySQL rieng.',
    );
}
