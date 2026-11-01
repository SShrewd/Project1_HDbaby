import { Router } from 'express';
import { z } from 'zod';
import { db, transaction } from '../config/db.js';
import { auth } from '../middlewares/auth.js';
import { handler, send, assert, numberId, page } from '../utils/http.js';
import * as schemas from '../validators/index.js';
import { productInclude } from './catalog.repository.js';
import { createOrder, quote, changeStatus, orderInclude } from '../services/orders.js';
export const customerRoutes = Router();
customerRoutes.use(auth);
customerRoutes.get(
  '/cart',
  handler(async (req, res) =>
    send(
      res,
      await db.cartItem.findMany({
        where: { userId: req.user!.id },
        include: { product: { include: productInclude } },
        orderBy: { id: 'asc' },
      }),
    ),
  ),
);
customerRoutes.post(
  '/cart/items',
  handler(async (req, res) => {
    const input = schemas.cartItem.parse(req.body);
    send(
      res,
      await transaction(async (tx) => {
        const p = await tx.product.findUnique({
          where: { id: input.productId },
          include: { brand: true, category: true },
        });
        assert(
          p?.active && p.brand.active && p.category.active,
          404,
          'Sản phẩm không còn kinh doanh',
        );
        const old = await tx.cartItem.findUnique({
          where: {
            userId_productId: { userId: req.user!.id, productId: p.id },
          },
        });
        const quantity = (old?.quantity || 0) + input.quantity;
        assert(quantity <= p.stock, 409, 'Số lượng vượt tồn kho');
        return tx.cartItem.upsert({
          where: {
            userId_productId: { userId: req.user!.id, productId: p.id },
          },
          create: { ...input, userId: req.user!.id, priceAtAdd: p.price },
          update: { quantity },
        });
      }),
      201,
    );
  }),
);
customerRoutes.patch(
  '/cart/items/:id',
  handler(async (req, res) => {
    const input = z
      .object({
        quantity: z.number().int().min(1).max(999).optional(),
        selected: z.boolean().optional(),
      })
      .parse(req.body);
    send(
      res,
      await transaction(async (tx) => {
        const item = await tx.cartItem.findFirst({
          where: { id: numberId(req.params.id), userId: req.user!.id },
          include: { product: true },
        });
        assert(item, 404, 'Không tìm thấy sản phẩm trong giỏ');
        if (input.quantity)
          assert(input.quantity <= item.product.stock, 409, 'Số lượng vượt tồn kho');
        return tx.cartItem.update({ where: { id: item.id }, data: input });
      }),
    );
  }),
);
customerRoutes.delete(
  '/cart/items/:id',
  handler(async (req, res) => {
    const result = await db.cartItem.deleteMany({
      where: { id: numberId(req.params.id), userId: req.user!.id },
    });
    assert(result.count, 404, 'Không tìm thấy sản phẩm');
    send(res, { deleted: true });
  }),
);
customerRoutes.get(
  '/addresses',
  handler(async (req, res) =>
    send(
      res,
      await db.address.findMany({
        where: { userId: req.user!.id },
        orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
      }),
    ),
  ),
);
customerRoutes.post(
  '/addresses',
  handler(async (req, res) => {
    const input = schemas.address.parse(req.body);
    send(
      res,
      await transaction(async (tx) => {
        if (input.isDefault)
          await tx.address.updateMany({
            where: { userId: req.user!.id },
            data: { isDefault: false },
          });
        return tx.address.create({ data: { ...input, userId: req.user!.id } });
      }),
      201,
    );
  }),
);
customerRoutes.patch(
  '/addresses/:id',
  handler(async (req, res) => {
    const input = schemas.address.parse(req.body);
    send(
      res,
      await transaction(async (tx) => {
        const item = await tx.address.findFirst({
          where: { id: numberId(req.params.id), userId: req.user!.id },
        });
        assert(item, 404, 'Địa chỉ không tồn tại');
        if (input.isDefault)
          await tx.address.updateMany({
            where: { userId: req.user!.id },
            data: { isDefault: false },
          });
        return tx.address.update({ where: { id: item.id }, data: input });
      }),
    );
  }),
);
customerRoutes.delete(
  '/addresses/:id',
  handler(async (req, res) => {
    await db.address.deleteMany({
      where: { id: numberId(req.params.id), userId: req.user!.id },
    });
    send(res, { deleted: true });
  }),
);
customerRoutes.get(
  '/wishlist',
  handler(async (req, res) =>
    send(
      res,
      await db.wishlist.findMany({
        where: { userId: req.user!.id },
        include: { product: { include: productInclude } },
      }),
    ),
  ),
);
customerRoutes.post(
  '/wishlist',
  handler(async (req, res) => {
    const { productId } = z.object({ productId: z.number().int().positive() }).parse(req.body);
    assert(
      await db.product.findFirst({ where: { id: productId, active: true } }),
      404,
      'Sản phẩm không tồn tại',
    );
    send(
      res,
      await db.wishlist.upsert({
        where: { userId_productId: { userId: req.user!.id, productId } },
        create: { userId: req.user!.id, productId },
        update: {},
      }),
      201,
    );
  }),
);
customerRoutes.delete(
  '/wishlist/:id',
  handler(async (req, res) => {
    await db.wishlist.deleteMany({
      where: { userId: req.user!.id, productId: numberId(req.params.id) },
    });
    send(res, { deleted: true });
  }),
);
customerRoutes.post(
  '/orders/quote',
  handler(async (req, res) =>
    send(res, await transaction((tx) => quote(tx, req.user!.id, schemas.order.parse(req.body)))),
  ),
);
customerRoutes.post(
  '/orders',
  handler(async (req, res) => {
    const key = z.string().min(8).max(100).parse(req.headers['idempotency-key']);
    send(res, await createOrder(req.user!.id, schemas.order.parse(req.body), key), 201);
  }),
);
customerRoutes.get(
  '/orders/my',
  handler(async (req, res) => {
    const p = page(req.query);
    const where = {
      userId: req.user!.id,
      ...(req.query.status
        ? {
            status: z
              .enum(['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'])
              .parse(req.query.status),
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (p.page - 1) * p.limit,
        take: p.limit,
      }),
      db.order.count({ where }),
    ]);
    send(res, { items, total, ...p, pages: Math.ceil(total / p.limit) });
  }),
);
customerRoutes.get(
  '/orders/:id',
  handler(async (req, res) => {
    const o = await db.order.findFirst({
      where: { id: numberId(req.params.id), userId: req.user!.id },
      include: orderInclude,
    });
    assert(o, 404, 'Không tìm thấy đơn hàng');
    send(res, o);
  }),
);
customerRoutes.patch(
  '/orders/:id/cancel',
  handler(async (req, res) =>
    send(
      res,
      await changeStatus(
        numberId(req.params.id),
        'CANCELLED',
        `customer:${req.user!.id}`,
        'Khách hàng hủy đơn',
        req.user!.id,
      ),
    ),
  ),
);
customerRoutes.get(
  '/my-reviews',
  handler(async (req, res) =>
    send(
      res,
      await db.review.findMany({
        where: { userId: req.user!.id },
        include: { product: { include: productInclude } },
        orderBy: { createdAt: 'desc' },
      }),
    ),
  ),
);
customerRoutes.post(
  '/reviews',
  handler(async (req, res) => {
    const input = z
      .object({
        orderId: z.number().int().positive(),
        productId: z.number().int().positive(),
        rating: z.number().int().min(1).max(5),
        content: z.string().trim().min(10).max(3000),
      })
      .parse(req.body);
    send(
      res,
      await transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: {
            id: input.orderId,
            userId: req.user!.id,
            status: 'COMPLETED',
            items: { some: { productId: input.productId } },
          },
        });
        assert(order, 403, 'Chỉ được đánh giá sản phẩm trong đơn đã hoàn tất');
        const review = await tx.review.upsert({
          where: {
            userId_productId_orderId: {
              userId: req.user!.id,
              productId: input.productId,
              orderId: input.orderId,
            },
          },
          create: { ...input, userId: req.user!.id },
          update: {
            rating: input.rating,
            content: input.content,
            visible: false,
          },
        });
        const stats = await tx.review.aggregate({
          where: { productId: input.productId, visible: true },
          _avg: { rating: true },
        });
        await tx.product.update({
          where: { id: input.productId },
          data: { rating: stats._avg.rating || 0 },
        });
        return review;
      }),
      201,
    );
  }),
);
customerRoutes.get(
  '/notifications',
  handler(async (req, res) =>
    send(
      res,
      await db.notification.findMany({
        where: { userId: req.user!.id },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
    ),
  ),
);
customerRoutes.patch(
  '/notifications/:id',
  handler(async (req, res) => {
    await db.notification.updateMany({
      where: { id: numberId(req.params.id), userId: req.user!.id },
      data: { read: true },
    });
    send(res, { read: true });
  }),
);
