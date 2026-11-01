# HDbaby REST API

Base URL development: `http://localhost:5000/api`. Swagger: `/api/docs/`, tài liệu máy đọc: `/api/openapi.json`. OpenAPI được xây từ schema validation Zod và danh sách endpoint có thực. Hầu hết response thành công: `{ "data": ... }`; lỗi: `{ "error": { "message": "...", "issues": ... } }`.

- 200 đọc/cập nhật; 201 tạo; 400 validation/điều kiện voucher; 401 chưa đăng nhập; 403 role, CSRF, Origin hoặc không đủ điều kiện đánh giá; 404 không tồn tại/không thuộc tài khoản; 409 dữ liệu trùng, xung đột giá/tồn kho/trạng thái; 429 vượt rate limit.
- Giá tiền VND trong entity được trả thành chuỗi. Quote/dashboard trả tổng số học dạng number.
- Danh sách có phân trang: `{items,total,page,limit,pages}`; limit 1–100, mặc định 12.
- Mọi mutation (POST/PATCH/DELETE) cần giữ cookie và gửi `X-CSRF-Token` lấy từ `GET /csrf`.
- Xác thực bằng HttpOnly cookies access/refresh. Không truyền userId/role từ client để xác định quyền.

## Authentication

| Method | Endpoint              | Body / hành vi                                                                |
| ------ | --------------------- | ----------------------------------------------------------------------------- |
| POST   | /auth/register        | name, email, phone, password; tạo Customer, không nhận role từ client         |
| POST   | /auth/login           | email, password                                                               |
| POST   | /auth/logout          | Thu hồi phiên hiện tại và xóa cookie                                          |
| POST   | /auth/refresh         | Xoay refresh cookie, thu hồi phiên cũ                                         |
| GET    | /auth/me              | Hồ sơ an toàn hoặc null khi khách chưa có cookie; 401 khi cookie hết hiệu lực |
| PATCH  | /auth/profile         | name, phone                                                                   |
| PATCH  | /auth/change-password | currentPassword, password; thu hồi mọi phiên                                  |
| POST   | /auth/forgot-password | email; luôn trả thông báo chung; demo ghi thư vào .runtime/mail               |
| POST   | /auth/reset-password  | token, password; token 15 phút, dùng một lần                                  |

Mật khẩu ít nhất 10, tối đa 100 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt. Số điện thoại dạng 0xxxxxxxxx hoặc +84xxxxxxxxx.

## Public catalog & nội dung

| Method | Endpoint              | Nội dung                                                                                                 |
| ------ | --------------------- | -------------------------------------------------------------------------------------------------------- |
| GET    | /products             | q, category (slug), brand (slug), age, min, max, stock=true, featured=true, sale=true, sort, page, limit |
| GET    | /products/search      | Gợi ý tìm kiếm, tối đa 6 sản phẩm                                                                        |
| GET    | /products/featured    | Sản phẩm nổi bật                                                                                         |
| GET    | /products/bestsellers | Sắp xếp theo lượng bán mẫu                                                                               |
| GET    | /products/:slug       | Chi tiết, ảnh, danh mục, thương hiệu và tối đa 30 review hiển thị                                        |
| GET    | /categories, /brands  | Danh sách đang hiển thị, theo position                                                                   |
| GET    | /content              | Banner, 3 bài viết mới, FAQ, settings, 3 nhận xét mẫu, voucher còn hiệu lực/lượt                         |
| GET    | /articles             | q, page, limit                                                                                           |
| GET    | /articles/:slug       | Nội dung bài viết                                                                                        |
| GET    | /reviews/:id          | Review hiển thị của productId                                                                            |
| POST   | /newsletter           | email, upsert tránh đăng ký trùng                                                                        |
| POST   | /contacts             | name, email, message (10–5000 ký tự)                                                                     |
| GET    | /health               | Kiểm tra kết nối MySQL                                                                                   |
| GET    | /csrf                 | Token biểu mẫu, Cache-Control=no-store                                                                   |

