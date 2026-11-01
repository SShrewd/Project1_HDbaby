import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { findMysqlBin } from './mysql-support.mjs';
const root = resolve(import.meta.dirname, '..');
const state = JSON.parse(readFileSync(join(root, '.runtime/database.json'), 'utf8'));
const bin = findMysqlBin();
const args = ['--protocol=TCP', '-h', '127.0.0.1', '-P', '3307', '-u', 'root', '-N'];
const env = { ...process.env, MYSQL_PWD: state.rootPassword };
const check = spawnSync(join(bin, 'mysql.exe'), [...args, '-e', 'SELECT @@datadir'], {
  env,
  encoding: 'utf8',
  windowsHide: true,
});
if (
  check.status !== 0 ||
  resolve(check.stdout.trim()).toLowerCase() !== resolve(root, '.runtime/mysql').toLowerCase()
)
  throw Error('Không phải MySQL của dự án; không thực hiện shutdown.');
const stop = spawnSync(join(bin, 'mysql.exe'), args, {
  env,
  input: 'SHUTDOWN;',
  encoding: 'utf8',
  windowsHide: true,
});
if (stop.status !== 0) throw Error(stop.stderr);
console.log('Đã dừng MySQL riêng của HDbaby.');
