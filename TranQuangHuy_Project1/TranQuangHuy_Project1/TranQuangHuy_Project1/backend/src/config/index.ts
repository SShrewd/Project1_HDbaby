import 'dotenv/config';
import { z } from 'zod';
export const config = z
  .object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    PORT: z.coerce.number().default(5000),
    CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
    NODE_ENV: z.string().default('development'),
    DEMO_MODE: z.string().default('false'),
    RESET_MAIL_DIR: z.string().default('../.runtime/mail'),
  })
  .parse(process.env);
if (config.NODE_ENV === 'production' && config.DEMO_MODE === 'true')
  throw Error('DEMO_MODE must be disabled in production');