Sort: `newest`, `price_asc`, `price_desc`, `bestsellers`, `rating`. Age: `0-6`, `6-12`, `12-24`, `24-36`, `36+`. Giá và keyword được query ở MySQL. Sản phẩm đã ẩn hoặc có danh mục/thương hiệu ẩn không xuất hiện trên catalog công khai.

## Customer (cần đăng nhập)

| Method        | Endpoint           | Body / hành vi                                                                         |
| ------------- | ------------------ | -------------------------------------------------------------------------------------- |
| GET           | /cart              | Giỏ tài khoản; trả product và priceAtAdd để báo đổi giá                                |
| POST          | /cart/items        | productId, quantity; cộng vào số lượng đã có và kiểm tra kho                           |
| PATCH         | /cart/items/:id    | quantity và/hoặc selected                                                              |
| DELETE        | /cart/items/:id    | id là mã dòng giỏ thuộc tài khoản                                                      |
| GET, POST     | /addresses         | POST: name, phone, city, district, detail, isDefault                                   |
| PATCH, DELETE | /addresses/:id     | Sửa / xóa địa chỉ của mình                                                             |
| GET, POST     | /wishlist          | POST: productId; thêm idempotent                                                       |
| DELETE        | /wishlist/:id      | id là productId                                                                        |
| GET           | /my-reviews        | Review của mình                                                                        |
| POST          | /reviews           | orderId, productId, rating 1–5, content; tạo hoặc sửa theo bộ khóa user/product/order  |
| GET           | /notifications     | Tối đa 100 thông báo mới nhất của mình                                                 |
| PATCH         | /notifications/:id | Đánh dấu đã đọc                                                                        |
| POST          | /orders/quote      | Kiểm tra lại sản phẩm/giá/kho/voucher, tính subtotal, discount, shipping, total        |
| POST          | /orders            | Body như quote + expectedTotal tùy chọn; bắt buộc header Idempotency-Key (8–100 ký tự) |
| GET           | /orders/my         | page, limit, status                                                                    |
| GET           | /orders/:id        | Snapshot items và history; không đọc đơn người khác                                    |
| PATCH         | /orders/:id/cancel | Chỉ hủy PENDING/CONFIRMED; hoàn kho/voucher trong transaction                          |

Body quote/order:

```json
{
  "recipient": "Ba mẹ demo",
  "phone": "0901234567",
  "city": "TP. Hồ Chí Minh",
  "district": "Bình Thạnh",
  "address": "123 Địa chỉ demo",
  "note": "Đơn minh họa",
  "delivery": "standard",
  "payment": "COD",
  "voucher": "HELLOBABY",
  "items": [{ "productId": 2, "quantity": 2 }]
}
```

delivery: standard (25.000đ, miễn phí khi subtotal ≥499.000đ), express (45.000đ). payment: COD hoặc BANK_DEMO. Không có giao dịch ngân hàng thật. Backend bỏ qua mọi giá do client tự gửi. expectedTotal nếu khác tổng mới nhất sẽ trả 409 yêu cầu xác nhận lại. Gửi lại cùng Idempotency-Key và cùng payload trả đúng đơn đã tạo; cùng key nhưng payload khác trả 409.

Voucher kiểm tra active, startsAt, expiresAt, minOrder, lượt toàn cục và lượt mỗi tài khoản; trần giảm tối đa min(maxDiscount, subtotal). Đơn đã hủy trả lại lượt sử dụng.

## Admin (JWT/session + role ADMIN)

