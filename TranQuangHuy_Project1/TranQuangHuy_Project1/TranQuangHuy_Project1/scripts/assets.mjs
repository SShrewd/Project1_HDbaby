import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const dest = resolve(root, 'frontend/public/assets');
await mkdir(dest, { recursive: true });
const generated = 'C:/Users/Admin/.codex/generated_images/01a19528-e6cd-7130-ba15-5bf9a30c3de2';
await sharp(resolve(generated, 'exec-adf9e24b-c915-4a73-880f-87df8c515f86.png'))
  .resize(1536)
  .webp({ quality: 85 })
  .toFile(resolve(dest, 'hero.webp'));
const contact = resolve(generated, 'exec-3af0e989-5941-4ebe-90f9-4345bd39a278.png');
const meta = await sharp(contact).metadata();
const w = Math.floor(meta.width / 4),
  h = Math.floor(meta.height / 2);
for (let i = 0; i < 8; i++) {
  const part = {
    left: (i % 4) * w,
    top: Math.floor(i / 4) * h,
    width: w,
    height: h,
  };
  const buffer = await sharp(contact).extract(part).png().toBuffer();
  await sharp(buffer)
    .resize(560, 560, { fit: 'contain', background: '#fff' })
    .webp({ quality: 90 })
    .toFile(resolve(dest, `product-${i}.webp`));
  await sharp(buffer)
    .resize(650, 650, { fit: 'cover', position: 'centre' })
    .webp({ quality: 90 })
    .toFile(resolve(dest, `product-${i}-detail.webp`));
}
console.log('Created hero and 16 local WebP product assets.');
