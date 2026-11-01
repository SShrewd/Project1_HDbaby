# HDbaby

Website đồ án kinh doanh sản phẩm dinh dưỡng trẻ em, gồm cửa hàng React và khu quản trị. Dữ liệu được đọc/ghi qua Express REST API vào **MySQL 8**, không có backend giả lập hoặc database thay thế.

> Toàn bộ thương hiệu, bao bì, sản phẩm, đánh giá và giao dịch là dữ liệu minh họa. COD và chuyển khoản chỉ phục vụ demo; không chuyển tiền thật.

## Chạy nhanh trên máy Windows hiện tại

Yêu cầu Node.js **22.13+ hoặc 24 LTS**, npm và MySQL Server 8.0. Đã kiểm thử với Node 24.13.0, MySQL 8.0.44.

Mở PowerShell tại thư mục dự án:

```powershell
npm.cmd install
npm.cmd run setup
npm.cmd run dev
```

`setup` tạo MySQL riêng của dự án ở **127.0.0.1:3307**, tạo `backend/.env` với mật khẩu và JWT secret ngẫu nhiên, generate Prisma Client, chạy migration và seed. Không sửa dịch vụ MySQL80 hoặc dữ liệu MySQL ở cổng 3306. MySQL riêng chỉ lắng nghe trên loopback. Tệp dữ liệu nằm trong `.runtime/mysql`, thông tin kết nối nằm trong `.runtime/database.json`; hai vị trí này đều được gitignore.

Nếu đã setup trước đó, khởi động thuận tiện:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

Địa chỉ:

- Cửa hàng: **http://localhost:5173** (hoặc http://127.0.0.1:5173).
- Admin: **http://localhost:5173/admin**.
- API: **http://localhost:5000/api/health**.
- Swagger: **http://localhost:5000/api/docs/**.
- OpenAPI JSON: **http://localhost:5000/api/openapi.json**.

Dùng cùng một hostname trong suốt phiên đăng nhập vì cookie của `localhost` và `127.0.0.1` độc lập.

| Vai trò  | Email                 | Mật khẩu demo   |
| -------- | --------------------- | --------------- |
| Admin    | admin@hdbaby.local    | Admin@123456    |
| Customer | customer@hdbaby.local | Customer@123456 |

Mật khẩu được băm bcrypt trong database. Seed từ chối chạy khi không bật DEMO_MODE hoặc khi NODE_ENV=production. Server production từ chối database chứa tài khoản demo `@hdbaby.local`.

## Nếu MySQL được cài ở đường dẫn khác

Script mặc định tìm `C:\Program Files\MySQL\MySQL Server 8.0\bin`. Chỉ định đường dẫn thư mục `bin` trước khi setup:

```powershell
$env:MYSQL_BIN = 'D:\MySQL\bin'
npm.cmd run setup
```

Nếu cổng 3307 đang thuộc một MySQL khác, script không sửa dịch vụ đó. Đổi sang cấu hình MySQL riêng của bạn theo hướng dẫn bên dưới.

## Dùng MySQL đã có / Docker / Linux

Tạo database và user chuyên dụng bằng tài khoản quản trị MySQL của bạn; thay mật khẩu minh họa trước khi chạy:

```sql
CREATE DATABASE hdbaby_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hdbaby'@'localhost' IDENTIFIED BY 'mat-khau-rieng-cua-ban';
GRANT ALL PRIVILEGES ON hdbaby_db.* TO 'hdbaby'@'localhost';
```

Copy `.env.example` thành `backend/.env`. Điền DATABASE_URL, JWT_SECRET ngẫu nhiên ít nhất 32 ký tự, giữ DEMO_MODE=true cho đồ án. Nếu username/password có ký tự đặc biệt, URL encode khi viết DATABASE_URL.

```powershell
Copy-Item .env.example backend/.env
# Chỉnh backend/.env trước khi chạy các lệnh sau
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:check
npm.cmd run dev
```

Docker là lựa chọn thay thế, không bắt buộc. Đặt MYSQL_ROOT_PASSWORD và MYSQL_PASSWORD qua biến môi trường, chạy `docker compose up -d`, rồi cấu hình DATABASE_URL trong backend/.env trỏ tới cổng Docker. Cổng 3306 phải còn trống; máy hiện tại đã có MySQL80 nên nên dùng phương án 3307 ở trên. Trên Linux/macOS sử dụng `npm` thay cho `npm.cmd` và MySQL/Docker của bạn.

## Dữ liệu mẫu

Seed gồm 8 danh mục, 12 thương hiệu mô phỏng, 150 sản phẩm, 50 khách hàng, 70 địa chỉ, 250 đơn, 300 đánh giá có đơn hoàn tất tương ứng, 15 voucher, 8 banner, 20 bài viết, 100 thông báo và 795 bản ghi kho.

- Có đơn đủ 5 trạng thái, sản phẩm hết hàng / tồn thấp / giảm giá, dữ liệu phân bố trong 6 tháng.
- Tiền VND dùng Decimal(12,0); giá và tổng tiền chỉ do backend tính.
- Lịch sử tồn đầu kỳ và xuất hàng mẫu đối chiếu được với tồn hiện tại.
- `npm.cmd run db:seed` có thể chạy lại, giữ nguyên bộ dữ liệu đã tồn tại.
- Seed không ghi đè database đã có dữ liệu dang dở; dùng database trống hoặc chủ động reset database đồ án.
- **`npm.cmd run db:reset` xóa toàn bộ dữ liệu trong database đồ án và seed lại.** Chỉ dùng khi bạn thực sự muốn đặt lại dữ liệu; script kiểm tra DEMO_MODE, NODE_ENV và tên database trước khi reset.

