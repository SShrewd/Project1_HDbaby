import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { resolve } from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { db } from './config/db.js';
import { csrf, errors, logger } from './middlewares/security.js';
import { handler, send } from './utils/http.js';
import { token } from './utils/security.js';
import { authRoutes } from './modules/auth.controller.js';
import { catalogRoutes } from './modules/catalog.controller.js';
import { customerRoutes } from './modules/customer.controller.js';
import { adminRoutes } from './modules/admin.controller.js';
import { openapi } from './openapi.js';
export const app = express();
app.disable('x-powered-by');
app.set('json spaces', 0);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(
  cors({
    origin: [config.CLIENT_ORIGIN, 'http://127.0.0.1:5173'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }), cookieParser());
app.use('/api', (req, res, next) => {
  if (req.cookies.access || req.cookies.refresh) res.set('Cache-Control', 'no-store');
  next();
});
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () =>
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - started,
    }),
  );
  next();
});
app.get(
  '/api/health',
  handler(async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    send(res, { status: 'ok', demo: config.DEMO_MODE === 'true' });
  }),
);
app.get('/api/csrf', (req, res) => {
  const value =
    typeof req.cookies.csrf === 'string' && /^[a-f0-9]{64}$/.test(req.cookies.csrf)
      ? req.cookies.csrf
      : token();
  res.cookie('csrf', value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    path: '/api',
  });
  res.set('Cache-Control', 'no-store');
  send(res, { token: value });
});
app.get('/api/openapi.json', (_req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.use('/api', csrf);
app.use(
  '/api',
  rateLimit({
    windowMs: 60000,
    limit: 600,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.NODE_ENV === 'test',
    message: { error: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' } },
  }),
);
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    skipSuccessfulRequests: true,
    skip: (req) =>
      config.NODE_ENV === 'test' ||
      !['/login', '/register', '/forgot-password', '/reset-password', '/change-password'].includes(
        req.path,
      ),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: { message: 'Quá nhiều lần thử đăng nhập. Vui lòng đợi 15 phút.' },
    },
  }),
  authRoutes,
);
app.use('/uploads', express.static(resolve('uploads'), { dotfiles: 'deny', maxAge: '7d' }));
app.use('/api', catalogRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', customerRoutes);
app.use((_req, res) => res.status(404).json({ error: { message: 'Không tìm thấy đường dẫn' } }));
app.use(errors);
