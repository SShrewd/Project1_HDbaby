# Nghiệm thu HDbaby

Ngày kiểm tra: **01/11/2026**, môi trường Windows, Node.js 24.13.0, MySQL Community 8.0.44, Prisma 6.19.3. Database thật `hdbaby_db` tại 127.0.0.1:3307, độc lập MySQL80 có sẵn trên máy.

Lượt E2E cuối chạy với **frontend đã build qua Vite preview và backend đã biên dịch**, không dùng mock hoặc dữ liệu cứng trong React. Kết quả: **35 API tests + 3 UI tests + 7 Playwright E2E = 45 tests PASS**. Không dùng retry để che lỗi. Những lỗi phát hiện ở lượt trước (điều hướng Admin, focus modal, nhãn select, giá gốc trống khi sửa sản phẩm và toast che CTA mobile) đã được sửa trước lượt xác minh này.

## Tiêu chí của đề bài

| Tiêu chí                                   | Trạng thái | Bằng chứng / phạm vi xác minh                                                                                    |
| ------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Website chạy localhost                     | PASS       | Vite dev và bản build preview tại 5173; Express tại 5000                                                         |
| React kết nối Node API                     | PASS       | E2E đăng ký, giỏ, checkout, đơn và CRUD gọi API thật                                                             |
| MySQL lưu dữ liệu thực                     | PASS       | Prisma migration/seed, db:check; không có database thay thế                                                      |
| Đăng ký / đăng nhập                        | PASS       | API success/duplicate/weak password/wrong password; E2E hai viewport                                             |
| Phân quyền đúng                            | PASS       | Visitor 401, Customer 403 ở Admin; kiểm tra IDOR đơn/giỏ/địa chỉ                                                 |
| Catalog tải từ database                    | PASS       | 150 sản phẩm qua API, search/filter/pagination server-side                                                       |
| Tìm kiếm, lọc và sắp xếp                   | PASS       | Supertest kiểm tra giá, tồn, sắp xếp; E2E tìm yến mạch và đổi sort                                               |
| Giỏ hàng                                   | PASS       | Thêm, kiểm tra vượt tồn, đổi lượng; E2E giỏ khách còn sau reload                                                 |
| Đặt hàng tạo dữ liệu thật                  | PASS       | Quote/voucher/tổng tiền, tạo Order/OrderItem/History; E2E mua hàng                                               |
| Tồn kho cập nhật đúng                      | PASS       | Hai checkout đồng thời chỉ một đơn khi còn một sản phẩm; số lượng không âm                                       |
| Hủy đơn đúng                               | PASS       | Hoàn kho đúng một lần; từ chối hủy đơn hoàn tất và đơn người khác                                                |
| Admin CRUD                                 | PASS       | API tạo/sửa/ẩn sản phẩm và upload; E2E tạo/sửa sản phẩm và tạo danh mục; CMS dùng registry/schema riêng          |
| Dashboard theo dữ liệu                     | PASS       | So sánh doanh thu tổng với aggregate MySQL, 365 điểm dữ liệu; E2E render charts                                  |
| Demo đủ và nhất quán                       | PASS       | db:check trả issues=[]; số lượng và đối chiếu kho/đơn/review ở bảng dưới                                         |
| Các trang bắt buộc đã triển khai           | PASS       | Route storefront/auth/account/order/policy/blog và admin có implementation; route smoke ở E2E                    |
| Giao diện đồng nhất, responsive, animation | PASS       | Motion, reduced motion, ảnh local; Chromium ở 360/430/768/1024/1280/1920 px không tràn ngang trên trang kiểm tra |
| Không lỗi build                            | PASS       | Build backend tsc và frontend tsc/Vite; đã chạy E2E trên output build                                            |
| Các test trọng yếu được thực thi           | PASS       | 35 API, 3 UI và 7 E2E; chi tiết bên dưới                                                                         |
| README và hướng dẫn chạy                   | PASS       | README, .env.example, setup/start/stop MySQL, migration/seed và tài khoản demo                                   |

PASS phản ánh phạm vi được nêu ở cột bằng chứng, không hàm ý mọi tổ hợp dữ liệu hoặc mọi thiết bị đều đã kiểm thử.

## Kết quả lệnh

| Lệnh / kiểm tra                                            | Trạng thái | Kết quả                                                                                                  |
| ---------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| npm run db:generate                                        | PASS       | Prisma Client 6.19.3                                                                                     |
| npm run db:migrate                                         | PASS       | Migration áp dụng và chạy lại không có migration chờ                                                     |
| npm run db:seed                                            | PASS       | Tạo đủ dữ liệu; chạy lại giữ nguyên bộ seed                                                              |
| node scripts/stop-mysql.mjs → node scripts/local-mysql.mjs | PASS       | Dừng/khởi động MySQL riêng, dữ liệu tồn tại sau restart                                                  |
| npm run typecheck                                          | PASS       | Hai workspace không lỗi TypeScript                                                                       |
| npm run lint                                               | PASS       | ESLint không lỗi                                                                                         |
| npm test                                                   | PASS       | Backend 35/35, frontend 3/3                                                                              |
| npm run build                                              | PASS       | Backend và frontend build thành công; chart/react/query/motion tách chunk                                |
| npm run test:e2e                                           | PASS       | 7/7, lượt cuối 49,2 giây, retries=0                                                                      |
| npm run db:check                                           | PASS       | Không lỗi tổng tiền, review, tồn kho hoặc thiếu ảnh sản phẩm                                             |
| npm audit                                                  | FAIL       | 3 advisory high còn trong Prisma CLI / @prisma/config / deepmerge-ts; 0 critical, 0 moderate ở lượt cuối |
| Lighthouse / Core Web Vitals                               | NOT TESTED | Chưa chạy công cụ đo; không công bố điểm                                                                 |
| Safari, Firefox, thiết bị vật lý                           | NOT TESTED | Chỉ Chromium desktop/mobile emulation và viewport matrix                                                 |
| Production deployment / TLS / tải lớn / backup restore     | NOT TESTED | Bàn giao local; xem KNOWN_ISSUES.md                                                                      |
| E2E thao tác riêng từng form CMS / địa chỉ / đổi mật khẩu  | NOT TESTED | Có implementation; API và component dùng chung được kiểm tra, chưa E2E mọi form riêng lẻ                 |
| db:reset xóa và seed lại toàn bộ                           | NOT TESTED | Có guard và script, không xóa database đã seed chỉ để lặp kiểm tra                                       |

