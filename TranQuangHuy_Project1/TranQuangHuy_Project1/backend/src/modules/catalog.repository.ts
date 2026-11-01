import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { db } from '../config/db.js';
import { page } from '../utils/http.js';
export const productInclude = {
  brand: true,
  category: true,
  images: { orderBy: { position: 'asc' as const } },
};
export async function listProducts(query: Request['query'], admin = false) {
  const pagination = page(query);
  const where: Prisma.ProductWhereInput = admin
    ? {}
    : { active: true, category: { active: true }, brand: { active: true } };
  if (query.q)
    where.OR = [
      { name: { contains: String(query.q).slice(0, 200) } },
      { sku: { contains: String(query.q).slice(0, 100) } },
      { brand: { name: { contains: String(query.q).slice(0, 100) } } },
    ];
  if (query.category)
    where.category = {
      ...(where.category as object),
      slug: String(query.category),
    };
  if (query.brand) where.brand = { ...(where.brand as object), slug: String(query.brand) };
  if (query.age) where.age = String(query.age);
  if (query.min || query.max)
    where.price = {
      ...(Number(query.min) >= 0 ? { gte: Number(query.min) } : {}),
      ...(Number(query.max) >= 0 ? { lte: Number(query.max) } : {}),
    };
  if (query.stock === 'true') where.stock = { gt: 0 };
  if (query.low === 'true') where.stock = { lte: 10 };
  if (query.featured === 'true') where.featured = true;
  if (query.sale === 'true') where.originalPrice = { gt: 0 };
  const sorting: Record<string, Prisma.ProductOrderByWithRelationInput> = {
    price_asc: { price: 'asc' },
    price_desc: { price: 'desc' },
    newest: { createdAt: 'desc' },
    bestsellers: { sold: 'desc' },
    rating: { rating: 'desc' },
  };
  const orderBy = sorting[String(query.sort)] || { createdAt: 'desc' };
  const [items, total] = await db.$transaction([
    db.product.findMany({
      where,
      include: productInclude,
      orderBy: [orderBy, { id: 'asc' }],
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    db.product.count({ where }),
  ]);
  return {
    items,
    total,
    ...pagination,
    pages: Math.ceil(total / pagination.limit),
  };
}
