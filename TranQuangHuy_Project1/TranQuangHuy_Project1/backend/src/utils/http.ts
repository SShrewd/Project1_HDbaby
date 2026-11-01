import type { Request, Response, NextFunction, RequestHandler } from 'express';
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assert(condition: unknown, status: number, message: string): asserts condition {
  if (!condition) throw new AppError(status, message);
}
export const handler =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
export const send = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ data });
export function page(query: Request['query']) {
  return {
    page: Math.floor(Math.max(1, Math.min(10000, Number(query.page) || 1))),
    limit: Math.floor(Math.max(1, Math.min(100, Number(query.limit) || 12))),
  };
}
export const numberId = (value: unknown) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 2147483647)
    throw new AppError(400, 'Mã dữ liệu không hợp lệ');
  return n;
};
