import { z } from 'zod';
import * as schemas from './validators/index.js';
type Operation = {
  summary: string;
  tags: string[];
  security?: object[];
  parameters: object[];
  requestBody?: object;
  responses: Record<string, object>;
};
const paths: Record<string, Record<string, Operation>> = {};
const components: Record<string, object> = {};
const definitions: Record<string, z.ZodType> = {
  Register: schemas.register,
  Login: schemas.login,
  Profile: schemas.profile,
  Address: schemas.address,
  CartItem: schemas.cartItem,
  Order: schemas.order,
  Product: schemas.product,
  Category: schemas.category,
  Brand: schemas.brand,
  Voucher: schemas.voucher,
  Banner: schemas.banner,
  Article: schemas.article,
  Faq: schemas.faq,
  Password: z.object({ currentPassword: z.string(), password: schemas.password }),
  Forgot: z.object({ email: z.email() }),
  Reset: z.object({ token: z.string(), password: schemas.password }),
  CartUpdate: z.object({
    quantity: z.number().int().positive().optional(),
    selected: z.boolean().optional(),
  }),
  Wishlist: z.object({ productId: z.number().int().positive() }),
  Review: z.object({
    orderId: z.number().int().positive(),
    productId: z.number().int().positive(),
    rating: z.number().int().min(1).max(5),
    content: z.string().min(10).max(3000),
  }),
  Contact: z.object({
    name: z.string().min(2),
    email: z.email(),
    message: z.string().min(10).max(5000),
  }),
  Newsletter: z.object({ email: z.email() }),
  Status: z.object({
    status: z.enum(['CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED']),
    note: z.string().optional(),
  }),
  Inventory: z.object({
    productId: z.number().int().positive(),
    change: z.number().int(),
    reason: z.string().min(5),
  }),
  CustomerUpdate: z.object({ active: z.boolean() }),
  Moderate: z.object({ visible: z.boolean() }),
  ContactUpdate: z.object({ reply: z.string().min(1), resolved: z.boolean() }),
  Settings: z.object({
    name: z.string(),
    phone: z.string(),
    email: z.email(),
    address: z.string(),
    about: z.string(),
    shippingPolicy: z.string(),
    returnPolicy: z.string(),
    privacyPolicy: z.string(),
  }),
};
for (const [name, schema] of Object.entries(definitions))
  components[name] = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
