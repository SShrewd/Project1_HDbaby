import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { config } from '../config/index.js';
import { hash, token } from '../utils/security.js';
import type { User } from '@prisma/client';
export const publicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt,
});
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.NODE_ENV === 'production',
  path: '/api',
};
export async function createSession(user: User, res: Response) {
  const refresh = token();
  const session = await db.session.create({
    data: {
      userId: user.id,
      refreshHash: hash(refresh),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  res.cookie('access', jwt.sign({ sid: session.id }, config.JWT_SECRET, { expiresIn: '15m' }), {
    ...cookieOptions,
    maxAge: 15 * 60000,
  });
  res.cookie('refresh', refresh, { ...cookieOptions, maxAge: 7 * 86400000 });
  return publicUser(user);
}
export const verifyPassword = bcrypt.compare;
