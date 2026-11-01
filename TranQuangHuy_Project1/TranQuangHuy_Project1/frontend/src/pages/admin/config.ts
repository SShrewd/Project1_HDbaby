export type Row = Record<string, unknown> & { id: number };
export interface Field {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'boolean' | 'date' | 'image' | 'select';
  required?: boolean;
  options?: { value: string | number; label: string }[];
  default?: string | number | boolean;
  min?: number;
  max?: number;
}
export interface ResourceConfig {
  title: string;
  singular: string;
  description: string;
  columns: { key: string; label: string }[];
  fields: Field[];
  canCreate: boolean;
  canDelete: boolean;
}
const active: Field = {
  key: 'active',
  label: 'Đang hiển thị / hoạt động',
  type: 'boolean',
  default: true,
};
const position: Field = {
  key: 'position',
  label: 'Thứ tự hiển thị',
  type: 'number',
  default: 0,
  min: 0,
};
const named: Field[] = [
  { key: 'name', label: 'Tên', required: true },
  { key: 'slug', label: 'Slug (chữ thường, số, dấu -)', required: true },
];
export const resourceConfigs: Record<string, ResourceConfig> = {
  categories: {
    title: 'Danh mục sản phẩm',
    singular: 'danh mục',
    description: 'Sắp xếp những lựa chọn để ba mẹ tìm kiếm dễ dàng hơn.',
    columns: [
      { key: 'name', label: 'Tên danh mục' },
      { key: 'slug', label: 'Slug' },
      { key: 'position', label: 'Thứ tự' },
      { key: 'active', label: 'Hiển thị' },
    ],
    fields: [
      ...named,
      {
        key: 'image',
        label: 'Ảnh danh mục',
        type: 'image',
        default: '/assets/product-0.webp',
      },
      position,
      active,
    ],
    canCreate: true,
    canDelete: true,
  },
  brands: {
    title: 'Thương hiệu',
    singular: 'thương hiệu',
    description: 'Thông tin thương hiệu mô phỏng trong danh mục HDbaby.',
    columns: [
      { key: 'name', label: 'Thương hiệu' },
      { key: 'origin', label: 'Xuất xứ' },
      { key: 'position', label: 'Thứ tự' },
      { key: 'active', label: 'Hiển thị' },
    ],
    fields: [...named, { key: 'origin', label: 'Xuất xứ', required: true }, position, active],
    canCreate: true,
    canDelete: true,
  },
  vouchers: {
    title: 'Mã ưu đãi',
    singular: 'voucher',
    description: 'Thiết lập điều kiện và theo dõi lượt sử dụng mã ưu đãi.',
    columns: [
      { key: 'code', label: 'Mã voucher' },
      { key: 'type', label: 'Loại' },
      { key: 'value', label: 'Giá trị' },
      { key: 'used', label: 'Đã dùng' },
      { key: 'expiresAt', label: 'Hết hạn' },
      { key: 'active', label: 'Hoạt động' },
    ],
    fields: [
      { key: 'code', label: 'Mã voucher', required: true },
      {
        key: 'type',
        label: 'Loại ưu đãi',
        type: 'select',
        options: [
          { value: 'PERCENT', label: 'Phần trăm' },
          { value: 'FIXED', label: 'Số tiền cố định' },
        ],
        default: 'PERCENT',
      },
      {
        key: 'value',
        label: 'Giá trị (%, hoặc VND)',
        type: 'number',
        min: 1,
        default: 10,
      },
      {
        key: 'maxDiscount',
        label: 'Giảm tối đa (VND)',
        type: 'number',
        min: 0,
        default: 100000,
      },
      {
        key: 'minOrder',
        label: 'Đơn tối thiểu (VND)',
        type: 'number',
        min: 0,
        default: 199000,
      },
      { key: 'startsAt', label: 'Ngày bắt đầu', type: 'date', required: true },
      { key: 'expiresAt', label: 'Ngày hết hạn', type: 'date', required: true },
      {
        key: 'limit',
        label: 'Tổng lượt sử dụng tối đa',
        type: 'number',
        min: 1,
        default: 100,
      },
      {
        key: 'perUser',
        label: 'Số lượt mỗi tài khoản',
        type: 'number',
        min: 1,
        default: 1,
      },
      active,
    ],
    canCreate: true,
    canDelete: true,
  },
  banners: {
    title: 'Banner trang chủ',
    singular: 'banner',
    description: 'Nội dung xuất hiện trên website được cập nhật ngay sau khi lưu.',
    columns: [
      { key: 'title', label: 'Tiêu đề' },
      { key: 'position', label: 'Thứ tự' },
      { key: 'link', label: 'Liên kết' },
      { key: 'active', label: 'Hiển thị' },
    ],
    fields: [
      { key: 'title', label: 'Tiêu đề', required: true },
      {
        key: 'subtitle',
        label: 'Nội dung ngắn',
        type: 'textarea',
        required: true,
      },
      {
        key: 'image',
        label: 'Ảnh banner',
        type: 'image',
        default: '/assets/hero.webp',
      },
      {
        key: 'link',
        label: 'Đường dẫn nội bộ',
        default: '/products',
        required: true,
      },
      position,
      active,
    ],
    canCreate: true,
    canDelete: true,
  },
  articles: {
    title: 'Góc của ba mẹ',
    singular: 'bài viết',
    description: 'Biên tập cẩm nang và nội dung chia sẻ với ba mẹ.',
    columns: [
      { key: 'title', label: 'Tiêu đề bài viết' },
      { key: 'createdAt', label: 'Ngày tạo' },
      { key: 'active', label: 'Hiển thị' },
    ],
    fields: [
      { key: 'title', label: 'Tiêu đề', required: true },
      { key: 'slug', label: 'Slug', required: true },
      { key: 'excerpt', label: 'Mô tả ngắn', type: 'textarea', required: true },
      {
        key: 'content',
        label: 'Nội dung (văn bản thuần, xuống dòng để chia đoạn)',
        type: 'textarea',
        required: true,
      },
      {
        key: 'image',
        label: 'Ảnh bài viết',
        type: 'image',
        default: '/assets/hero.webp',
      },
      active,
    ],
    canCreate: true,
    canDelete: true,
  },
  faqs: {
    title: 'Câu hỏi thường gặp',
    singular: 'câu hỏi',
    description: 'Những câu trả lời rõ ràng, gần gũi với ba mẹ.',
    columns: [
      { key: 'question', label: 'Câu hỏi' },
      { key: 'position', label: 'Thứ tự' },
      { key: 'active', label: 'Hiển thị' },
    ],
    fields: [
      { key: 'question', label: 'Câu hỏi', required: true },
      { key: 'answer', label: 'Câu trả lời', type: 'textarea', required: true },
      position,
      active,
    ],
    canCreate: true,
    canDelete: true,
  },
  customers: {
    title: 'Khách hàng',
    singular: 'khách hàng',
    description: 'Quản lý trạng thái tài khoản và xem lịch sử đơn hàng.',
    columns: [
      { key: 'name', label: 'Khách hàng' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Điện thoại' },
      { key: '_count.orders', label: 'Đơn hàng' },
      { key: 'active', label: 'Hoạt động' },
    ],
    fields: [active],
    canCreate: false,
    canDelete: false,
  },
  reviews: {
    title: 'Đánh giá sản phẩm',
    singular: 'đánh giá',
    description: 'Duyệt và ẩn nhận xét; số sao trung bình được cập nhật theo đánh giá hiển thị.',
    columns: [
      { key: 'user.name', label: 'Khách hàng' },
      { key: 'product.name', label: 'Sản phẩm' },
      { key: 'rating', label: 'Sao' },
      { key: 'content', label: 'Nội dung' },
      { key: 'visible', label: 'Hiển thị' },
    ],
    fields: [
      {
        key: 'visible',
        label: 'Hiển thị đánh giá',
        type: 'boolean',
        default: true,
      },
    ],
    canCreate: false,
    canDelete: false,
  },
  contacts: {
    title: 'Hộp thư liên hệ',
    singular: 'tin nhắn',
    description: 'Đọc lời nhắn và lưu ghi chú phản hồi nội bộ. Không gửi email tự động.',
    columns: [
      { key: 'name', label: 'Người gửi' },
      { key: 'email', label: 'Email' },
      { key: 'message', label: 'Lời nhắn' },
      { key: 'resolved', label: 'Đã xử lý' },
    ],
    fields: [
      {
        key: 'reply',
        label: 'Ghi chú phản hồi nội bộ',
        type: 'textarea',
        required: true,
      },
      { key: 'resolved', label: 'Đã xử lý', type: 'boolean', default: false },
    ],
    canCreate: false,
    canDelete: false,
  },
};
export const productFields: Field[] = [
  { key: 'name', label: 'Tên sản phẩm', required: true },
  { key: 'slug', label: 'Slug', required: true },
  { key: 'sku', label: 'SKU duy nhất', required: true },
  { key: 'categoryId', label: 'Danh mục', type: 'select', required: true },
  { key: 'brandId', label: 'Thương hiệu', type: 'select', required: true },
  {
    key: 'age',
    label: 'Nhóm tuổi trên nhãn mô phỏng',
    type: 'select',
    default: '6-12',
    options: ['0-6', '6-12', '12-24', '24-36', '36+'].map((value) => ({
      value,
      label: `${value} tháng`,
    })),
  },
  {
    key: 'price',
    label: 'Giá bán (VND)',
    type: 'number',
    min: 1000,
    default: 159000,
  },
  {
    key: 'originalPrice',
    label: 'Giá gốc (VND, 0 nếu không giảm)',
    type: 'number',
    min: 0,
    default: 0,
  },
  {
    key: 'stock',
    label: 'Tồn kho ban đầu',
    type: 'number',
    min: 0,
    default: 0,
  },
  {
    key: 'packaging',
    label: 'Quy cách đóng gói',
    default: '400g',
    required: true,
  },
  {
    key: 'origin',
    label: 'Xuất xứ mô phỏng',
    default: 'Việt Nam',
    required: true,
  },
  {
    key: 'description',
    label: 'Mô tả sản phẩm',
    type: 'textarea',
    required: true,
  },
  { key: 'ingredients', label: 'Thành phần', type: 'textarea', required: true },
  {
    key: 'nutrition',
    label: 'Dữ liệu dinh dưỡng minh họa',
    type: 'textarea',
    default: 'Dữ liệu minh họa cho đồ án, không phải công bố dinh dưỡng.',
    required: true,
  },
  {
    key: 'usage',
    label: 'Hướng dẫn sử dụng',
    type: 'textarea',
    required: true,
  },
  {
    key: 'storage',
    label: 'Hướng dẫn bảo quản',
    type: 'textarea',
    default: 'Nơi khô ráo, thoáng mát. Đóng kín sau khi mở.',
    required: true,
  },
  {
    key: 'warning',
    label: 'Cảnh báo',
    type: 'textarea',
    default: 'Dữ liệu demo. Đọc nhãn thực tế trước khi sử dụng. Không có tác dụng điều trị bệnh.',
    required: true,
  },
  {
    key: 'featured',
    label: 'Sản phẩm nổi bật',
    type: 'boolean',
    default: false,
  },
  active,
];
