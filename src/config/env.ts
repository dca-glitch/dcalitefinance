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
    STORAGE_PROVIDER: z.enum(['LOCAL', 'GOOGLE_DRIVE', 'S3_COMPATIBLE']).default('LOCAL'),
    LOCAL_UPLOAD_DIR: z.string().min(1).default('storage/uploads'),
    GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().min(1).optional(),
    GOOGLE_DRIVE_ROOT_FOLDER_NAME: z.string().min(1).optional(),
    GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
    GOOGLE_DRIVE_PRIVATE_KEY: z.string().min(1).optional(),
    GOOGLE_DRIVE_CLIENT_EMAIL: z.string().email().optional(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
    S3_ENDPOINT: z.string().url().optional(),
    S3_BUCKET: z.string().min(1).optional(),
    S3_REGION: z.string().min(1).default('auto'),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),

    ACCESS_TOKEN_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(60).default(14),
    INVITATION_TOKEN_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(72),
    PASSWORD_RESET_TOKEN_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(2),
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

    if (value.STORAGE_PROVIDER === 'GOOGLE_DRIVE') {
      const hasRootFolder = Boolean(value.GOOGLE_DRIVE_ROOT_FOLDER_ID || value.GOOGLE_DRIVE_ROOT_FOLDER_NAME);
      const hasServiceAccountKey = Boolean(
        value.GOOGLE_APPLICATION_CREDENTIALS ||
          (value.GOOGLE_DRIVE_CLIENT_EMAIL && value.GOOGLE_DRIVE_PRIVATE_KEY) ||
          (value.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL && value.GOOGLE_DRIVE_PRIVATE_KEY),
      );

      if (!hasRootFolder) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['GOOGLE_DRIVE_ROOT_FOLDER_ID'],
          message: 'GOOGLE_DRIVE_ROOT_FOLDER_ID or GOOGLE_DRIVE_ROOT_FOLDER_NAME is required when STORAGE_PROVIDER=GOOGLE_DRIVE',
        });
      }

      if (!hasServiceAccountKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['GOOGLE_DRIVE_PRIVATE_KEY'],
          message: 'Google Drive service account credentials are required when STORAGE_PROVIDER=GOOGLE_DRIVE',
        });
      }
    }

    if (value.STORAGE_PROVIDER === 'S3_COMPATIBLE') {
      const requiredS3Fields: Array<keyof typeof value> = [
        'S3_ENDPOINT',
        'S3_BUCKET',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
      ];

      for (const field of requiredS3Fields) {
        if (!value[field]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is required when STORAGE_PROVIDER=S3_COMPATIBLE`,
          });
        }
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
