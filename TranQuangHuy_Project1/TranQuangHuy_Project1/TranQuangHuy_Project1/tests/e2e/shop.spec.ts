import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve('backend/.env') });
const db = new PrismaClient();
const tag = `e2e-${Date.now()}`;
test.afterAll(async () => {
  const users = await db.user.findMany({
    where: { email: { startsWith: tag } },
    select: { id: true },
  });
  for (const u of users) {
    const orders = await db.order.findMany({
      where: { userId: u.id, status: { not: 'CANCELLED' } },
      include: { items: true },
    });
    for (const order of orders)
      for (const item of order.items)
        await db.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            sold: { decrement: item.quantity },
          },
        });
    await db.notification.deleteMany({ where: { userId: u.id } });
    await db.review.deleteMany({ where: { userId: u.id } });
    await db.inventoryLog.deleteMany({ where: { actor: `customer:${u.id}` } });
    await db.order.deleteMany({ where: { userId: u.id } });
    await db.user.delete({ where: { id: u.id } });
  }
  await db.category.deleteMany({ where: { slug: { startsWith: tag } } });
  const testProducts = await db.product.findMany({
    where: { sku: { startsWith: tag } },
    select: { id: true },
  });
  await db.inventoryLog.deleteMany({ where: { productId: { in: testProducts.map((p) => p.id) } } });
  await db.product.deleteMany({ where: { id: { in: testProducts.map((p) => p.id) } } });
  await db.$disconnect();
});
test('registration → favorites → cart → checkout → cancel', async ({ page, request }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const email = `${tag}-${info.project.name}@example.test`;
  await page.goto('/register');
  await page.getByLabel('Họ và tên', { exact: true }).fill('Ba mẹ kiểm thử');
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0908887777');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('E2eDemo@123456');
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  const products = (await (await request.get('/api/products?stock=true&min=200000&limit=1')).json())
    .data.items;
  const p = products[0];
  await page.goto(`/products/${p.slug}`);
  await expect(page.getByRole('heading', { name: p.name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Yêu thích sản phẩm', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
  await page.getByRole('link', { name: 'Xem giỏ hàng', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục thanh toán', exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByLabel('Họ tên người nhận', { exact: true }).fill('Ba mẹ kiểm thử');
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0908887777');
  await page.getByLabel('Tỉnh / thành phố', { exact: true }).fill('TP. Hồ Chí Minh');
  await page.getByLabel('Quận / huyện', { exact: true }).fill('Bình Thạnh');
  await page.getByLabel('Địa chỉ chi tiết', { exact: true }).fill('123 Địa chỉ kiểm thử');
  await page.getByLabel('Mã ưu đãi', { exact: true }).fill('HELLOBABY');
  await page.getByRole('button', { name: 'Kiểm tra & xác nhận đơn', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ba mẹ kiểm tra lại nhé' })).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận đặt hàng', exact: true }).click();
  await expect(page).toHaveURL(/\/order-success\/\d+/);
  await page.locator('main').getByRole('link', { name: 'Theo dõi đơn hàng', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^HD/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận hủy', exact: true }).click();
  await expect(
    page.locator('.order-detail-header').getByText('Đã hủy', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `docs/screenshots/checkout-${info.project.name}.png`,
    fullPage: true,
  });
});
test('search, filters, responsive pages and cart persistence', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Yêu thương');
  await expect(page.locator('.category-card')).toHaveCount(8);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('.hero h1')).toHaveCSS('opacity', '1');
  await expect(page.locator('.product-card').first()).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/home-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto('/products?stock=true');
  await page.getByLabel('Sắp xếp sản phẩm').selectOption('price_asc');
  await expect(page).toHaveURL(/sort=price_asc/);
  await page.getByLabel('Từ khóa tìm kiếm').fill('yến mạch');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(page.locator('.product-name').first()).toContainText('yến mạch');
  for (const route of [
    '/about',
    '/blog',
    '/faq',
    '/policies/privacy',
    '/contact',
    '/products',
    '/cart',
    '/forgot-password',
  ]) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      `overflow ${route}`,
    ).toBe(true);
  }
  await page.goto('/products?stock=true');
  await page.locator('.add-btn').first().click();
  await page.reload();
  await page.getByRole('button', { name: 'Mở giỏ hàng', exact: true }).click();
  await expect(page.locator('.drawer-item')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('admin dashboard, CRUD, inventory, content and responsive navigation', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@hdbaby.local');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Admin@123456');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Nhịp tăng trưởng cửa hàng' })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Nhịp tăng trưởng cửa hàng' })).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/admin-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto('/admin/categories');
  await page.getByRole('button', { name: 'Thêm danh mục', exact: true }).click();
  await page.getByLabel('Tên', { exact: true }).fill('Danh mục kiểm thử E2E');
  await page
    .getByLabel('Slug (chữ thường, số, dấu -)', { exact: true })
    .fill(`${tag}-${info.project.name}`);
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Tìm dữ liệu').fill('Danh mục kiểm thử E2E');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('Danh mục kiểm thử E2E');
  await page.goto('/admin/products/new');
  await page.getByLabel('Tên sản phẩm', { exact: true }).fill('Bột ăn dặm QA E2E');
  await page.getByLabel('Slug', { exact: true }).fill(`${tag}-${info.project.name}`);
  await page.getByLabel('SKU duy nhất', { exact: true }).fill(`${tag}-${info.project.name}`);
  await expect(page.getByLabel('Danh mục', { exact: true }).locator('option')).not.toHaveCount(1);
  await page.getByLabel('Danh mục', { exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Thương hiệu', { exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Giá bán (VND)', { exact: true }).fill('159000');
  await page.getByLabel('Tồn kho ban đầu', { exact: true }).fill('3');
  await page
    .getByLabel('Mô tả sản phẩm', { exact: true })
    .fill('Nội dung mô phỏng cho đồ án. '.repeat(15));
  await page
    .getByLabel('Thành phần', { exact: true })
    .fill('Gạo, yến mạch — nhãn mẫu cho kiểm thử.');
  await page
    .getByLabel('Hướng dẫn sử dụng', { exact: true })
    .fill('Đọc kỹ thông tin trên nhãn mô phỏng.');
  await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await page.getByLabel('Tìm sản phẩm quản trị').fill(`${tag}-${info.project.name}`);
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: 'Sửa Bột ăn dặm QA E2E', exact: true }).click();
  await page.getByLabel('Tên sản phẩm', { exact: true }).fill('Bột ăn dặm QA đã chỉnh sửa');
  await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  for (const route of [
    '/admin/products',
    '/admin/inventory',
    '/admin/orders',
    '/admin/customers',
    '/admin/reviews',
    '/admin/vouchers',
    '/admin/banners',
    '/admin/articles',
    '/admin/faqs',
    '/admin/contacts',
    '/admin/settings',
  ]) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.locator('.skeleton')).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      `overflow ${route}`,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
