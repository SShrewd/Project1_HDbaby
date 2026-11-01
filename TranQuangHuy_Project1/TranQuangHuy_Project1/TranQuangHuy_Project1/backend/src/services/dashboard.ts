import { db } from '../config/db.js';
export async function dashboard(days: number) {
  const since = new Date(Date.now() - days * 86400000);
  const [
    orders,
    customers,
    products,
    lowStock,
    customerTotal,
    productTotal,
    cancelledTotal,
    allRevenue,
  ] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: since } },
      include: {
        items: {
          include: {
            product: { select: { category: { select: { name: true } } } },
          },
        },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.user.findMany({
      where: { role: 'CUSTOMER', createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    db.product.findMany({
      where: { active: true },
      select: { id: true, name: true, stock: true },
    }),
    db.product.count({ where: { stock: { lte: 10 }, active: true } }),
    db.user.count({ where: { role: 'CUSTOMER' } }),
    db.product.count(),
    db.order.count({ where: { status: 'CANCELLED' } }),
    db.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { total: true },
    }),
  ]);
  const revenue = orders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((s, o) => s + Number(o.total), 0);
  const series = Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
    const daily = orders.filter((o) => o.createdAt.toISOString().startsWith(date));
    return {
      date,
      revenue: daily
        .filter((o) => o.status === 'COMPLETED')
        .reduce((s, o) => s + Number(o.total), 0),
      orders: daily.length,
      customers: customers.filter((c) => c.createdAt.toISOString().startsWith(date)).length,
    };
  });
  const top = new Map<number, { name: string; quantity: number; revenue: number }>();
  const categories = new Map<string, number>();
  for (const o of orders.filter((o) => o.status === 'COMPLETED'))
    for (const i of o.items) {
      const value = top.get(i.productId) || {
        name: i.name,
        quantity: 0,
        revenue: 0,
      };
      value.quantity += i.quantity;
      value.revenue += Number(i.price) * i.quantity;
      top.set(i.productId, value);
      const name = i.product.category.name;
      categories.set(name, (categories.get(name) || 0) + Number(i.price) * i.quantity);
    }
  const monthly = new Map<string, number>();
  for (const day of series) {
    const key = day.date.slice(0, 7);
    monthly.set(key, (monthly.get(key) || 0) + day.revenue);
  }
  return {
    revenue,
    allRevenue: Number(allRevenue._sum.total || 0),
    orders: orders.length,
    processing: orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED').length,
    customers: customerTotal,
    newCustomers: customers.length,
    products: productTotal,
    lowStock,
    cancelled: cancelledTotal,
    series,
    monthly: [...monthly].map(([date, revenue]) => ({ date, revenue })),
    status: ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'].map((name) => ({
      name,
      value: orders.filter((o) => o.status === name).length,
    })),
    topProducts: [...top.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    topCategories: [...categories]
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue),
    recentOrders: orders.slice(0, 8),
    lowStockProducts: products.filter((p) => p.stock <= 10).slice(0, 8),
  };
}
