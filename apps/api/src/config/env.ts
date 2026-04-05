import { z } from 'zod';
import 'dotenv/config';
import { optionalNonEmptyStringSchema, optionalUrlSchema } from './env.utils';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.url(),

  // Redis
  REDIS_URL: z.url(),

  // JWT (Required - NO DEFAULTS for secrets)
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default('vibe-creator-api'),
  JWT_AUDIENCE: z.string().default('vibe-creator-web'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // JWT Key Ring (for cryptographic signing)
  JWT_SIGNING_KEY_ID: z.string().optional(),
  JWT_SIGNING_KEY: z.union([z.string(), z.record(z.string(), z.unknown())]),
  JWT_VERIFY_KEYS: z.union([z.string(), z.array(z.record(z.string(), z.unknown()))]).optional(),

  // Session (legacy, kept for backward compatibility during migration)
  ENABLE_LEGACY_SESSION_AUTH: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((val) => val === 'true' || val === '1'),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default('vibe-creator'),
  R2_PUBLIC_URL: z.string().optional(),

  // Xendit
  XENDIT_SECRET_KEY: z.string().optional(),
  XENDIT_WEBHOOK_TOKEN: z.string().optional(),

  // Cloudflare Turnstile
  TURNSTILE_SECRET_KEY: optionalNonEmptyStringSchema,

  // App
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.url(),

  // Video Processing
  MAX_VIDEO_DURATION_MS: z.coerce.number().default(3600000), // 60 minutes
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(2048), // 2GB
  TEMP_DIR: z.string().default('./temp'),
  OUTPUT_DIR: z.string().default('./output'),
  MEDIA_INPUT_DIR: z.string().default('./uploads'),

  // Video Download (Cobalt API)
  COBALT_API_URL: optionalUrlSchema, // Self-hosted Cobalt API URL

  // SaveSora API for downloading Sora videos
  SAVESORA_API_KEY: z.string().optional(),

  // AI Keys
  AI_COPY_PROVIDER: z.enum(['auto', 'openai', 'ollama']).default('openai'),
  OPENAI_API_KEY: optionalNonEmptyStringSchema,
  OLLAMA_BASE_URL: optionalUrlSchema,
  OLLAMA_MODEL: z.string().min(1).default('qwen3:14b'),
  WHISPER_MODEL_SIZE: z
    .enum(['tiny', 'base', 'small', 'medium', 'large-v2', 'large-v3'])
    .default('small'),

  // Testing - disable rate limiting for E2E tests
  RATE_LIMIT_TEST_MODE: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((val) => val === 'true' || val === '1'),

  ENABLE_SWAGGER: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((val) => val === 'true' || val === '1'),
  SWAGGER_ALLOWED_IPS: z.string().optional(),
});

const parsed = envSchema
  .superRefine((data, ctx) => {
    if (data.AI_COPY_PROVIDER === 'ollama' && !data.OLLAMA_BASE_URL) {
      ctx.addIssue({
        code: 'custom',
        message: 'OLLAMA_BASE_URL is required when AI_COPY_PROVIDER is set to ollama',
        path: ['OLLAMA_BASE_URL'],
      });
    }

    if (data.NODE_ENV !== 'development' && !data.TURNSTILE_SECRET_KEY) {
      ctx.addIssue({
        code: 'custom',
        message: 'TURNSTILE_SECRET_KEY is required outside development',
        path: ['TURNSTILE_SECRET_KEY'],
      });
    }

    if (data.NODE_ENV !== 'development' && !data.XENDIT_WEBHOOK_TOKEN) {
      ctx.addIssue({
        code: 'custom',
        message: 'XENDIT_WEBHOOK_TOKEN is required outside development',
        path: ['XENDIT_WEBHOOK_TOKEN'],
      });
    }

    if (data.NODE_ENV !== 'development' && !data.XENDIT_SECRET_KEY) {
      ctx.addIssue({
        code: 'custom',
        message: 'XENDIT_SECRET_KEY is required outside development',
        path: ['XENDIT_SECRET_KEY'],
      });
    }

    if (data.NODE_ENV === 'production' && data.ENABLE_SWAGGER) {
      if (!data.SWAGGER_ALLOWED_IPS) {
        ctx.addIssue({
          code: 'custom',
          message: 'SWAGGER_ALLOWED_IPS is required when ENABLE_SWAGGER is true',
          path: ['SWAGGER_ALLOWED_IPS'],
        });
      }
    }
  })
  .safeParse(process.env);

if (!parsed.success) {
  // Fail fast per Digitesia Standard (console forbidden, but env validation is critical)
  process.stderr.write('❌ Invalid environment variables:\n');
  process.stderr.write(`${JSON.stringify(parsed.error.issues, null, 2)}\n`);
  process.exit(1);
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
