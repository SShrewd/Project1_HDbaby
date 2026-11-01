import { randomUUID } from 'node:crypto';
import type { OrderStatus } from '@prisma/client';
import { z } from 'zod';
import { db, transaction, type Transaction } from '../config/db.js';
import { assert, AppError } from '../utils/http.js';
import { hash } from '../utils/security.js';
import { order as orderSchema } from '../validators/index.js';
export type OrderInput = z.infer<typeof orderSchema>;
export const orderInclude = {
  items: true,
  history: { orderBy: { createdAt: 'asc' as const } },
};
export async function quote(tx: Transaction, userId: number, input: OrderInput) {
  const products = await tx.product.findMany({
    where: {
      id: { in: input.items.map((i) => i.productId) },
      active: true,
      brand: { active: true },
      category: { active: true },
    },
    include: { images: { orderBy: { position: 'asc' } } },
  });
  const items = input.items.map((item) => {
    const p = products.find((p) => p.id === item.productId);
    assert(p, 400, 'Sản phẩm không còn kinh doanh');
    assert(p.stock >= item.quantity, 409, `${p.name}: không đủ tồn kho`);
    return {
      ...item,
      name: p.name,
      sku: p.sku,
      image: p.images[0]?.url || '/assets/product-0.webp',
      price: Number(p.price),
    };
  });
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let discount = 0;
  let voucherId: number | undefined;
  if (input.voucher) {
    const v = await tx.voucher.findUnique({
      where: { code: input.voucher.trim().toUpperCase() },
    });
    const now = new Date();
    assert(
      v?.active && v.startsAt <= now && v.expiresAt >= now,
      400,
      'Voucher không hợp lệ hoặc đã hết hạn',
    );
    assert(v.used < v.limit, 400, 'Voucher đã hết lượt sử dụng');
    assert(
      subtotal >= Number(v.minOrder),
      400,
      `Đơn tối thiểu ${Number(v.minOrder).toLocaleString('vi-VN')}đ`,
    );
    const used = await tx.order.count({
      where: { userId, voucherId: v.id, status: { not: 'CANCELLED' } },
    });
    assert(used < v.perUser, 400, 'Bạn đã sử dụng hết lượt voucher này');
    discount = Math.min(
      subtotal,
      Number(v.maxDiscount),
      v.type === 'PERCENT' ? Math.floor((subtotal * Number(v.value)) / 100) : Number(v.value),
    );
    voucherId = v.id;
  }
  const shipping = input.delivery === 'express' ? 45000 : subtotal >= 499000 ? 0 : 25000;
  return {
    items,
    subtotal,
    discount,
    shipping,
    total: subtotal - discount + shipping,
    voucherId,
  };
}
export async function createOrder(userId: number, input: OrderInput, key: string) {
  const idempotencyKey = `${userId}:${key}`;
  const requestHash = hash(JSON.stringify(input));
  const perform = () =>
    transaction(async (tx) => {
      const previous = await tx.order.findUnique({
        where: { idempotencyKey },
        include: orderInclude,
      });
      if (previous) {
        assert(
          previous.requestHash === requestHash,
          409,
          'Mã xác nhận đã được sử dụng với nội dung khác',
        );
        return previous;
      }
      const calculated = await quote(tx, userId, input);
      if (input.expectedTotal !== undefined)
        assert(
          input.expectedTotal === calculated.total,
          409,
          'Giá hoặc phí vận chuyển đã thay đổi. Vui lòng xác nhận lại tổng tiền.',
        );
      for (const i of calculated.items) {
        const updated = await tx.product.updateMany({
          where: { id: i.productId, stock: { gte: i.quantity }, active: true },
          data: {
            stock: { decrement: i.quantity },
            sold: { increment: i.quantity },
          },
        });
        assert(updated.count === 1, 409, 'Tồn kho vừa thay đổi, vui lòng kiểm tra lại');
        await tx.inventoryLog.create({
          data: {
            productId: i.productId,
            change: -i.quantity,
            reason: 'Đặt hàng',
            actor: `customer:${userId}`,
          },
        });
      }
      if (calculated.voucherId) {
        const updated = await tx.voucher.updateMany({
          where: {
            id: calculated.voucherId,
            used: {
              lt: (
                await tx.voucher.findUniqueOrThrow({
                  where: { id: calculated.voucherId },
                })
              ).limit,
            },
          },
          data: { used: { increment: 1 } },
        });
        assert(updated.count === 1, 409, 'Voucher vừa hết lượt');
      }
      const result = await tx.order.create({
        data: {
          code: `HD${Date.now().toString(36).toUpperCase()}${randomUUID().slice(0, 6).toUpperCase()}`,
          userId,
          idempotencyKey,
          requestHash,
          recipient: input.recipient,
          phone: input.phone,
          city: input.city,
          district: input.district,
          address: input.address,
          note: input.note,
          delivery: input.delivery,
          payment: input.payment,
          subtotal: calculated.subtotal,
          discount: calculated.discount,
          shipping: calculated.shipping,
          total: calculated.total,
          voucherId: calculated.voucherId,
          items: { create: calculated.items },
          history: { create: { status: 'PENDING', note: 'Đơn hàng được tạo' } },
        },
        include: orderInclude,
      });
      await tx.cartItem.deleteMany({
        where: {
          userId,
          productId: { in: input.items.map((i) => i.productId) },
        },
      });
      await tx.notification.create({
        data: {
          userId,
          title: `Đã nhận đơn ${result.code}`,
          content: 'Đơn hàng đang chờ xác nhận. Theo dõi trong Đơn hàng của tôi.',
        },
      });
      return result;
    });
  try {
    return await perform();
  } catch (error) {
    const previous = await db.order.findUnique({
      where: { idempotencyKey },
      include: orderInclude,
    });
    if (previous) {
      assert(previous.requestHash === requestHash, 409, 'Mã xác nhận đã sử dụng với nội dung khác');
      return previous;
    }
    throw error;
  }
}
export const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};
export async function changeStatus(
  id: number,
  status: OrderStatus,
  actor: string,
  note: string,
  userId?: number,
) {
  return transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      include: { items: true },
    });
    assert(order && (!userId || order.userId === userId), 404, 'Không tìm thấy đơn hàng');
    if (userId) assert(status === 'CANCELLED', 403, 'Không được phép cập nhật trạng thái');
    assert(transitions[order.status].includes(status), 409, 'Không thể chuyển trạng thái đơn hàng');
    const updated = await tx.order.updateMany({
      where: { id, status: order.status },
      data: {
        status,
        ...(status === 'COMPLETED' ? { paymentStatus: 'PAID' } : {}),
      },
    });
    assert(updated.count === 1, 409, 'Trạng thái vừa thay đổi');
    if (status === 'CANCELLED') {
      for (const i of order.items) {
        await tx.product.update({
          where: { id: i.productId },
          data: {
            stock: { increment: i.quantity },
            sold: { decrement: i.quantity },
          },
        });
        await tx.inventoryLog.create({
          data: {
            productId: i.productId,
            change: i.quantity,
            reason: `Hoàn kho ${order.code}`,
            actor,
          },
        });
      }
      if (order.voucherId)
        await tx.voucher.update({
          where: { id: order.voucherId },
          data: { used: { decrement: 1 } },
        });
    }
    await tx.orderHistory.create({
      data: { orderId: id, status, note: note || `Cập nhật bởi ${actor}` },
    });
    await tx.notification.create({
      data: {
        userId: order.userId,
        title: `Đơn ${order.code} đã cập nhật`,
        content: `Trạng thái: ${status}. ${note}`,
      },
    });
    return tx.order.findUnique({ where: { id }, include: orderInclude });
  });
}
export async function adjustStock(
  productId: number,
  change: number,
  reason: string,
  actor: string,
) {
  if (!Number.isInteger(change) || change === 0 || Math.abs(change) > 1000000)
    throw new AppError(400, 'Số lượng điều chỉnh không hợp lệ');
  return transaction(async (tx) => {
    const p = await tx.product.findUnique({ where: { id: productId } });
    assert(p, 404, 'Sản phẩm không tồn tại');
    assert(p.stock + change >= 0, 409, 'Tồn kho không thể âm');
    const changed = await tx.product.updateMany({
      where: { id: productId, stock: p.stock },
      data: { stock: { increment: change } },
    });
    assert(changed.count === 1, 409, 'Tồn kho đã thay đổi');
    return tx.inventoryLog.create({
      data: { productId, change, reason, actor },
    });
  });
}
