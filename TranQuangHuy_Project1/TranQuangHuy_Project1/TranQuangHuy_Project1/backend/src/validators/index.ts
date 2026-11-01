import { z } from 'zod';
import {productDetailsSchema} from './product-details.js';
const longText = z.string().trim().min(1, 'Vui lòng nhập thông tin');
const text = longText.max(191, 'Thông tin tối đa 191 ký tự');
export const phone = z.string().regex(/^(\+84|0)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ');
export const password = z
  .string()
  .min(10, 'Mật khẩu ít nhất 10 ký tự')
  .max(100)
  .regex(/[a-z]/, 'Cần chữ thường')
  .regex(/[A-Z]/, 'Cần chữ hoa')
  .regex(/[0-9]/, 'Cần chữ số')
  .regex(/[^a-zA-Z0-9]/, 'Cần ký tự đặc biệt');
export const profile = z.object({ name: text.min(2), phone });
export const register = profile.extend({
  email: z
    .email()
    .max(191)
    .transform((s) => s.toLowerCase()),
  password,
});
export const login = z.object({
  email: z.email().transform((s) => s.toLowerCase()),
  password: z.string().min(1).max(100),
});
export const address = z.object({
  name: text.min(2),
  phone,
  city: text,
  district: text,
  detail: text.min(5),
  isDefault: z.boolean().default(false),
});
export const cartItem = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(999),
});
export const order = z
  .object({
    recipient: text.min(2),
    phone,
    city: text,
    district: text,
    address: text.min(5),
    note: z.string().max(2000).default(''),
    delivery: z.enum(['standard', 'express']),
    payment: z.enum(['COD', 'BANK_DEMO']),
    voucher: z.string().max(100).default(''),
    items: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          quantity: z.number().int().min(1).max(999),
        }),
      )
      .min(1)
      .max(100),
    expectedTotal: z.number().int().nonnegative().optional(),
  })
  .refine(
    (d) => new Set(d.items.map((x) => x.productId)).size === d.items.length,
    'Sản phẩm trùng trong đơn',
  );
const image = z
  .string()
  .max(191)
  .refine(
    (s) => /^\/(assets|uploads)\/[a-zA-Z0-9._-]+\.(webp|png|jpg|jpeg)$/.test(s),
    'Ảnh phải thuộc dự án',
  );
const slug = text
  .max(191)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang');
export const product = z
  .object({
    name: text,
    slug,
    sku: text.max(100),
    categoryId: z.coerce.number().int().positive(),
    brandId: z.coerce.number().int().positive(),
    age: z.enum(['0-6', '6-12', '12-24', '24-36', '36+']),
    price: z.coerce.number().int().min(1000).max(999999999),
    originalPrice: z.coerce.number().int().min(0).max(999999999).nullable().optional(),
    stock: z.coerce.number().int().min(0).max(1000000).default(0),
    active: z.boolean().default(true),
    featured: z.boolean().default(false),
    description: longText.max(10000),
    ingredients: longText.max(10000),
    nutrition: longText.max(10000),
    usage: longText.max(10000),
    storage: longText.max(10000),
    warning: longText.max(10000),
    details:productDetailsSchema.nullable().optional(),
    packaging: text,
    origin: text,
    images: z.array(image).min(1).max(10),
  })
  .refine((d) => !d.originalPrice || d.originalPrice >= d.price, 'Giá gốc không nhỏ hơn giá bán');
export const category = z.object({
  name: text,
  slug,
  image,
  active: z.boolean().default(true),
  position: z.coerce.number().int().min(0).default(0),
});
export const brand = z.object({
  name: text,
  slug,
  origin: text,
  active: z.boolean().default(true),
  position: z.coerce.number().int().min(0).default(0),
});
export const voucher = z
  .object({
    code: text.max(100).transform((s) => s.toUpperCase()),
    type: z.enum(['PERCENT', 'FIXED']),
    value: z.coerce.number().int().positive().max(999999999),
    maxDiscount: z.coerce.number().int().nonnegative().max(999999999),
    minOrder: z.coerce.number().int().nonnegative().max(999999999),
    startsAt: z.coerce.date(),
    expiresAt: z.coerce.date(),
    limit: z.coerce.number().int().positive(),
    perUser: z.coerce.number().int().positive(),
    active: z.boolean().default(true),
  })
  .refine((d) => d.expiresAt > d.startsAt, 'Ngày hết hạn phải sau ngày bắt đầu')
  .refine((d) => d.type !== 'PERCENT' || d.value <= 100, 'Phần trăm không vượt quá 100');
export const banner = z.object({
  title: text,
  subtitle: longText.max(2000),
  image,
  link: z
    .string()
    .regex(/^\/(?!\/)/)
    .max(255),
  active: z.boolean().default(true),
  position: z.coerce.number().int().min(0).default(0),
});
export const article = z.object({
  title: text,
  slug,
  excerpt: longText.max(2000),
  content: longText.max(50000),
  image,
  active: z.boolean().default(true),
});
export const faq = z.object({
  question: text,
  answer: longText.max(10000),
  active: z.boolean().default(true),
  position: z.coerce.number().int().min(0).default(0),
});