Ảnh WebP và font đã nằm trong dự án/dependencies. Không cần API tạo ảnh hoặc tải ảnh bên ngoài khi demo. Chi tiết nguồn ảnh và prompt: [docs/ASSETS.md](docs/ASSETS.md).

## Demo luồng mua hàng

1. Duyệt sản phẩm, tìm theo tên/SKU, lọc danh mục, tuổi, thương hiệu, giá và tồn kho.
2. Thêm sản phẩm còn hàng vào giỏ; có thể dùng giỏ khách vãng lai trước khi đăng nhập.
3. Đăng nhập Customer; giỏ khách được nhập vào giỏ tài khoản, phần không đủ tồn được thông báo.
4. Chọn sản phẩm, nhập địa chỉ hoặc chọn địa chỉ đã lưu.
5. Nhập **HELLOBABY**: giảm 10%, tối đa 100.000đ, đơn tối thiểu 199.000đ. Xem các mã và điều kiện hiện tại ở trang Ưu đãi.
6. Chọn giao tiêu chuẩn / giao nhanh, COD / chuyển khoản mô phỏng, kiểm tra tổng tiền rồi xác nhận.
7. Theo dõi mã đơn và lịch sử trạng thái; hủy khi đơn còn chờ hoặc đã xác nhận để minh họa hoàn kho.
8. Đăng nhập Admin, mở đơn: Chờ xác nhận → Đã xác nhận → Đang giao → Hoàn tất. Sau đó Customer có thể đánh giá sản phẩm trong đơn.

Admin có CRUD sản phẩm, danh mục, thương hiệu, voucher, banner, bài viết, FAQ; điều chỉnh kho có lý do; quản lý tài khoản, đánh giá và tin nhắn; cập nhật nội dung website. Sản phẩm, danh mục, thương hiệu, voucher và bài viết được ẩn để bảo toàn lịch sử. Banner và FAQ có thể xóa.

## Khôi phục mật khẩu demo

Vào `/forgot-password`, nhập email tài khoản. API luôn trả thông báo chung. Khi email hợp lệ, thư được ghi vào **`.runtime/mail/*.txt`**; mở thư local để lấy liên kết `/reset-password?token=...`. Token chỉ dùng một lần trong 15 phút. Đổi/khôi phục mật khẩu thu hồi tất cả phiên của tài khoản. Không đưa hộp thư local lên web hoặc Git. Phiên bản này chưa cấu hình SMTP gửi mail thật.

## Kiểm tra và build

Giữ MySQL đang chạy. E2E cần API và Vite đang chạy trong một terminal khác.

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd exec playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
```

API tests dùng Supertest với MySQL thật, tự tạo dữ liệu có prefix QA và chỉ xóa dữ liệu do test tạo. Không chạy test vào database production. E2E tương tự dùng tài khoản và sản phẩm riêng; mã cleanup hoàn kho cho đơn test chưa hủy.

Build backend tại `backend/dist`, frontend tại `frontend/dist`. Để kiểm tra backend đã build: `npm.cmd run start -w backend`. Vite dev server phục vụ frontend và proxy `/api`, `/uploads`; khi đưa lên máy chủ thật cần cấu hình reverse proxy tương ứng và fallback SPA tới index.html.

`Ctrl+C` dừng hai ứng dụng development. Để dừng riêng MySQL dự án:

```powershell
node scripts/stop-mysql.mjs
```

Lệnh trên kiểm tra datadir trước khi gửi SHUTDOWN, không dừng MySQL80 ở 3306. Khởi động lại: `npm.cmd run db:local`. Không xóa `.runtime/mysql` khi MySQL đang chạy.

## Cấu trúc

```text
frontend/src/components/       UI dùng chung, layout, sản phẩm, voucher
frontend/src/pages/            Cửa hàng, tài khoản, auth, admin
frontend/src/services/         Axios, CSRF, query client
frontend/src/contexts/         Auth, giỏ khách/tài khoản, wishlist
backend/src/modules/           Controllers, auth service, catalog repository, admin resources
backend/src/services/          Orders, inventory transactions, dashboard
backend/src/middlewares/       JWT/session, role, CSRF, error handling
backend/src/validators/        Zod validation
backend/prisma/                MySQL schema, migration, seed
backend/tests/                 Integration tests trên MySQL
tests/e2e/                     Playwright
scripts/                       Setup và quản lý MySQL local
docs/                          API, kiến trúc, ảnh, nghiệm thu
```

Xem [API](docs/API.md), [kiến trúc](docs/ARCHITECTURE.md), [nghiệm thu](docs/ACCEPTANCE.md) và [giới hạn còn lại](docs/KNOWN_ISSUES.md). Dự án ưu tiên demo local, chưa được triển khai công khai.

-- fix
$ErrorActionPreference = 'Stop'
$backupTag = Get-Date -Format 'yyyyMMdd-HHmmss-fff'

if (Test-Path -LiteralPath '.runtime') {
Rename-Item -LiteralPath '.runtime' -NewName ".runtime-backup-$backupTag"
}

if (Test-Path -LiteralPath 'backend/.env') {
Move-Item -LiteralPath 'backend/.env' -Destination ".\.env-backup-$backupTag"
}

powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
