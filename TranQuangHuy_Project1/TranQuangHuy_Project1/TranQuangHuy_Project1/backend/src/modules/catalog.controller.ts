import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import { handler, send, assert, numberId, page } from '../utils/http.js';
import { productInclude, listProducts } from './catalog.repository.js';
export const catalogRoutes = Router();
catalogRoutes.get(
  '/products',
  handler(async (req, res) => send(res, await listProducts(req.query))),
);
catalogRoutes.get(
  '/products/search',
  handler(async (req, res) => send(res, await listProducts({ ...req.query, limit: '6' }))),
);
catalogRoutes.get(
  '/products/featured',
  handler(async (req, res) => send(res, await listProducts({ ...req.query, featured: 'true' }))),
);
catalogRoutes.get(
  '/products/bestsellers',
  handler(async (req, res) => send(res, await listProducts({ ...req.query, sort: 'bestsellers' }))),
);
catalogRoutes.get(
  '/products/:slug',
  handler(async (req, res) => {
    const product = await db.product.findFirst({
      where: {
        slug: String(req.params.slug),
        active: true,
        category: { active: true },
        brand: { active: true },
      },
      include: {
        ...productInclude,
        reviews: {
          where: { visible: true },
          include: { user: { select: { name: true } } },
          take: 30,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    assert(product, 404, 'Không tìm thấy sản phẩm');
    send(res, product);
  }),
);
catalogRoutes.get(
  '/categories',
  handler(async (_req, res) =>
    send(
      res,
      await db.category.findMany({
        where: { active: true },
        orderBy: { position: 'asc' },
      }),
    ),
  ),
);
catalogRoutes.get(
  '/brands',
  handler(async (_req, res) =>
    send(
      res,
      await db.brand.findMany({
        where: { active: true },
        orderBy: { position: 'asc' },
      }),
    ),
  ),
);
catalogRoutes.get(
  '/content',
  handler(async (_req, res) => {
    const [banners, articles, faqs, settings, testimonials, vouchers] = await Promise.all([
      db.banner.findMany({
        where: { active: true },
        orderBy: { position: 'asc' },
      }),
      db.article.findMany({
        where: { active: true },
        take: 3,
        orderBy: { createdAt: 'desc' },
      }),
      db.faq.findMany({
        where: { active: true },
        orderBy: { position: 'asc' },
      }),
      db.setting.findMany(),
      db.review.findMany({
        where: { visible: true },
        take: 3,
        orderBy: { rating: 'desc' },
        select: { id: true, rating: true, content: true, user: { select: { name: true } } },
      }),
      db.voucher.findMany({
        where: { active: true, startsAt: { lte: new Date() }, expiresAt: { gte: new Date() } },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          code: true,
          type: true,
          value: true,
          maxDiscount: true,
          minOrder: true,
          expiresAt: true,
          limit: true,
          used: true,
          perUser: true,
        },
      }),
    ]);
    send(res, {
      banners,
      articles,
      faqs,
      testimonials,
      vouchers: vouchers
        .filter((v) => v.used < v.limit)
        .map(({ used: _used, limit: _limit, ...v }) => v),
      settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
    });
  }),
);
catalogRoutes.get(
  '/articles',
  handler(async (req, res) => {
    const p = page(req.query);
    const where = {
      active: true,
      ...(req.query.q ? { title: { contains: String(req.query.q) } } : {}),
    };
    const [items, total] = await Promise.all([
      db.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p.page - 1) * p.limit,
        take: p.limit,
      }),
      db.article.count({ where }),
    ]);
    send(res, { items, total, ...p, pages: Math.ceil(total / p.limit) });
  }),
);
catalogRoutes.get(
  '/articles/:slug',
  handler(async (req, res) => {
    const article = await db.article.findFirst({
      where: { slug: String(req.params.slug), active: true },
    });
    assert(article, 404, 'Bài viết không tồn tại');
    send(res, article);
  }),
);
catalogRoutes.post(
  '/newsletter',
  handler(async (req, res) => {
    const input = z
      .object({
        email: z
          .email()
          .max(191)
          .transform((s) => s.toLowerCase()),
      })
      .parse(req.body);
    await db.newsletter.upsert({
      where: { email: input.email },
      create: input,
      update: {},
    });
    send(res, { message: 'Đăng ký nhận tin thành công' }, 201);
  }),
);
catalogRoutes.post(
  '/contacts',
  handler(async (req, res) => {
    const input = z
      .object({
        name: z.string().trim().min(2).max(200),
        email: z.email().max(191),
        message: z.string().trim().min(10).max(5000),
      })
      .parse(req.body);
    send(res, await db.contact.create({ data: input }), 201);
  }),
);
catalogRoutes.get(
  '/reviews/:id',
  handler(async (req, res) =>
    send(
      res,
      await db.review.findMany({
        where: { productId: numberId(req.params.id), visible: true },
        include: { user: { select: { name: true } } },
        take: 30,
      }),
    ),
  ),
);
