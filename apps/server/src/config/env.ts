import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT (Required - NO DEFAULTS for secrets)
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default("vibe-creator-api"),
  JWT_AUDIENCE: z.string().default("vibe-creator-web"),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),

  // JWT Key Ring (for cryptographic signing)
  JWT_SIGNING_KEY_ID: z.string().optional(),
  JWT_SIGNING_KEY: z.union([z.string(), z.record(z.unknown())]).optional(),
  JWT_VERIFY_KEYS: z
    .union([z.string(), z.array(z.record(z.unknown()))])
    .optional(),

  // Session (legacy, kept for backward compatibility during migration)
  SESSION_DURATION_DAYS: z.coerce.number().default(7),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default("vibe-creator"),
  R2_PUBLIC_URL: z.string().optional(),

  // Xendit
  XENDIT_SECRET_KEY: z.string().optional(),
  XENDIT_WEBHOOK_TOKEN: z.string().optional(),

  // Cloudflare Turnstile
  TURNSTILE_SECRET_KEY: z
    .string()
    .default("1x0000000000000000000000000000000AA"), // Test key for dev

  // App
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Video Processing
  MAX_VIDEO_DURATION_MS: z.coerce.number().default(3600000), // 60 minutes
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(2048), // 2GB
  TEMP_DIR: z.string().default("./temp"),
  OUTPUT_DIR: z.string().default("./output"),
  MEDIA_INPUT_DIR: z.string().default("./uploads"),

  // Video Download (Cobalt API)
  COBALT_API_URL: z.string().url().optional(), // Self-hosted Cobalt API URL

  // SaveSora API for downloading Sora videos
  SAVESORA_API_KEY: z.string().optional(),

  // AI Keys
  OPENAI_API_KEY: z.string().min(1).optional(),

  // Testing - disable rate limiting for E2E tests
  DISABLE_RATE_LIMIT: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((val) => val === "true" || val === "1"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
