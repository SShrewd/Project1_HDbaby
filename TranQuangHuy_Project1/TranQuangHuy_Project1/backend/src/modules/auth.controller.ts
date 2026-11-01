import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { db, transaction } from '../config/db.js';
import { config } from '../config/index.js';
import { auth } from '../middlewares/auth.js';
import { handler, send, assert } from '../utils/http.js';
import { hash, token } from '../utils/security.js';
import * as schemas from '../validators/index.js';
import { createSession, publicUser, verifyPassword, cookieOptions } from './auth.service.js';
export const authRoutes = Router();
authRoutes.post(
  '/register',
  handler(async (req, res) => {
    const input = schemas.register.parse(req.body);
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: await bcrypt.hash(input.password, 12),
      },
    });
    send(res, await createSession(user, res), 201);
  }),
);
authRoutes.post(
  '/login',
  handler(async (req, res) => {
    const input = schemas.login.parse(req.body);
    const user = await db.user.findUnique({ where: { email: input.email } });
    assert(
      user?.active && (await verifyPassword(input.password, user.passwordHash)),
      401,
      'Email hoặc mật khẩu không đúng',
    );
    send(res, await createSession(user, res));
  }),
);
authRoutes.post(
  '/refresh',
  handler(async (req, res) => {
    const session = await db.session.findUnique({
      where: { refreshHash: hash(req.cookies.refresh || '') },
      include: { user: true },
    });
    assert(
      session && session.expiresAt > new Date() && session.user.active,
      401,
      'Phiên đăng nhập đã hết hạn',
    );
    const count = await db.session.deleteMany({
      where: { id: session.id, refreshHash: session.refreshHash },
    });
    assert(count.count === 1, 401, 'Phiên đã được sử dụng');
    send(res, await createSession(session.user, res));
  }),
);
authRoutes.post(
  '/logout',
  handler(async (req, res) => {
    await db.session.deleteMany({
      where: { refreshHash: hash(req.cookies.refresh || '') },
    });
    res.clearCookie('access', cookieOptions);
    res.clearCookie('refresh', cookieOptions);
    send(res, { message: 'Đã đăng xuất' });
  }),
);
authRoutes.get(
  '/me',
  (req, res, next) => {
    if (!req.cookies.access && !req.cookies.refresh) {
      send(res, null);
      return;
    }
    next();
  },
  auth,
  handler(async (req, res) =>
    send(res, publicUser(await db.user.findUniqueOrThrow({ where: { id: req.user!.id } }))),
  ),
);
authRoutes.patch(
  '/profile',
  auth,
  handler(async (req, res) =>
    send(
      res,
      publicUser(
        await db.user.update({
          where: { id: req.user!.id },
          data: schemas.profile.parse(req.body),
        }),
      ),
    ),
  ),
);
authRoutes.patch(
  '/change-password',
  auth,
  handler(async (req, res) => {
    const input = z
      .object({ currentPassword: z.string(), password: schemas.password })
      .parse(req.body);
    const user = await db.user.findUniqueOrThrow({
      where: { id: req.user!.id },
    });
    assert(
      await verifyPassword(input.currentPassword, user.passwordHash),
      400,
      'Mật khẩu hiện tại không đúng',
    );
    await transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(input.password, 12) },
      });
      await tx.session.deleteMany({ where: { userId: user.id } });
    });
    res.clearCookie('access', cookieOptions);
    res.clearCookie('refresh', cookieOptions);
    send(res, { message: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.' });
  }),
);
authRoutes.post(
  '/forgot-password',
  handler(async (req, res) => {
    const { email } = z
      .object({ email: z.email().transform((s) => s.toLowerCase()) })
      .parse(req.body);
    const user = await db.user.findUnique({ where: { email } });
    if (user?.active) {
      const raw = token();
      await db.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: hash(raw),
          expiresAt: new Date(Date.now() + 15 * 60000),
        },
      });
      if (config.DEMO_MODE === 'true') {
        const dir = resolve(config.RESET_MAIL_DIR);
        await mkdir(dir, { recursive: true });
        await writeFile(
          resolve(dir, `${Date.now()}-${user.id}.txt`),
          `To: ${email}\nKhôi phục mật khẩu HDbaby (hết hạn 15 phút):\n${config.CLIENT_ORIGIN}/reset-password?token=${raw}\n`,
          { mode: 0o600 },
        );
      }
    }
    send(res, {
      message:
        'Nếu email tồn tại, hướng dẫn đã được gửi. Ở chế độ demo, xem thư trong .runtime/mail.',
    });
  }),
);
authRoutes.post(
  '/reset-password',
  handler(async (req, res) => {
    const input = z
      .object({ token: z.string().min(32), password: schemas.password })
      .parse(req.body);
    await transaction(async (tx) => {
      const reset = await tx.passwordReset.findUnique({
        where: { tokenHash: hash(input.token) },
      });
      assert(
        reset && !reset.used && reset.expiresAt > new Date(),
        400,
        'Liên kết không hợp lệ hoặc đã hết hạn',
      );
      await tx.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      });
      await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash: await bcrypt.hash(input.password, 12) },
      });
      await tx.session.deleteMany({ where: { userId: reset.userId } });
    });
    send(res, { message: 'Đổi mật khẩu thành công' });
  }),
);