function add(
  path: string,
  method: string,
  summary: string,
  secured = false,
  body?: string,
  created = false,
  query: string[] = [],
) {
  const parameters: object[] = [...path.matchAll(/\{(\w+)\}/g)].map((m) => ({
    name: m[1],
    in: 'path',
    required: true,
    schema: { type: m[1] === 'slug' ? 'string' : 'integer' },
  }));
  for (const name of query)
    parameters.push({
      name,
      in: 'query',
      schema: {
        type: ['page', 'limit', 'min', 'max', 'days', 'userId', 'productId'].includes(name)
          ? 'integer'
          : 'string',
      },
    });
  if (method !== 'get')
    parameters.push({
      name: 'X-CSRF-Token',
      in: 'header',
      required: true,
      schema: { type: 'string' },
      description: 'Lấy token từ GET /api/csrf, giữ cookie cùng phiên.',
    });
  if (path === '/api/orders' && method === 'post')
    parameters.push({
      name: 'Idempotency-Key',
      in: 'header',
      required: true,
      schema: { type: 'string', minLength: 8, maxLength: 100 },
      example: 'checkout-unique-uuid',
    });
  const operation: Operation = {
    summary,
    tags: [
      path.includes('/admin/') ? 'Admin' : path.includes('/auth/') ? 'Authentication' : 'Shop',
    ],
    parameters,
    ...(secured ? { security: [{ cookieAuth: [] }] } : {}),
    ...(body
      ? {
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: `#/components/schemas/${body}` } } },
          },
        }
      : {}),
    responses: {
      [created ? '201' : '200']: {
        description: 'Thành công',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['data'],
              properties: {
                data: {
                  description:
                    'Dữ liệu trả về; danh sách phân trang là {items,total,page,limit,pages}.',
                },
              },
            },
          },
        },
      },
      '400': { description: 'Dữ liệu đầu vào không hợp lệ; {error:{message,issues}}' },
      '401': { description: 'Cần đăng nhập' },
      '403': { description: 'Không đủ quyền hoặc CSRF / Origin không hợp lệ' },
      '404': { description: 'Không tìm thấy dữ liệu hoặc không thuộc tài khoản' },
      '409': { description: 'Trùng dữ liệu, giá / kho thay đổi hoặc trạng thái không hợp lệ' },
      '429': { description: 'Vượt giới hạn yêu cầu' },
    },
  };
  paths[path] ??= {};
  paths[path][method] = operation;
}
const paging = ['page', 'limit', 'q'];
const filters = [
  ...paging,
  'category',
  'brand',
  'age',
  'min',
  'max',
  'stock',
  'sort',
  'featured',
  'sale',
];
for (const [method, path, title, body] of [
  ['post', 'register', 'Đăng ký', 'Register'],
  ['post', 'login', 'Đăng nhập', 'Login'],
  ['post', 'logout', 'Thu hồi phiên đăng nhập', ''],
  ['post', 'refresh', 'Xoay refresh token, thu hồi token cũ', ''],
  ['get', 'me', 'Hồ sơ hoặc null khi khách vãng lai', ''],
  ['patch', 'profile', 'Cập nhật hồ sơ', 'Profile'],
  ['patch', 'change-password', 'Đổi mật khẩu, thu hồi mọi phiên', 'Password'],
  ['post', 'forgot-password', 'Ghi thư khôi phục vào hộp thư local trong chế độ demo', 'Forgot'],
  ['post', 'reset-password', 'Khôi phục mật khẩu bằng token dùng một lần', 'Reset'],
])
  add(
    `/api/auth/${path}`,
    method,
    title,
    ['profile', 'change-password'].includes(path),
    body || undefined,
    path === 'register',
  );
for (const path of ['products', 'products/search', 'products/featured', 'products/bestsellers'])
  add(`/api/${path}`, 'get', path, false, undefined, false, filters);
for (const path of [
  'products/{slug}',
  'categories',
  'brands',
  'content',
  'articles/{slug}',
  'reviews/{id}',
  'csrf',
  'health',
])
  add(`/api/${path}`, 'get', path);
