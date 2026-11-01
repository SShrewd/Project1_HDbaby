import { test, expect } from '@playwright/test';
test('viewport matrix: 360–1920 px without horizontal overflow', async ({ page }, info) => {
  test.skip(
    info.project.name === 'mobile',
    'The desktop project covers this explicit viewport matrix.',
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@hdbaby.local');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Admin@123456');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  for (const width of [360, 430, 768, 1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/products?stock=true', '/cart', '/admin']) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.locator('.skeleton')).toHaveCount(0);
      await expect(
        page.getByRole('heading', { name: 'Chưa thể tải dữ liệu', exact: true }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        `${width}px ${route}`,
      ).toBe(true);
      if (route === '/') {
        await expect(page.locator('.category-card')).toHaveCount(8);
        await page.screenshot({ path: `docs/screenshots/home-${width}px.png` });
      }
      if (route === '/admin') {
        await expect(
          page.getByRole('heading', { name: 'Nhịp tăng trưởng cửa hàng' }),
        ).toBeVisible();
        await page.screenshot({ path: `docs/screenshots/admin-${width}px.png` });
      }
    }
  }
  expect(errors).toEqual([]);
});
