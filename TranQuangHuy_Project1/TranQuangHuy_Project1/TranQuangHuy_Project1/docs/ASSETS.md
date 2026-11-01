# Tài nguyên hình ảnh và font

Ảnh do công cụ **image_gen built-in**, qua skill imagegen, tạo riêng cho đồ án. Không dùng CLI/API key và không dùng ảnh thương hiệu thật. Các bao bì là thiết kế hư cấu, không phải ảnh chứng nhận hàng hóa đang phân phối. Mọi trang sản phẩm có nhãn dữ liệu minh họa.

Tệp cuối trong repository:

- `frontend/public/assets/hero.webp`: hình mẹ và bé, 1536px.
- `frontend/public/assets/product-0.webp` đến `product-7.webp`: 8 loại bao bì.
- `frontend/public/assets/product-0-detail.webp` đến `product-7-detail.webp`: ảnh cận từ cùng bộ bao bì; không phải ảnh một mặt bao bì khác.
- `frontend/public/favicon.svg`: biểu tượng vector do mã nguồn tạo.

Sheet 8 sản phẩm được tách ô, resize và encode WebP bằng `scripts/assets.mjs`. Ảnh đã có sẵn, không cần chạy lại script này để cài đặt/chạy ứng dụng. Script tái tạo asset chỉ phục vụ môi trường tạo ảnh ban đầu vì tham chiếu đến đường dẫn ảnh gốc của phiên đó.

Prompt cuối cho hình hero:

```text
Use case: ads-marketing. Create a polished editorial photograph for HDbaby, Vietnamese premium baby nutrition ecommerce. Landscape 1536x1024. A loving young Vietnamese mother with a smiling 14-month toddler in a warm ivory linen nursery, soft morning window light, sage green houseplant, little wooden toys, natural candid interaction as toddler holds a spoon near a simple bowl on table. Subjects on center-right, generous softly blurred warm cream negative space left. Premium lifestyle photography, soft peach and warm ivory palette, authentic skin texture. No text, no logos, no watermark. Save generated asset for use in local website project.
```

Prompt cuối cho sheet sản phẩm:

```text
Use case: product-mockup. Asset type: nutrition e-commerce catalog assets contact sheet. Create exactly 8 isolated realistic premium baby food packaging photographs in a 4-column by 2-row uniform grid on pure white. Canvas 1536x1024, each item centered in its own cell with lots of white margin, no items touching edges. Row 1 left to right: 1 cream cylindrical baby formula tin with sage lid and little bear design, 2 peach baby rice cereal box with little bunny, 3 sage green baby puree glass jar with cream lid, 4 pale yellow baby teething biscuits pouch. Row 2 left to right: 5 ivory oat cereal carton with sage typography, 6 lavender small supplement bottle with cream lid, 7 pastel peach toddler milk drink carton, 8 a bundle of 3 small colorful baby food packs. Branding fictional HD baby, minimalist illustration of bear or bunny, tiny category names. Colors warm ivory, peach, sage, muted lavender. Studio product photography, soft subtle natural contact shadows. All products upright front-facing, consistent soft lighting and scale, no watermark, no background elements. This is clearly fictional demo packaging, no medical claims.
```

Font Be Vietnam Pro được đóng gói qua `@fontsource/be-vietnam-pro`; font và giấy phép nằm trong package đó. Website tải font từ cùng origin sau khi Vite build. Icon dùng Lucide React. Không có URL ảnh ngẫu nhiên hoặc yêu cầu dịch vụ tạo ảnh khi sử dụng website.
