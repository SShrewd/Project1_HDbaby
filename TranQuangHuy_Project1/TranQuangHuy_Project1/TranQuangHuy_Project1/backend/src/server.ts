import { app } from './app.js';
import { config } from './config/index.js';
import { db } from './config/db.js';
import { logger } from './middlewares/security.js';
await db.$connect();
if (
  config.NODE_ENV === 'production' &&
  (await db.user.count({ where: { email: { endsWith: '@hdbaby.local' } } }))
)
  throw Error('Production must use a database without demo accounts.');
const server = app.listen(config.PORT, '127.0.0.1', () =>
  logger.info(`HDbaby API http://localhost:${config.PORT}`),
);
const shutdown = () =>
  server.close(() => {
    void db.$disconnect().then(() => process.exit(0));
  });
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
