import type { RequestHandler, ErrorRequestHandler } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { config } from '../config/index.js';
import { AppError } from '../utils/http.js';
import pino from 'pino';
export const logger = pino({
  redact: ['req.headers.cookie', 'req.headers.authorization', 'password', 'token', 'passwordHash'],
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
});
const origins = [config.CLIENT_ORIGIN, 'http://127.0.0.1:5173'];
if (config.NODE_ENV !== 'production')
  origins.push(`http://localhost:${config.PORT}`, `http://127.0.0.1:${config.PORT}`);
export const csrf: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !origins.includes(origin))
    return next(new AppError(403, 'Nguồn yêu cầu không được phép'));
  const header = req.headers['x-csrf-token'];
  const cookie = req.cookies.csrf;
  if (
    typeof header !== 'string' ||
    typeof cookie !== 'string' ||
    !/^[a-f0-9]{64}$/.test(header) ||
    !/^[a-f0-9]{64}$/.test(cookie) ||
    !timingSafeEqual(Buffer.from(header), Buffer.from(cookie))
  )
    return next(new AppError(403, 'Phiên biểu mẫu hết hạn, vui lòng tải lại trang'));
  next();
};
export const errors: ErrorRequestHandler = (error, req, res, _next) => {
  let status = 500,
    message = 'Có lỗi hệ thống, vui lòng thử lại';
  let issues: unknown;
  if (error instanceof AppError) {
    status = error.status;
    message = error.message;
  } else if (error instanceof ZodError) {
    status = 400;
    message = error.issues[0]?.message || 'Dữ liệu không hợp lệ';
    issues = error.flatten();
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      status = 409;
      message = 'Dữ liệu đã tồn tại';
    } else if (error.code === 'P2025') {
      status = 404;
      message = 'Không tìm thấy dữ liệu';
    } else if (error.code === 'P2003') {
      status = 409;
      message = 'Dữ liệu đang được sử dụng, không thể xóa';
    } else if (error.code === 'P2034') {
      status = 409;
      message = 'Dữ liệu vừa thay đổi, vui lòng thử lại';
    }
  } else if (error instanceof MulterError) {
    status = 400;
    message = 'Ảnh tối đa 5 MB, mỗi lần không quá 10 ảnh';
  } else if (error instanceof SyntaxError) {
    status = 400;
    message = 'JSON không hợp lệ';
  }
  if (status === 500) logger.error({ err: error, path: req.path }, 'Request failed');
  res.status(status).json({ error: { message, issues } });
};
