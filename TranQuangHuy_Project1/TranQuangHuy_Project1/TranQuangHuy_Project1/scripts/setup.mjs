import { existsSync, copyFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const envPath = resolve(root, 'backend/.env');
if (!existsSync(envPath) || /127\.0\.0\.1:3307\/hdbaby_db/.test(readFileSync(envPath, 'utf8'))) {
  if (process.platform === 'win32') {
    const r = spawnSync(process.execPath, ['scripts/local-mysql.mjs'], {
      cwd: root,
      stdio: 'inherit',
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
  } else {
    copyFileSync(resolve(root, '.env.example'), resolve(root, 'backend/.env'));
    console.log('Điền backend/.env rồi chạy npm run db:migrate và npm run db:seed.');
    process.exit(0);
  }
}
for (const script of ['db:generate', 'db:migrate', 'db:seed']) {
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