| Method             | Endpoint                                                                                        | Chức năng                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| GET, POST          | /admin/products                                                                                 | Danh sách với filter catalog + low=true; tạo sản phẩm                           |
| GET, PATCH, DELETE | /admin/products/:id                                                                             | Chi tiết/sửa/ẩn; sửa không được thay stock, phải dùng inventory                 |
| GET, POST          | /admin/categories, /admin/brands, /admin/vouchers, /admin/banners, /admin/articles, /admin/faqs | CRUD có schema từng resource                                                    |
| PATCH, DELETE      | /admin/{resource}/:id                                                                           | Cập nhật / ẩn; banner và FAQ xóa cứng                                           |
| POST               | /admin/uploads                                                                                  | multipart/form-data, field images, 1–10 file JPG/PNG/WebP, tối đa 5 MB/file     |
| GET                | /admin/inventory                                                                                | Lịch sử kho, productId, page, limit                                             |
| POST               | /admin/inventory                                                                                | productId, change (số nguyên có dấu), reason (5–255 ký tự); không cho âm kho    |
| GET                | /admin/orders                                                                                   | q theo mã, status, userId, page, limit                                          |
| GET                | /admin/orders/:id                                                                               | Chi tiết đơn và thông tin người mua an toàn                                     |
| PATCH              | /admin/orders/:id/status                                                                        | status, note; chỉ chuyển theo state machine                                     |
| GET                | /admin/customers                                                                                | q, page, limit; không trả passwordHash hoặc token                               |
| GET                | /admin/customers/:id                                                                            | Hồ sơ, địa chỉ, lịch sử đơn                                                     |
| PATCH              | /admin/customers/:id                                                                            | active; khóa tài khoản thu hồi mọi phiên                                        |
| GET                | /admin/reviews                                                                                  | q theo nội dung, page, limit                                                    |
| PATCH              | /admin/reviews/:id                                                                              | visible; cập nhật lại điểm trung bình sản phẩm                                  |
| GET                | /admin/contacts                                                                                 | q theo người gửi/email, page, limit                                             |
| PATCH              | /admin/contacts/:id                                                                             | reply (ghi chú nội bộ), resolved; không gửi email                               |
| GET, PATCH         | /admin/settings                                                                                 | name, phone, email, address, about, shippingPolicy, returnPolicy, privacyPolicy |
| GET                | /admin/dashboard                                                                                | days=7..366, mặc định 30; dữ liệu thật trong kỳ                                 |
| GET                | /admin/report.csv                                                                               | days=7..366; doanh thu/đơn/khách mới theo ngày, UTF-8 BOM                       |

Product POST/PATCH yêu cầu name, slug, sku, categoryId, brandId, age, price, stock, description, ingredients, nutrition, usage, storage, warning, packaging, origin, images (mảng URL local). originalPrice tùy chọn; nếu có không thấp hơn price; featured/active là boolean. PATCH sản phẩm gửi đủ thông tin, không phải partial arbitrary.

Category: name, slug, image, position, active. Brand: name, slug, origin, position, active. Voucher: code, type (PERCENT/FIXED), value, maxDiscount, minOrder, startsAt, expiresAt (ISO8601), limit, perUser, active. Banner: title, subtitle, image, link (đường dẫn nội bộ), position, active. Article: title, slug, excerpt, content (plain text), image, active. FAQ: question, answer, position, active.

State machine: PENDING → CONFIRMED → SHIPPING → COMPLETED; PENDING hoặc CONFIRMED → CANCELLED. Hoàn tất đánh dấu PAID trong quy trình demo; thao tác không xác nhận giao dịch ngân hàng thật.

## Ví dụ từ JavaScript

```js
const csrf = (await (await fetch('/api/csrf')).json()).data.token;
await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
  body: JSON.stringify({ email: 'customer@hdbaby.local', password: 'Customer@123456' }),
});
const products = (await (await fetch('/api/products?stock=true&sort=price_asc')).json()).data;
console.log(products.total);
```

Ví dụ sử dụng cookie cùng origin. Ứng dụng Axios trong frontend đã tự xử lý CSRF, một lần refresh và lỗi API.
