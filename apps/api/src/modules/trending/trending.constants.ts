/**
 * Trending Module Constants
 * ============================================================================
 * Configuration constants for YouTube-first trending scraping
 */

/** Domain allowlist for SSRF protection */
export const ALLOWED_DOMAINS = [
  'www.googleapis.com',
  'youtube.googleapis.com',
  'www.youtube.com',
  'i.ytimg.com',
] as const;

/** Private/metadata IP ranges to block */
export const BLOCKED_IP_RANGES = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
  '169.254.0.0/16', // Link-local / AWS metadata
  '0.0.0.0/8',
] as const;

/** Trending item types */
export const TRENDING_TYPES = {
  HASHTAG: 'HASHTAG',
  TOPIC: 'TOPIC',
  SEARCH: 'SEARCH',
  VIDEO: 'VIDEO',
} as const;

export type TrendingType = (typeof TRENDING_TYPES)[keyof typeof TRENDING_TYPES];

/** Platform status values */
export const PLATFORM_STATUS = {
  OK: 'ok',
  DEGRADED: 'degraded',
  DOWN: 'down',
} as const;

export type PlatformStatus = (typeof PLATFORM_STATUS)[keyof typeof PLATFORM_STATUS];

/** Cache configuration */
export const CACHE_CONFIG = {
  /** TTL for first-page cache in seconds */
  FIRST_PAGE_TTL_SECONDS: 300,
  /** Cache key prefix */
  KEY_PREFIX: 'trending:v1:first',
} as const;

/** Refresh cooldown in seconds */
export const REFRESH_COOLDOWN_SECONDS = 15 * 60;

/** Server-side source refresh cadence for all active regions. */
export const TRENDING_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Delay before startup refresh begins, so Redis/API boot can settle first. */
export const TRENDING_STARTUP_REFRESH_DELAY_MS = 5000;

/** Small spacing between startup region refresh jobs to avoid a burst. */
export const TRENDING_STARTUP_REFRESH_SPACING_MS = 30_000;

/** Retention configuration */
export const RETENTION_CONFIG = {
  /** Delete items expired longer than this (hours) */
  CLEANUP_AFTER_HOURS: 24,
  /** Max items to delete per batch */
  BATCH_SIZE: 100,
} as const;

/** Default pagination */
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
} as const;

/** Status window for degradable service */
export const STATUS_WINDOW = {
  /** Consider "ok" if last success within this many hours */
  OK_HOURS: 6,
  /** Consider "degraded" if cache exists but older than OK_HOURS */
  DEGRADED_HOURS: 24,
} as const;

/** Data expiry TTL in hours */
export const DATA_EXPIRY_HOURS = 24;
