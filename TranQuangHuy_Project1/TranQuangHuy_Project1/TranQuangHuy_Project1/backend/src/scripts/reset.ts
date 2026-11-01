import { spawnSync } from 'node:child_process';
import { config } from '../config/index.js';
if (
  config.NODE_ENV === 'production' ||
  config.DEMO_MODE !== 'true' ||
  new URL(config.DATABASE_URL).pathname !== '/hdbaby_db'
)
  throw Error('Chỉ được reset database hdbaby_db trong môi trường demo.');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
for (const args of [
  ['exec', '--', 'prisma', 'migrate', 'reset', '--force', '--skip-seed'],
  ['run', 'db:seed'],
]) {
  const result = spawnSync(npm, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
