import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { readdir, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { app } from '../src/app.js';
import { db } from '../src/config/db.js';
import type { Product } from '@prisma/client';
const prefix = `qa-${Date.now()}`;
const password = 'TestUser@123456';
type Agent = ReturnType<typeof request.agent>;
interface Client {
  agent: Agent;
  csrf: string;
  id: number;
}
async function client(email: string, admin = false): Promise<Client> {
  const agent = request.agent(app);
  const csrf = (await agent.get('/api/csrf')).body.data.token as string;
  const result = await agent
    .post(`/api/auth/${admin ? 'login' : 'register'}`)
    .set('X-CSRF-Token', csrf)
    .send(
      admin
        ? { email, password: 'Admin@123456' }
        : { name: 'Khách kiểm thử', phone: '0909998888', email, password },
    );
  expect(result.status).toBe(admin ? 200 : 201);
  return { agent, csrf, id: result.body.data.id };
}
const payload = (productId: number, quantity = 1) => ({
  recipient: 'Người nhận kiểm thử',
  phone: '0909998888',
  city: 'TP. Hồ Chí Minh',
  district: 'Bình Thạnh',
  address: '123 Địa chỉ kiểm thử',
  note: 'Đơn QA tự động',
  delivery: 'standard',
  payment: 'COD',
  voucher: '',
  items: [{ productId, quantity }],
});
let a: Client, b: Client, admin: Client, p: Product;
let orderId: number;
const stockInitial = 30;
beforeAll(async () => {
  a = await client(`${prefix}-a@example.test`);
  b = await client(`${prefix}-b@example.test`);
  admin = await client('admin@hdbaby.local', true);
  const category = await db.category.findFirstOrThrow();
  const brand = await db.brand.findFirstOrThrow();
  const response = await admin.agent
    .post('/api/admin/products')
    .set('X-CSRF-Token', admin.csrf)
    .send({
      name: 'Bột ăn dặm kiểm thử',
      slug: prefix,
      sku: prefix,
      categoryId: category.id,
      brandId: brand.id,
      age: '6-12',
      price: 250000,
      originalPrice: 300000,
      stock: stockInitial,
      active: true,
      featured: true,
      description: 'Sản phẩm chỉ phục vụ kiểm thử',
      ingredients: 'Dữ liệu minh họa',
      nutrition: 'Dữ liệu minh họa',
      usage: 'Đọc nhãn mô phỏng',
      storage: 'Nơi khô ráo',
      warning: 'Dữ liệu QA',
      packaging: '400g',
      origin: 'Việt Nam',
      images: ['/assets/product-1.webp'],
    });
  expect(response.status).toBe(201);
  p = response.body.data;
});
afterAll(async () => {
  const users = await db.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  await db.review.deleteMany({ where: { userId: { in: ids } } });
  await db.order.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  const products = await db.product.findMany({
    where: { sku: { startsWith: prefix } },
    select: { id: true },
  });
  await db.inventoryLog.deleteMany({
    where: { productId: { in: products.map((x) => x.id) } },
  });
  await db.product.deleteMany({
    where: { id: { in: products.map((x) => x.id) } },
  });
  await db.voucher.deleteMany({
    where: { code: { startsWith: prefix.toUpperCase() } },
  });
  await admin.agent.post('/api/auth/logout').set('X-CSRF-Token', admin.csrf);
  await db.$disconnect();
});
describe('Authentication and authorization', () => {
  it('registers and stores only password hash', async () => {
    const u = await db.user.findUniqueOrThrow({ where: { id: a.id } });
    expect(u.passwordHash).not.toBe(password);
    expect(u.passwordHash.startsWith('$2')).toBe(true);
  });
  it('rejects duplicate email', async () => {
    const r = await a.agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', a.csrf)
      .send({
        name: 'QA',
        phone: '0909998888',
        email: `${prefix}-a@example.test`,
        password,
      });
    expect(r.status).toBe(409);
  });
  it('rejects weak password', async () => {
    const r = await a.agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', a.csrf)
      .send({
        name: 'QA',
        phone: '0909998888',
        email: `${prefix}-weak@example.test`,
        password: '123',
      });
    expect(r.status).toBe(400);
  });
  it('logs in and rejects wrong credentials', async () => {
    expect(
      (
        await a.agent
          .post('/api/auth/login')
          .set('X-CSRF-Token', a.csrf)
          .send({ email: `${prefix}-a@example.test`, password })
      ).status,
    ).toBe(200);
    expect(
      (
        await a.agent
          .post('/api/auth/login')
          .set('X-CSRF-Token', a.csrf)
          .send({ email: `${prefix}-a@example.test`, password: 'invalid' })
      ).status,
    ).toBe(401);
  });
  it('protects admin for visitors and customers', async () => {
    expect((await request(app).get('/api/admin/products')).status).toBe(401);
    expect((await a.agent.get('/api/admin/products')).status).toBe(403);
  });
  it('rejects CSRF and foreign origin', async () => {
    expect(
      (
        await a.agent
          .patch('/api/auth/profile')
          .set('X-CSRF-Token', a.csrf)
          .set('Origin', 'http://localhost:5000')
          .send({ name: 'Khách kiểm thử', phone: '0909998888' })
      ).status,
    ).toBe(200);
    expect(
      (await a.agent.patch('/api/auth/profile').send({ name: 'QA', phone: '0909998888' })).status,
    ).toBe(403);
    expect(
      (
        await a.agent
          .patch('/api/auth/profile')
          .set('X-CSRF-Token', a.csrf)
          .set('Origin', 'https://foreign.example')
          .send({ name: 'QA', phone: '0909998888' })
      ).status,
    ).toBe(403);
  });
  it('rotates refresh token and revokes old token', async () => {
    const session = await client(`${prefix}-refresh@example.test`);
    const loginResult = await session.agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', session.csrf)
      .send({ email: `${prefix}-refresh@example.test`, password });
    const originalCookie = loginResult.headers['set-cookie'] as unknown as string[];
    const oldRefresh = originalCookie.find((c) => c.startsWith('refresh='))!.split(';')[0];
    const old = (await session.agent.get('/api/auth/me')).status;
    expect(old).toBe(200);
    const first = await session.agent.post('/api/auth/refresh').set('X-CSRF-Token', session.csrf);
    expect(first.status).toBe(200);
    const replay = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [oldRefresh, `csrf=${session.csrf}`])
      .set('X-CSRF-Token', session.csrf);
    expect(replay.status).toBe(401);
    await session.agent.post('/api/auth/logout').set('X-CSRF-Token', session.csrf);
    expect((await session.agent.get('/api/orders/my')).status).toBe(401);
    expect(
      (await session.agent.post('/api/auth/refresh').set('X-CSRF-Token', session.csrf)).status,
    ).toBe(401);
  });
  it('recovers password through a single-use local email token and revokes sessions', async () => {
    const session = await client(`${prefix}-reset@example.test`);
    const result = await session.agent
      .post('/api/auth/forgot-password')
      .set('X-CSRF-Token', session.csrf)
      .send({ email: `${prefix}-reset@example.test` });
    expect(result.status).toBe(200);
    expect(JSON.stringify(result.body)).not.toContain('token');
    const maildir = resolve('../.runtime/mail');
    const files = (await readdir(maildir)).filter((f) => f.endsWith(`-${session.id}.txt`));
    expect(files.length).toBe(1);
    const mail = await readFile(resolve(maildir, files[0]), 'utf8');
    const raw = mail.match(/token=([a-f0-9]+)/)![1];
    const reset = () =>
      session.agent
        .post('/api/auth/reset-password')
        .set('X-CSRF-Token', session.csrf)
        .send({ token: raw, password: 'NewPassword@12345' });
    expect((await reset()).status).toBe(200);
    expect((await reset()).status).toBe(400);
    expect((await session.agent.get('/api/orders/my')).status).toBe(401);
    expect(
      (
        await session.agent
          .post('/api/auth/login')
          .set('X-CSRF-Token', session.csrf)
          .send({ email: `${prefix}-reset@example.test`, password: 'NewPassword@12345' })
      ).status,
    ).toBe(200);
    await unlink(resolve(maildir, files[0]));
  });
  it('locks a customer and immediately invalidates their session', async () => {
    const session = await client(`${prefix}-locked@example.test`);
    expect(
      (
        await admin.agent
          .patch(`/api/admin/customers/${session.id}`)
          .set('X-CSRF-Token', admin.csrf)
          .send({ active: false })
      ).status,
    ).toBe(200);
    expect((await session.agent.get('/api/orders/my')).status).toBe(401);
  });
});
describe('Catalog and cart', () => {
  it('searches by unique SKU', async () => {
    const r = await a.agent.get(`/api/products?q=${prefix}`);
    expect(r.status).toBe(200);
    expect(r.body.data.items[0].sku).toBe(prefix);
  });
  it('filters and sorts in database with pagination', async () => {
    const r = await a.agent.get(
      '/api/products?min=100000&max=500000&stock=true&sort=price_asc&limit=5',
    );
    const data = r.body.data;
    expect(data.items.length).toBeLessThanOrEqual(5);
    const prices = data.items.map((x: { price: string }) => Number(x.price));
    expect(prices).toEqual([...prices].sort((x, y) => x - y));
    expect(prices.every((x: number) => x >= 100000 && x <= 500000)).toBe(true);
    expect(data.total).toBeGreaterThan(5);
  });
  it('adds cart, disallows quantity above stock, and updates quantity', async () => {
    const r = await a.agent
      .post('/api/cart/items')
      .set('X-CSRF-Token', a.csrf)
      .send({ productId: p.id, quantity: 2 });
    expect(r.status).toBe(201);
    expect(
      (
        await a.agent
          .post('/api/cart/items')
          .set('X-CSRF-Token', a.csrf)
          .send({ productId: p.id, quantity: stockInitial })
      ).status,
    ).toBe(409);
    const changed = await a.agent
      .patch(`/api/cart/items/${r.body.data.id}`)
      .set('X-CSRF-Token', a.csrf)
      .send({ quantity: 3 });
    expect(changed.body.data.quantity).toBe(3);
    expect((await a.agent.get('/api/cart')).body.data[0].quantity).toBe(3);
  });
  it('enforces ownership of cart items and addresses', async () => {
    const item = (await a.agent.get('/api/cart')).body.data[0];
    expect(
      (
        await b.agent
          .patch(`/api/cart/items/${item.id}`)
          .set('X-CSRF-Token', b.csrf)
          .send({ quantity: 1 })
      ).status,
    ).toBe(404);
    const address = await a.agent.post('/api/addresses').set('X-CSRF-Token', a.csrf).send({
      name: 'QA',
      phone: '0909998888',
      city: 'TP. HCM',
      district: 'Bình Thạnh',
      detail: '123 Địa chỉ QA',
      isDefault: true,
    });
    expect(address.status).toBe(201);
    expect(
      (
        await b.agent
          .patch(`/api/addresses/${address.body.data.id}`)
          .set('X-CSRF-Token', b.csrf)
          .send({
            name: 'QA',
            phone: '0909998888',
            city: 'TP. HCM',
            district: 'Bình Thạnh',
            detail: '456 Địa chỉ QA',
            isDefault: true,
          })
      ).status,
    ).toBe(404);
  });
});
describe('Checkout, inventory, idempotency and orders', () => {
  it('calculates voucher, shipping, total on server', async () => {
    const r = await a.agent
      .post('/api/orders/quote')
      .set('X-CSRF-Token', a.csrf)
      .send({ ...payload(p.id, 2), voucher: 'HELLOBABY' });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({
      subtotal: 500000,
      discount: 50000,
      shipping: 0,
      total: 450000,
    });
  });
  it('rejects changed expected total', async () => {
    expect(
      (
        await a.agent
          .post('/api/orders')
          .set('X-CSRF-Token', a.csrf)
          .set('Idempotency-Key', randomUUID())
          .send({ ...payload(p.id), expectedTotal: 1 })
      ).status,
    ).toBe(409);
  });
  it('creates order and decrements stock transactionally', async () => {
    const r = await a.agent
      .post('/api/orders')
      .set('X-CSRF-Token', a.csrf)
      .set('Idempotency-Key', `${prefix}-order`)
      .send(payload(p.id, 2));
    expect(r.status).toBe(201);
    orderId = r.body.data.id;
    expect(Number(r.body.data.total)).toBe(500000);
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(
      stockInitial - 2,
    );
    expect((await a.agent.get('/api/cart')).body.data).toHaveLength(0);
  });
  it('replays same order and rejects idempotency key reuse with other data', async () => {
    const r = await a.agent
      .post('/api/orders')
      .set('X-CSRF-Token', a.csrf)
      .set('Idempotency-Key', `${prefix}-order`)
      .send(payload(p.id, 2));
    expect(r.body.data.id).toBe(orderId);
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(
      stockInitial - 2,
    );
    expect(
      (
        await a.agent
          .post('/api/orders')
          .set('X-CSRF-Token', a.csrf)
          .set('Idempotency-Key', `${prefix}-order`)
          .send(payload(p.id, 1))
      ).status,
    ).toBe(409);
  });
  it('disallows viewing or cancelling another customer order', async () => {
    expect((await b.agent.get(`/api/orders/${orderId}`)).status).toBe(404);
    expect(
      (await b.agent.patch(`/api/orders/${orderId}/cancel`).set('X-CSRF-Token', b.csrf).send({}))
        .status,
    ).toBe(404);
  });
  it('cancels and restores stock exactly once', async () => {
    expect(
      (await a.agent.patch(`/api/orders/${orderId}/cancel`).set('X-CSRF-Token', a.csrf).send({}))
        .status,
    ).toBe(200);
    expect(
      (await a.agent.patch(`/api/orders/${orderId}/cancel`).set('X-CSRF-Token', a.csrf).send({}))
        .status,
    ).toBe(409);
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(stockInitial);
  });
  it('validates status transitions and refuses cancellation of completed orders', async () => {
    const r = await a.agent
      .post('/api/orders')
      .set('X-CSRF-Token', a.csrf)
      .set('Idempotency-Key', randomUUID())
      .send(payload(p.id));
    orderId = r.body.data.id;
    expect(
      (
        await admin.agent
          .patch(`/api/admin/orders/${orderId}/status`)
          .set('X-CSRF-Token', admin.csrf)
          .send({ status: 'COMPLETED' })
      ).status,
    ).toBe(409);
    for (const status of ['CONFIRMED', 'SHIPPING', 'COMPLETED'])
      expect(
        (
          await admin.agent
            .patch(`/api/admin/orders/${orderId}/status`)
            .set('X-CSRF-Token', admin.csrf)
            .send({ status, note: 'Kiểm thử trạng thái' })
        ).status,
      ).toBe(200);
    expect(
      (await a.agent.patch(`/api/orders/${orderId}/cancel`).set('X-CSRF-Token', a.csrf).send({}))
        .status,
    ).toBe(409);
  });
  it('allows only verified purchased reviews and updates rating', async () => {
    expect(
      (
        await b.agent.post('/api/reviews').set('X-CSRF-Token', b.csrf).send({
          productId: p.id,
          orderId,
          rating: 5,
          content: 'Đánh giá không hợp lệ của người khác',
        })
      ).status,
    ).toBe(403);
    const r = await a.agent.post('/api/reviews').set('X-CSRF-Token', a.csrf).send({
      productId: p.id,
      orderId,
      rating: 5,
      content: 'Nhận xét mẫu kiểm thử chức năng đánh giá',
    });
    expect(r.status).toBe(201);
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).rating).toBe(5);
    expect(
      (
        await admin.agent
          .patch(`/api/admin/reviews/${r.body.data.id}`)
          .set('X-CSRF-Token', admin.csrf)
          .send({ visible: false })
      ).status,
    ).toBe(200);
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).rating).toBe(0);
  });
  it('rejects checkout when stock is exhausted', async () => {
    const old = (await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock;
    await db.product.update({ where: { id: p.id }, data: { stock: 0 } });
    expect(
      (
        await a.agent
          .post('/api/orders')
          .set('X-CSRF-Token', a.csrf)
          .set('Idempotency-Key', randomUUID())
          .send(payload(p.id))
      ).status,
    ).toBe(409);
    await db.product.update({ where: { id: p.id }, data: { stock: old } });
  });
  it('prevents overselling with concurrent checkouts', async () => {
    await db.product.update({ where: { id: p.id }, data: { stock: 1 } });
    const results = await Promise.all(
      [a, b].map((c) =>
        c.agent
          .post('/api/orders')
          .set('X-CSRF-Token', c.csrf)
          .set('Idempotency-Key', randomUUID())
          .send(payload(p.id)),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(0);
  });
  it('supports concurrent idempotent duplicate submission once', async () => {
    await db.product.update({ where: { id: p.id }, data: { stock: 5 } });
    const key = randomUUID();
    const results = await Promise.all(
      [1, 2].map(() =>
        a.agent
          .post('/api/orders')
          .set('X-CSRF-Token', a.csrf)
          .set('Idempotency-Key', key)
          .send(payload(p.id)),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(results[0].body.data.id).toBe(results[1].body.data.id);
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(4);
  });
});
describe('Admin and data integrity', () => {
  it('edits long product content and accepts optional zero original price', async () => {
    const product = (await admin.agent.get(`/api/admin/products/${p.id}`)).body.data;
    const edited = await admin.agent
      .patch(`/api/admin/products/${p.id}`)
      .set('X-CSRF-Token', admin.csrf)
      .send({
        ...product,
        originalPrice: null,
        description: 'Mô tả nhãn minh họa. '.repeat(30),
        images: product.images.map((im: { url: string }) => im.url),
      });
    expect(edited.status).toBe(200);
    expect(edited.body.data.description.length).toBeGreaterThan(255);
  });
  it('uploads and optimizes a valid image', async () => {
    const r = await admin.agent
      .post('/api/admin/uploads')
      .set('X-CSRF-Token', admin.csrf)
      .attach('images', resolve('../frontend/public/assets/product-0.webp'));
    expect(r.status).toBe(201);
    expect(r.body.data[0]).toMatch(/^\/uploads\/.+\.webp$/);
    await unlink(resolve(`.${r.body.data[0]}`));
  });
  it('checks inventory balance of every seeded product', async () => {
    const products = await db.product.findMany({
      where: { sku: { startsWith: 'HD-' } },
      include: { inventory: true },
    });
    for (const product of products)
      expect(product.inventory.reduce((sum, log) => sum + log.change, 0)).toBe(product.stock);
  });
  it('exposes real OpenAPI schemas with no unsupported customer CRUD endpoints', async () => {
    const r = await a.agent.get('/api/openapi.json');
    expect(r.status).toBe(200);
    expect(
      r.body.paths['/api/orders'].post.parameters.some(
        (p: { name: string }) => p.name === 'Idempotency-Key',
      ),
    ).toBe(true);
    expect(r.body.paths['/api/wishlist/{id}'].patch).toBeUndefined();
    expect(r.body.components.schemas.Product).toBeDefined();
  });
  it('updates stock and records reason, refuses negative stock', async () => {
    const r = await admin.agent
      .post('/api/admin/inventory')
      .set('X-CSRF-Token', admin.csrf)
      .send({ productId: p.id, change: 10, reason: 'Nhập kho kiểm thử' });
    expect(r.status).toBe(201);
    expect(
      (
        await admin.agent.post('/api/admin/inventory').set('X-CSRF-Token', admin.csrf).send({
          productId: p.id,
          change: -1000,
          reason: 'Xuất quá tồn kiểm thử',
        })
      ).status,
    ).toBe(409);
  });
  it('rejects invalid image extension and forged image bytes', async () => {
    expect(
      (
        await admin.agent
          .post('/api/admin/uploads')
          .set('X-CSRF-Token', admin.csrf)
          .attach('images', Buffer.from('malicious'), {
            filename: 'bad.txt',
            contentType: 'text/plain',
          })
      ).status,
    ).toBe(400);
    expect(
      (
        await admin.agent
          .post('/api/admin/uploads')
          .set('X-CSRF-Token', admin.csrf)
          .attach('images', Buffer.from('not an image'), {
            filename: 'fake.png',
            contentType: 'image/png',
          })
      ).status,
    ).toBe(400);
  });
  it('dashboard totals match actual completed orders', async () => {
    const r = await admin.agent.get('/api/admin/dashboard?days=365');
    expect(r.status).toBe(200);
    const expected = await db.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { total: true },
    });
    expect(r.body.data.allRevenue).toBe(Number(expected._sum.total));
    expect(r.body.data.series).toHaveLength(365);
    expect(r.body.data.orders).toBe(await db.order.count());
  });
  it('seed quantities and relationships meet requirements', async () => {
    expect(await db.category.count()).toBeGreaterThanOrEqual(8);
    expect(await db.brand.count()).toBeGreaterThanOrEqual(12);
    expect(await db.product.count()).toBeGreaterThanOrEqual(150);
    expect(await db.user.count({ where: { role: 'CUSTOMER' } })).toBeGreaterThanOrEqual(50);
    expect(await db.address.count()).toBeGreaterThanOrEqual(70);
    expect(await db.order.count()).toBeGreaterThanOrEqual(250);
    expect(await db.review.count()).toBeGreaterThanOrEqual(300);
    expect(await db.voucher.count()).toBeGreaterThanOrEqual(15);
    expect(await db.banner.count()).toBeGreaterThanOrEqual(8);
    expect(await db.article.count()).toBeGreaterThanOrEqual(20);
    expect(await db.notification.count()).toBeGreaterThanOrEqual(100);
    expect(await db.inventoryLog.count()).toBeGreaterThanOrEqual(200);
    const reviews = await db.review.findMany({
      include: { order: { include: { items: true } } },
    });
    for (const r of reviews) {
      expect(r.order.userId).toBe(r.userId);
      expect(r.order.status).toBe('COMPLETED');
      expect(r.order.items.some((i) => i.productId === r.productId)).toBe(true);
    }
  });
  it('order arithmetic is consistent', async () => {
    const orders = await db.order.findMany({ include: { items: true } });
    for (const o of orders) {
      const subtotal = o.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
      expect(Number(o.subtotal)).toBe(subtotal);
      expect(Number(o.total)).toBe(subtotal - Number(o.discount) + Number(o.shipping));
    }
  });
  it('does not expose sensitive customer data to admin lists', async () => {
    const r = await admin.agent.get('/api/admin/customers');
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).not.toContain('passwordHash');
    expect(JSON.stringify(r.body)).not.toContain('refreshHash');
  });
  it('stock rejects malformed data and voucher validity is enforced', async () => {
    expect(
      (
        await admin.agent
          .post('/api/admin/inventory')
          .set('X-CSRF-Token', admin.csrf)
          .send({ productId: p.id, change: 1, reason: 'x' })
      ).status,
    ).toBe(400);
    const q = await a.agent
      .post('/api/orders/quote')
      .set('X-CSRF-Token', a.csrf)
      .send({ ...payload(p.id), voucher: 'NO-SUCH-VOUCHER' });
    expect(q.status).toBe(400);
  });
});
