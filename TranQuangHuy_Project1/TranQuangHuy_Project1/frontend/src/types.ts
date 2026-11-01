export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'CUSTOMER';
  active: boolean;
  createdAt: string;
}
export interface Category {
  id: number;
  name: string;
  slug: string;
  image: string;
  active: boolean;
  position: number;
}
export interface Brand {
  id: number;
  name: string;
  slug: string;
  origin: string;
  active: boolean;
  position: number;
}
export interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  categoryId: number;
  brandId: number;
  category: Category;
  brand: Brand;
  age: string;
  price: string;
  originalPrice: string | null;
  stock: number;
  active: boolean;
  featured: boolean;
  sold: number;
  rating: number;
  description: string;
  ingredients: string;
  nutrition: string;
  usage: string;
  storage: string;
  warning: string;
  details?:ProductDetails|null;
  packaging: string;
  origin: string;
  createdAt: string;
  images: { id: number; url: string; position: number }[];
  reviews?: Review[];
}
export interface ProductDetails {
 version:1;summary:string;highlights:string[];flavor:string;texture:string;allergens:string[];allergenNote:string;preparation:string[];
 storage:{sealed:string;opened:string;prepared:string};
 nutrition:{basis:'100g'|'100ml'|'individual';rows:{label:string;value:number;unit:'g'|'mg'|'kcal'}[];note:string};
 contents:{name:string;quantity:number;packaging:string}[];
 faq:{question:string;answer:string}[];sourceNote:string;
}
export interface Review {
  id: number;
  userId: number;
  productId: number;
  orderId: number;
  rating: number;
  content: string;
  visible: boolean;
  createdAt: string;
  user?: { name: string };
  product?: Product;
}
export interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  selected: boolean;
  priceAtAdd: string;
  product: Product;
}
export interface Address {
  id: number;
  name: string;
  phone: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}
export type Status = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
export interface OrderItem {
  id: number;
  productId: number;
  name: string;
  sku: string;
  image: string;
  quantity: number;
  price: string;
}
export interface Order {
  id: number;
  code: string;
  status: Status;
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
  recipient: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  note: string;
  delivery: string;
  payment: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
  history: { id: number; status: Status; note: string; createdAt: string }[];
  user?: { name: string; email: string };
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
export interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  createdAt: string;
  active: boolean;
}
export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  position: number;
  active: boolean;
}
export interface Faq {
  id: number;
  question: string;
  answer: string;
  active: boolean;
  position: number;
}
export interface Content {
  banners: Banner[];
  articles: Article[];
  faqs: Faq[];
  settings: Record<string, string>;
  testimonials: { id: number; rating: number; content: string; user: { name: string } }[];
  vouchers: Voucher[];
}
export interface Voucher {
  id: number;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string;
  maxDiscount: string;
  minOrder: string;
  expiresAt: string;
  perUser: number;
}
export interface Notification {
  id: number;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}
export const statusNames: Record<Status, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};
