import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
config({ path: resolve(root, 'backend/.env'), quiet: true });
const db = new PrismaClient();
try {
  const counts = {
    categories: await db.category.count(),
    brands: await db.brand.count(),
    products: await db.product.count(),
    customers: await db.user.count({ where: { role: 'CUSTOMER' } }),
    addresses: await db.address.count(),
    orders: await db.order.count(),
    reviews: await db.review.count(),
    vouchers: await db.voucher.count(),
    banners: await db.banner.count(),
    articles: await db.article.count(),
    notifications: await db.notification.count(),
    inventoryLogs: await db.inventoryLog.count(),
  };
  const issues = [];
  const products = await db.product.findMany({ include: { inventory: true, images: true } });
  for (const p of products) {
    if (p.stock < 0 || p.inventory.reduce((s, l) => s + l.change, 0) !== p.stock)
      issues.push(`Inventory mismatch ${p.sku}`);
    for (const i of p.images) {
      const path = i.url.startsWith('/assets/')
        ? resolve(root, 'frontend/public', i.url.slice(1))
        : resolve(root, 'backend', i.url.slice(1));
      if (!existsSync(path)) issues.push(`Missing image ${i.url}`);
    }
  }
  const orders = await db.order.findMany({ include: { items: true } });
  for (const o of orders) {
    const subtotal = o.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    if (
      Number(o.subtotal) !== subtotal ||
      Number(o.total) !== subtotal - Number(o.discount) + Number(o.shipping)
    )
      issues.push(`Order arithmetic ${o.code}`);
  }
  const reviews = await db.review.findMany({ include: { order: { include: { items: true } } } });
  for (const r of reviews)
    if (
      r.order.status !== 'COMPLETED' ||
      r.order.userId !== r.userId ||
      !r.order.items.some((i) => i.productId === r.productId)
    )
      issues.push(`Invalid verified review ${r.id}`);
  console.log(JSON.stringify({ counts, issues, status: issues.length ? 'FAIL' : 'PASS' }, null, 2));
  if (issues.length) process.exitCode = 1;
} finally {
  await db.$disconnect();
}
