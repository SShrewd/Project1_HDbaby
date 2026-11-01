import { z } from 'zod';
import { db, transaction } from '../config/db.js';
import * as schemas from '../validators/index.js';
import { assert } from '../utils/http.js';
type Options = { q: string; skip: number; take: number; sort: string };
type Resource = {
  list: (o: Options) => Promise<unknown[]>;
  count: (q: string) => Promise<number>;
  create?: (input: unknown) => Promise<unknown>;
  update: (id: number, input: unknown) => Promise<unknown>;
  remove?: (id: number) => Promise<unknown>;
};
const names = (q: string) => (q ? { name: { contains: q } } : {});
const idOrder = (sort: string) => ({
  id: sort === 'oldest' ? ('asc' as const) : ('desc' as const),
});
export const resources: Record<string, Resource> = {
  categories: {
    list: (o) =>
      db.category.findMany({
        where: names(o.q),
        skip: o.skip,
        take: o.take,
        orderBy: o.sort ? [idOrder(o.sort)] : [{ position: 'asc' }, { id: 'asc' }],
      }),
    count: (q) => db.category.count({ where: names(q) }),
    create: (input) => db.category.create({ data: schemas.category.parse(input) }),
    update: (id, input) =>
      db.category.update({
        where: { id },
        data: schemas.category.parse(input),
      }),
    remove: (id) => db.category.update({ where: { id }, data: { active: false } }),
  },
  brands: {
    list: (o) =>
      db.brand.findMany({
        where: names(o.q),
        skip: o.skip,
        take: o.take,
        orderBy: o.sort ? [idOrder(o.sort)] : [{ position: 'asc' }, { id: 'asc' }],
      }),
    count: (q) => db.brand.count({ where: names(q) }),
    create: (input) => db.brand.create({ data: schemas.brand.parse(input) }),
    update: (id, input) => db.brand.update({ where: { id }, data: schemas.brand.parse(input) }),
    remove: (id) => db.brand.update({ where: { id }, data: { active: false } }),
  },
  vouchers: {
    list: (o) =>
      db.voucher.findMany({
        where: { code: { contains: o.q } },
        skip: o.skip,
        take: o.take,
        orderBy: idOrder(o.sort),
      }),
    count: (q) => db.voucher.count({ where: { code: { contains: q } } }),
    create: (input) => db.voucher.create({ data: schemas.voucher.parse(input) }),
    update: async (id, input) => {
      const data = schemas.voucher.parse(input);
      const v = await db.voucher.findUniqueOrThrow({ where: { id } });
      assert(data.limit >= v.used, 400, 'Giới hạn không nhỏ hơn số lượt đã dùng');
      return db.voucher.update({ where: { id }, data });
    },
    remove: (id) => db.voucher.update({ where: { id }, data: { active: false } }),
  },
  banners: {
    list: (o) =>
      db.banner.findMany({
        where: { title: { contains: o.q } },
        skip: o.skip,
        take: o.take,
        orderBy: o.sort ? idOrder(o.sort) : { position: 'asc' },
      }),
    count: (q) => db.banner.count({ where: { title: { contains: q } } }),
    create: (input) => db.banner.create({ data: schemas.banner.parse(input) }),
    update: (id, input) => db.banner.update({ where: { id }, data: schemas.banner.parse(input) }),
    remove: (id) => db.banner.delete({ where: { id } }),
  },
  articles: {
    list: (o) =>
      db.article.findMany({
        where: { title: { contains: o.q } },
        skip: o.skip,
        take: o.take,
        orderBy: idOrder(o.sort),
      }),
    count: (q) => db.article.count({ where: { title: { contains: q } } }),
    create: (input) => db.article.create({ data: schemas.article.parse(input) }),
    update: (id, input) => db.article.update({ where: { id }, data: schemas.article.parse(input) }),
    remove: (id) => db.article.update({ where: { id }, data: { active: false } }),
  },
  faqs: {
    list: (o) =>
      db.faq.findMany({
        where: { question: { contains: o.q } },
        skip: o.skip,
        take: o.take,
        orderBy: o.sort ? idOrder(o.sort) : { position: 'asc' },
      }),
    count: (q) => db.faq.count({ where: { question: { contains: q } } }),
    create: (input) => db.faq.create({ data: schemas.faq.parse(input) }),
    update: (id, input) => db.faq.update({ where: { id }, data: schemas.faq.parse(input) }),
    remove: (id) => db.faq.delete({ where: { id } }),
  },
  customers: {
    list: (o) =>
      db.user.findMany({
        where: {
          role: 'CUSTOMER',
          OR: [names(o.q), { email: { contains: o.q } }],
        },
        skip: o.skip,
        take: o.take,
        orderBy: idOrder(o.sort),
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          active: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
    count: (q) =>
      db.user.count({
        where: { role: 'CUSTOMER', OR: [names(q), { email: { contains: q } }] },
      }),
    update: async (id, input) => {
      const data = z.object({ active: z.boolean() }).parse(input);
      const u = await db.user.findUniqueOrThrow({ where: { id } });
      assert(u.role === 'CUSTOMER', 403, 'Không thể thay đổi quản trị viên');
      await transaction(async (tx) => {
        await tx.user.update({ where: { id }, data });
        if (!data.active) await tx.session.deleteMany({ where: { userId: id } });
      });
      return { id, ...data };
    },
  },
  reviews: {
    list: (o) =>
      db.review.findMany({
        where: { content: { contains: o.q } },
        include: {
          user: { select: { name: true } },
          product: { select: { name: true } },
        },
        skip: o.skip,
        take: o.take,
        orderBy: idOrder(o.sort),
      }),
    count: (q) => db.review.count({ where: { content: { contains: q } } }),
    update: async (id, input) => {
      const data = z.object({ visible: z.boolean() }).parse(input);
      return transaction(async (tx) => {
        const review = await tx.review.update({ where: { id }, data });
        const stats = await tx.review.aggregate({
          where: { productId: review.productId, visible: true },
          _avg: { rating: true },
        });
        await tx.product.update({
          where: { id: review.productId },
          data: { rating: stats._avg.rating || 0 },
        });
        return review;
      });
    },
  },
  contacts: {
    list: (o) =>
      db.contact.findMany({
        where: { OR: [names(o.q), { email: { contains: o.q } }] },
        skip: o.skip,
        take: o.take,
        orderBy: idOrder(o.sort),
      }),
    count: (q) =>
      db.contact.count({
        where: { OR: [names(q), { email: { contains: q } }] },
      }),
    update: (id, input) =>
      db.contact.update({
        where: { id },
        data: z
          .object({
            reply: z.string().trim().min(1).max(5000),
            resolved: z.boolean(),
          })
          .parse(input),
      }),
  },
};