## 25 tình huống kiểm thử bắt buộc

| #   | Tình huống                                      | Kết quả | Nơi xác minh                                               |
| --- | ----------------------------------------------- | ------- | ---------------------------------------------------------- |
| 1   | Đăng ký thành công                              | PASS    | API + E2E                                                  |
| 2   | Đăng ký trùng email                             | PASS    | API                                                        |
| 3   | Đăng nhập đúng                                  | PASS    | API + E2E Admin                                            |
| 4   | Đăng nhập sai                                   | PASS    | API                                                        |
| 5   | Khách không truy cập Admin API                  | PASS    | API visitor và Customer                                    |
| 6   | Tìm kiếm đúng                                   | PASS    | SKU API, từ khóa E2E                                       |
| 7   | Lọc / sort đúng                                 | PASS    | API + E2E                                                  |
| 8   | Thêm giỏ hàng                                   | PASS    | API + E2E                                                  |
| 9   | Không thêm vượt tồn                             | PASS    | API                                                        |
| 10  | Đổi số lượng giỏ                                | PASS    | API                                                        |
| 11  | Đặt hàng thành công                             | PASS    | API + E2E                                                  |
| 12  | Đặt hàng hết hàng                               | PASS    | API                                                        |
| 13  | Gửi đơn trùng                                   | PASS    | API gửi lại và gửi đồng thời cùng idempotency key          |
| 14  | Tính giảm giá và tổng tiền                      | PASS    | API quote và kiểm tra arithmetic toàn bộ đơn               |
| 15  | Hủy hợp lệ                                      | PASS    | API + E2E                                                  |
| 16  | Không hủy đơn hoàn tất                          | PASS    | API                                                        |
| 17  | Hoàn tồn đúng khi hủy                           | PASS    | API hoàn một lần                                           |
| 18  | Không xem đơn người khác                        | PASS    | API                                                        |
| 19  | Admin tạo sản phẩm                              | PASS    | API + E2E, có kiểm tra sửa mô tả dài                       |
| 20  | Admin điều chỉnh tồn                            | PASS    | API, kiểm tra reason và không âm                           |
| 21  | Admin đổi trạng thái                            | PASS    | API toàn bộ chuỗi và chuyển sai bị từ chối                 |
| 22  | Dashboard đúng dữ liệu                          | PASS    | API so với MySQL aggregate                                 |
| 23  | Upload file không hợp lệ                        | PASS    | MIME không hợp lệ và PNG giả; ảnh WebP thật được chấp nhận |
| 24  | Các trang hoạt động mobile                      | PASS    | Ba luồng E2E ở iPhone 13 emulation + matrix 360–1920       |
| 25  | Không lỗi JavaScript nghiêm trọng ở luồng chính | PASS    | Các E2E thu pageerror và đối chiếu mảng rỗng               |

Kiểm tra bổ sung: CSRF/Origin, refresh token replay, logout thu hồi phiên, khóa tài khoản thu hồi phiên ngay, recovery token dùng một lần, review phải có đơn hoàn tất, ẩn review cập nhật rating, hồ sơ Admin không lộ password/token, focus modal không bị mất khi nhập.

## Đối chiếu dữ liệu sau khi dọn dữ liệu QA

| Dữ liệu     | Tối thiểu | Thực tế |
| ----------- | --------: | ------: |
| Danh mục    |         8 |       8 |
| Thương hiệu |        12 |      12 |
| Sản phẩm    |       150 |     150 |
| Khách hàng  |        50 |      50 |
| Địa chỉ     |        70 |      70 |
| Đơn hàng    |       250 |     250 |
| Đánh giá    |       300 |     300 |
| Voucher     |        15 |      15 |
| Banner      |         8 |       8 |
| Bài viết    |        20 |      20 |
| Thông báo   |       100 |     100 |
| Lịch sử kho |       200 |     795 |

`db:check` xác nhận toàn bộ đơn khớp subtotal/discount/shipping/total; review liên kết đúng chủ đơn COMPLETED có sản phẩm; tổng biến động kho khớp stock; ảnh sản phẩm tồn tại trên đĩa. Test tự dọn dữ liệu của chính test, không reset bộ seed hoặc sửa dữ liệu MySQL80 có sẵn.

## Bằng chứng giao diện

Ảnh ở [screenshots](screenshots): home/admin tại 6 chiều rộng; toàn trang home, admin và đơn hàng sau hủy ở desktop/mobile. Ảnh dùng reduced-motion để quan sát bố cục. Các animation được giữ trong ứng dụng cho người dùng không yêu cầu giảm chuyển động.

Trình duyệt tích hợp không khả dụng trong phiên; Playwright Chromium local được dùng thay thế. [KNOWN_ISSUES.md](KNOWN_ISSUES.md) ghi finding dependency, các tích hợp demo và các hạng mục chưa xác minh.
