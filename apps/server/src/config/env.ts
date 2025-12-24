import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().url(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Session
  SESSION_DURATION_DAYS: z.coerce.number().default(7),
  
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
  TURNSTILE_SECRET_KEY: z.string().default('1x0000000000000000000000000000000AA'), // Test key for dev
  
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  
  // Video Processing
  MAX_VIDEO_DURATION_MS: z.coerce.number().default(1800000), // 30 minutes
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(500),
  TEMP_DIR: z.string().default('./temp'),
  OUTPUT_DIR: z.string().default('./output'),
  
  // Video Download (Cobalt API)
  COBALT_API_URL: z.string().url().optional(), // Self-hosted Cobalt API URL
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
