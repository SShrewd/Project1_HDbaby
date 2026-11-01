# HDbaby — kế hoạch và trạng thái

Stack: React 19/Vite/TypeScript/Tailwind, Express 5, Prisma 6, MySQL 8.
Kiến trúc: React → REST controllers → services (transaction nghiệp vụ) → Prisma/MySQL.
Tiền VND lưu Decimal(12,0); client không quyết định giá. Phiên JWT HttpOnly gắn session có thể thu hồi; Origin và CSRF kiểm tra mọi mutation.

- [x] Schema, migration, MySQL riêng, seed đủ số lượng
- [x] Auth, profile, password recovery, addresses
- [x] Catalog, wishlist, reviews, cart
- [x] Checkout transaction, voucher, stock, idempotency, cancel, order history
- [x] Admin CRUD, upload, inventory, orders, customers, dashboard, content
- [x] Storefront và account/admin responsive
- [x] Tests API, UI, E2E và build/lint
- [x] Tài liệu API, Windows setup, nghiệm thu có bằng chứng

Không thay đổi dịch vụ MySQL80 hiện có. Local bootstrap dùng cổng 3307 với data trong .runtime/mysql.

Kết quả cuối: 35 API + 3 UI + 7 E2E PASS; đối chiếu dữ liệu không có vấn đề. Xem ACCEPTANCE.md và KNOWN_ISSUES.md để phân biệt phần đã xác minh, finding dependency và các hạng mục production chưa kiểm thử.