add('/api/articles', 'get', 'Danh sách cẩm nang', false, undefined, false, paging);
add('/api/cart', 'get', 'Giỏ hàng đồng bộ tài khoản', true);
add('/api/cart/items', 'post', 'Thêm hoặc tăng số lượng trong giỏ', true, 'CartItem', true);
add('/api/cart/items/{id}', 'patch', 'Thay số lượng hoặc chọn sản phẩm', true, 'CartUpdate');
add('/api/cart/items/{id}', 'delete', 'Xóa khỏi giỏ hàng', true);
add('/api/addresses', 'get', 'Địa chỉ của tài khoản', true);
add('/api/addresses', 'post', 'Thêm địa chỉ', true, 'Address', true);
add('/api/addresses/{id}', 'patch', 'Sửa địa chỉ', true, 'Address');
add('/api/addresses/{id}', 'delete', 'Xóa địa chỉ', true);
add('/api/wishlist', 'get', 'Danh sách yêu thích', true);
add('/api/wishlist', 'post', 'Lưu yêu thích', true, 'Wishlist', true);
add('/api/wishlist/{id}', 'delete', 'Bỏ yêu thích; id là productId', true);
add('/api/my-reviews', 'get', 'Đánh giá của tài khoản', true);
add('/api/reviews', 'post', 'Tạo hoặc sửa đánh giá từ đơn hoàn tất', true, 'Review', true);
add('/api/notifications', 'get', 'Thông báo của tài khoản', true);
add('/api/notifications/{id}', 'patch', 'Đánh dấu đã đọc', true);
add('/api/orders/quote', 'post', 'Kiểm tra giá, voucher, tồn kho và tính tiền', true, 'Order');
add(
  '/api/orders',
  'post',
  'Tạo đơn trong transaction; bắt buộc Idempotency-Key',
  true,
  'Order',
  true,
);
add('/api/orders/my', 'get', 'Đơn hàng của tài khoản', true, undefined, false, [
  ...paging,
  'status',
]);
add('/api/orders/{id}', 'get', 'Chi tiết đơn của tài khoản', true);
add('/api/orders/{id}/cancel', 'patch', 'Hủy hợp lệ và hoàn kho đúng một lần', true);
add('/api/contacts', 'post', 'Lưu lời nhắn hỗ trợ', false, 'Contact', true);
add('/api/newsletter', 'post', 'Đăng ký nhận tin', false, 'Newsletter', true);
const crud = [
  ['products', 'Product'],
  ['categories', 'Category'],
  ['brands', 'Brand'],
  ['vouchers', 'Voucher'],
  ['banners', 'Banner'],
  ['articles', 'Article'],
  ['faqs', 'Faq'],
];
for (const [resource, schema] of crud) {
  add(
    `/api/admin/${resource}`,
    'get',
    `Danh sách ${resource}`,
    true,
    undefined,
    false,
    resource === 'products' ? [...filters, 'low'] : paging,
  );
  add(`/api/admin/${resource}`, 'post', `Tạo ${resource}`, true, schema, true);
  add(`/api/admin/${resource}/{id}`, 'patch', `Cập nhật ${resource}`, true, schema);
  add(`/api/admin/${resource}/{id}`, 'delete', `Ẩn ${resource}; banner / FAQ xóa cứng`, true);
}
for (const [resource, schema] of [
  ['customers', 'CustomerUpdate'],
  ['reviews', 'Moderate'],
  ['contacts', 'ContactUpdate'],
]) {
  add(`/api/admin/${resource}`, 'get', `Danh sách ${resource}`, true, undefined, false, paging);
  add(`/api/admin/${resource}/{id}`, 'patch', `Cập nhật ${resource}`, true, schema);
}
for (const path of ['orders/{id}', 'products/{id}', 'customers/{id}'])
  add(`/api/admin/${path}`, 'get', `Chi tiết ${path}`, true);
add('/api/admin/orders', 'get', 'Danh sách đơn hàng', true, undefined, false, [
  ...paging,
  'status',
  'userId',
]);
add(
  '/api/admin/orders/{id}/status',
  'patch',
  'Chuyển trạng thái hợp lệ và ghi lịch sử',
  true,
  'Status',
);
add('/api/admin/inventory', 'get', 'Lịch sử kho', true, undefined, false, [...paging, 'productId']);
add('/api/admin/inventory', 'post', 'Điều chỉnh tồn kho và ghi lý do', true, 'Inventory', true);
add('/api/admin/settings', 'get', 'Cấu hình cửa hàng', true);
add('/api/admin/settings', 'patch', 'Cập nhật cấu hình', true, 'Settings');
for (const path of ['dashboard', 'report.csv'])
  add(`/api/admin/${path}`, 'get', path, true, undefined, false, ['days']);
add(
  '/api/admin/uploads',
  'post',
  'Upload nhiều ảnh (tối đa 10 ảnh, 5 MB/ảnh)',
  true,
  undefined,
  true,
);
paths['/api/admin/uploads'].post.requestBody = {
  required: true,
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        required: ['images'],
        properties: {
          images: { type: 'array', maxItems: 10, items: { type: 'string', format: 'binary' } },
        },
      },
    },
  },
};
paths['/api/admin/report.csv'].get.responses['200'] = {
  description: 'CSV báo cáo doanh thu, đơn hàng và khách mới',
  content: { 'text/csv': { schema: { type: 'string' } } },
};
export const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'HDbaby API',
    version: '1.0.0',
    description:
      'REST API dùng MySQL. Chi tiết nghiệp vụ và ví dụ: docs/API.md. Mọi mutation cần cookie CSRF và header X-CSRF-Token; đơn hàng cần Idempotency-Key. Giá tiền VND trong response được serialize thành chuỗi.',
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access' } },
    schemas: components,
  },
  paths,
};
