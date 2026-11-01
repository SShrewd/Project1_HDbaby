import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { config } from '../config/index.js';
import { AppError } from '../utils/http.js';
// Express publishes its Request augmentation through this namespace.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: number;
        name: string;
        role: 'ADMIN' | 'CUSTOMER';
        email: string;
      };
      sessionId?: string;
    }
  }
}
export const auth: RequestHandler = async (req, _res, next) => {
  try {
    const payload = jwt.verify(req.cookies.access || '', config.JWT_SECRET) as {
      sid: string;
    };
    const session = await db.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date() || !session.user.active)
      throw Error('Invalid session');
    req.user = {
      id: session.user.id,
      name: session.user.name,
      role: session.user.role,
      email: session.user.email,
    };
    req.sessionId = session.id;
    next();
  } catch {
    next(new AppError(401, 'Vui lòng đăng nhập để tiếp tục'));
  }
};
export const admin: RequestHandler = (req, _res, next) =>
  req.user?.role === 'ADMIN'
    ? next()
    : next(new AppError(403, 'Chỉ quản trị viên được phép thực hiện'));
