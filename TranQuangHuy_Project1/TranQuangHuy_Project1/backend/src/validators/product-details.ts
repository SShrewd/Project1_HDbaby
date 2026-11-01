import { z } from 'zod';
const line=z.string().trim().min(1).max(1000);
export const productDetailsSchema=z.object({
  version:z.literal(1),
  summary:line,
  highlights:z.array(line).min(1).max(6),
  flavor:line,
  texture:line,
  allergens:z.array(line).max(8),
  allergenNote:line,
  preparation:z.array(line).min(1).max(8),
  storage:z.object({sealed:line,opened:line,prepared:line}),
  nutrition:z.object({basis:z.enum(['100g','100ml','individual']),rows:z.array(z.object({label:line,value:z.number().finite().min(0).max(10000),unit:z.enum(['g','mg','kcal'])})).max(12),note:line}).refine(n=>n.basis==='individual'||n.rows.length>0,'Bảng dinh dưỡng cần có chỉ tiêu'),
  contents:z.array(z.object({name:line,quantity:z.number().int().min(1).max(100),packaging:line})).max(10),
  faq:z.array(z.object({question:line,answer:line})).min(1).max(6),
  sourceNote:line,
});
export type ProductDetails=z.infer<typeof productDetailsSchema>;
