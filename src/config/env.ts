import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    API_PREFIX: z.string().min(1).default('/api/v1'),
    LOG_LEVEL: z.string().min(1).default('info'),
    DATABASE_URL: z.string().url(),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),

    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),

    ACCESS_TOKEN_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(60).default(14),
    REFRESH_COOKIE_NAME: z.string().min(1).default('dca_books_refresh'),
    REFRESH_COOKIE_PATH: z.string().min(1).default('/api/v1/auth/refresh'),
    COOKIE_SECURE: z.coerce.boolean().default(false),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

    BCRYPT_COST: z.coerce.number().int().min(10).max(14).default(12),

    BOOTSTRAP_TENANT_NAME: z.string().optional(),
    BOOTSTRAP_TENANT_SLUG: z.string().optional(),
    BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
    BOOTSTRAP_ADMIN_PASSWORD: z.string().optional(),
    BOOTSTRAP_ALLOW_PRODUCTION: z.coerce.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production' && !value.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true when NODE_ENV is production',
      });
    }

    if (value.COOKIE_SAME_SITE === 'none' && !value.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SAME_SITE'],
        message: 'COOKIE_SAME_SITE=none requires COOKIE_SECURE=true',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
