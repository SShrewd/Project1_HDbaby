import { Router } from 'express';
import multer from 'multer';
import {Prisma} from '@prisma/client';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { db, transaction } from '../config/db.js';
import { auth, admin } from '../middlewares/auth.js';
import { handler, send, assert, numberId, page, AppError } from '../utils/http.js';
import * as schemas from '../validators/index.js';
import { productInclude, listProducts } from './catalog.repository.js';
import { adjustStock, changeStatus, orderInclude } from '../services/orders.js';
import { dashboard } from '../services/dashboard.js';
import { resources } from './admin.resources.js';
export const adminRoutes = Router();
adminRoutes.use(auth, admin);
adminRoutes.get(
  '/dashboard',
  handler(async (req, res) => {
    const days = z.coerce.number().int().min(7).max(366).default(30).parse(req.query.days);
    send(res, await dashboard(days));
  }),
);
adminRoutes.get(
  '/report.csv',
  handler(async (req, res) => {
    const days = z.coerce.number().int().min(7).max(366).default(30).parse(req.query.days);
    const stats = await dashboard(days);
    res
      .type('text/csv')
      .attachment('hdbaby-revenue.csv')
      .send(
        '\uFEFFDate,Revenue,Orders,New customers\n' +
          stats.series.map((d) => [d.date, d.revenue, d.orders, d.customers].join(',')).join('\n'),
      );
  }),
);
adminRoutes.get(
  '/products',
  handler(async (req, res) => send(res, await listProducts(req.query, true))),
);
adminRoutes.get(
  '/products/:id',
  handler(async (req, res) =>
    send(
      res,
      await db.product.findUniqueOrThrow({
        where: { id: numberId(req.params.id) },
        include: productInclude,
      }),
    ),
  ),
);
adminRoutes.post(
  '/products',
  handler(async (req, res) => {
    const input = schemas.product.parse(req.body);
    const { images, details, ...data } = input;
    send(
      res,
      await transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            ...data,
            ...(details===undefined?{}:{details:details===null?Prisma.DbNull:details}),
            images: {
              create: images.map((url, position) => ({ url, position })),
            },
          },
          include: productInclude,
        });
        await tx.inventoryLog.create({
          data: {
            productId: product.id,
            change: product.stock,
            reason: 'Khởi tạo sản phẩm',
            actor: req.user!.email,
          },
        });
        return product;
      }),
      201,
    );
  }),
);
adminRoutes.patch(
  '/products/:id',
  handler(async (req, res) => {
    const { images, stock,details, ...input } = schemas.product.parse(req.body);
    send(
      res,
      await transaction(async (tx) => {
        const id = numberId(req.params.id);
        const old = await tx.product.findUniqueOrThrow({ where: { id } });
        assert(stock === old.stock, 409, 'Tồn kho đã thay đổi. Điều chỉnh tại trang Kho hàng.');
        await tx.productImage.deleteMany({ where: { productId: id } });
        return tx.product.update({
          where: { id },
          data: {
            ...input,
            ...(details===undefined?{}:{details:details===null?Prisma.DbNull:details}),
            images: {
              create: images.map((url, position) => ({ url, position })),
            },
          },
          include: productInclude,
        });
      }),
    );
  }),
);
adminRoutes.delete(
  '/products/:id',
  handler(async (req, res) =>
    send(
      res,
      await db.product.update({
        where: { id: numberId(req.params.id) },
        data: { active: false },
      }),
    ),
  ),
);
adminRoutes.get(
  '/inventory',
  handler(async (req, res) => {
    const p = page(req.query);
    const where = {
      ...(req.query.productId ? { productId: numberId(req.query.productId) } : {}),
    };
    const [items, total] = await Promise.all([
      db.inventoryLog.findMany({
        where,
        include: {
          product: { select: { name: true, sku: true, stock: true } },
        },
        skip: (p.page - 1) * p.limit,
        take: p.limit,
        orderBy: { id: 'desc' },
      }),
      db.inventoryLog.count({ where }),
    ]);
    send(res, { items, total, ...p, pages: Math.ceil(total / p.limit) });
  }),
);
adminRoutes.post(
  '/inventory',
  handler(async (req, res) => {
    const input = z
      .object({
        productId: z.number().int().positive(),
        change: z.number().int(),
        reason: z.string().trim().min(5).max(255),
      })
      .parse(req.body);
    send(res, await adjustStock(input.productId, input.change, input.reason, req.user!.email), 201);
  }),
);
adminRoutes.get(
  '/orders',
  handler(async (req, res) => {
    const p = page(req.query);
    const where = {
      ...(req.query.q ? { code: { contains: String(req.query.q) } } : {}),
      ...(req.query.status
        ? {
            status: z
              .enum(['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'])
              .parse(req.query.status),
          }
        : {}),
      ...(req.query.userId ? { userId: numberId(req.query.userId) } : {}),
    };
    const [items, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          ...orderInclude,
          user: { select: { name: true, email: true } },
        },
        skip: (p.page - 1) * p.limit,
        take: p.limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.order.count({ where }),
    ]);
    send(res, { items, total, ...p, pages: Math.ceil(total / p.limit) });
  }),
);
adminRoutes.get(
  '/orders/:id',
  handler(async (req, res) =>
    send(
      res,
      await db.order.findUniqueOrThrow({
        where: { id: numberId(req.params.id) },
        include: {
          ...orderInclude,
          user: { select: { name: true, email: true } },
        },
      }),
    ),
  ),
);
adminRoutes.patch(
  '/orders/:id/status',
  handler(async (req, res) => {
    const input = z
      .object({
        status: z.enum(['CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED']),
        note: z.string().max(2000).default(''),
      })
      .parse(req.body);
    send(
      res,
      await changeStatus(numberId(req.params.id), input.status, req.user!.email, input.note),
    );
  }),
);
adminRoutes.get(
  '/customers/:id',
  handler(async (req, res) => {
    const id = numberId(req.params.id);
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        createdAt: true,
        addresses: true,
        orders: { include: orderInclude, orderBy: { createdAt: 'desc' } },
      },
    });
    assert(user, 404, 'Không tìm thấy khách hàng');
    send(res, user);
  }),
);
const settingsSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(50),
  email: z.email(),
  address: z.string().max(500),
  about: z.string().min(10).max(10000),
  shippingPolicy: z.string().min(10).max(10000),
  returnPolicy: z.string().min(10).max(10000),
  privacyPolicy: z.string().min(10).max(10000),
});
adminRoutes.get(
  '/settings',
  handler(async (_req, res) =>
    send(res, Object.fromEntries((await db.setting.findMany()).map((s) => [s.key, s.value]))),
  ),
);
adminRoutes.patch(
  '/settings',
  handler(async (req, res) => {
    const input = settingsSchema.parse(req.body);
    await transaction(async (tx) => {
      for (const [key, value] of Object.entries(input))
        await tx.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
    });
    send(res, input);
  }),
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new AppError(400, 'Chỉ chấp nhận JPG, PNG hoặc WebP'));
  },
});
adminRoutes.post(
  '/uploads',
  upload.array('images', 10),
  handler(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    assert(files?.length, 400, 'Vui lòng chọn ảnh');
    await mkdir(resolve('uploads'), { recursive: true });
    const paths: string[] = [];
    for (const file of files) {
      try {
        const image = sharp(file.buffer, { limitInputPixels: 25000000 });
        const meta = await image.metadata();
        assert(
          ['jpeg', 'png', 'webp'].includes(meta.format || ''),
          400,
          'Nội dung ảnh không hợp lệ',
        );
        const name = `${randomUUID()}.webp`;
        await image
          .rotate()
          .resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(resolve('uploads', name));
        paths.push(`/uploads/${name}`);
      } catch {
        throw new AppError(400, 'Không thể đọc nội dung ảnh');
      }
    }
    send(res, paths, 201);
  }),
);
adminRoutes.get(
  '/:resource',
  handler(async (req, res) => {
    const resource = Object.hasOwn(resources, String(req.params.resource))
      ? resources[String(req.params.resource)]
      : undefined;
    assert(resource, 404, 'Chức năng không tồn tại');
    const p = page(req.query);
    const q = String(req.query.q || '').slice(0, 200);
    const [items, total] = await Promise.all([
      resource.list({
        q,
        skip: (p.page - 1) * p.limit,
        take: p.limit,
        sort: String(req.query.sort || ''),
      }),
      resource.count(q),
    ]);
    send(res, { items, total, ...p, pages: Math.ceil(total / p.limit) });
  }),
);
adminRoutes.post(
  '/:resource',
  handler(async (req, res) => {
    const r = Object.hasOwn(resources, String(req.params.resource))
      ? resources[String(req.params.resource)]
      : undefined;
    assert(r?.create, 405, 'Không hỗ trợ tạo dữ liệu');
    send(res, await r.create(req.body), 201);
  }),
);
adminRoutes.patch(
  '/:resource/:id',
  handler(async (req, res) => {
    const r = Object.hasOwn(resources, String(req.params.resource))
      ? resources[String(req.params.resource)]
      : undefined;
    assert(r, 404, 'Chức năng không tồn tại');
    send(res, await r.update(numberId(req.params.id), req.body));
  }),
);
adminRoutes.delete(
  '/:resource/:id',
  handler(async (req, res) => {
    const r = Object.hasOwn(resources, String(req.params.resource))
      ? resources[String(req.params.resource)]
      : undefined;
    assert(r?.remove, 405, 'Không hỗ trợ xóa dữ liệu');
    send(res, await r.remove(numberId(req.params.id)));
  }),
);
