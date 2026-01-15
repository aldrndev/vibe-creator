/**
 * @module auth/ratelimit
 * @description Rate limiting configurations for authentication endpoints.
 *
 * Protects against:
 * - Brute force attacks on login
 * - Account enumeration via registration
 * - Token refresh abuse
 *
 * All limits are IP-based with action-specific prefixes.
 *
 * Rate limiting can be relaxed in test environments via RATE_LIMIT_TEST_MODE=true.
 * This should NEVER be enabled in production.
 */

import { ERROR_CODES } from "@vibe-creator/shared";
import { env } from "@/config/env";

/**
 * High limit for bypassing rate limit in test environment.
 * Setting max to 1000000 effectively disables rate limiting.
 */
const TEST_RATE_LIMIT = {
  max: 1000000,
  timeWindow: "1 minute",
};

/**
 * Check if rate limiting should be disabled (test environment only).
 */
const isRateLimitTestMode = (): boolean => {
  return env.RATE_LIMIT_TEST_MODE === true;
};

type RateLimitRequest = {
  ip: string;
  url?: string;
  user?: { id: string } | null;
  auth?: { userId: string; tenantId: string } | null;
};

const buildRateLimitKey = (
  scope: string,
  request: RateLimitRequest
): string => {
  const routeKey = request.url?.split("?")[0] || scope;
  const tenantId = request.auth?.tenantId || request.user?.id;
  const userId = request.auth?.userId || request.user?.id;

  if (tenantId && userId) {
    return `${scope}:${tenantId}:${userId}:${routeKey}`;
  }

  return `${scope}:ip:${request.ip}:${routeKey}`;
};

/**
 * Rate limit configuration for registration endpoint.
 * Limit: 3 attempts per hour per IP.
 */
export const registerRateLimit = {
  config: {
    rateLimit: {
      max: isRateLimitTestMode() ? TEST_RATE_LIMIT.max : 3,
      timeWindow: isRateLimitTestMode() ? TEST_RATE_LIMIT.timeWindow : "1 hour",
      keyGenerator: (request: RateLimitRequest) =>
        buildRateLimitKey("register", request),
      errorResponseBuilder: () => ({
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message:
            "Terlalu banyak percobaan daftar. Silakan coba lagi dalam 1 jam.",
        },
      }),
    },
  },
};

/**
 * Rate limit configuration for login endpoint.
 * Limit: 5 attempts per 15 minutes per IP.
 */
export const loginRateLimit = {
  config: {
    rateLimit: {
      max: isRateLimitTestMode() ? TEST_RATE_LIMIT.max : 5,
      timeWindow: isRateLimitTestMode()
        ? TEST_RATE_LIMIT.timeWindow
        : "15 minutes",
      keyGenerator: (request: RateLimitRequest) =>
        buildRateLimitKey("login", request),
      errorResponseBuilder: () => ({
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message:
            "Terlalu banyak percobaan masuk. Silakan coba lagi dalam 15 menit.",
        },
      }),
    },
  },
};

/**
 * Rate limit configuration for token refresh endpoint.
 * Limit: 10 attempts per minute per IP.
 */
export const refreshRateLimit = {
  config: {
    rateLimit: {
      max: isRateLimitTestMode() ? TEST_RATE_LIMIT.max : 10,
      timeWindow: isRateLimitTestMode()
        ? TEST_RATE_LIMIT.timeWindow
        : "1 minute",
      keyGenerator: (request: RateLimitRequest) =>
        buildRateLimitKey("refresh", request),
      errorResponseBuilder: () => ({
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message:
            "Terlalu banyak permintaan refresh token. Mohon tunggu sebentar.",
        },
      }),
    },
  },
};
