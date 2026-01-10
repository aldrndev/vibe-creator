/**
 * Centralized Logger - Digitesia Standard Compliant
 *
 * Features:
 * - Required base fields: service, env, version
 * - Automatic redaction of secrets, tokens, PII
 * - Child logger factories for request/job context
 * - requestId → jobId correlation support
 */

import pino from "pino";
import { env } from "@/config/env";

/**
 * Paths to redact from logs (secrets, tokens, PII)
 */
const REDACT_PATHS = [
  // Request headers
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['x-api-key']",
  // Common sensitive fields
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "accessToken",
  "refreshToken",
  "creditCard",
  "creditCardNumber",
  // Nested patterns
  "*.password",
  "*.token",
  "*.secret",
  "*.apiKey",
  "*.accessToken",
  "*.refreshToken",
  // Auth related
  "body.password",
  "body.token",
  "data.password",
  "data.token",
];

/**
 * Get package version from environment or default
 */
const getVersion = (): string => {
  return process.env.npm_package_version || "0.0.0";
};

/**
 * Base logger instance with required fields and redaction
 */
export const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
  base: {
    service: "vibe-creator-api",
    env: env.NODE_ENV,
    version: getVersion(),
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

/**
 * Request context for child logger
 */
export interface RequestLogContext {
  requestId: string;
  tenantId?: string;
  userId?: string;
  route?: string;
}

/**
 * Job context for child logger
 */
export interface JobLogContext {
  jobId: string;
  requestId?: string;
  tenantId?: string;
  jobType?: string;
}

/**
 * Create a child logger scoped to a request context
 * Use this in route handlers for consistent request correlation
 *
 * @example
 * const log = getRequestLogger({ requestId: req.id, userId: user.id });
 * log.info({ route: '/api/sessions' }, 'Session created');
 */
export function getRequestLogger(ctx: RequestLogContext): pino.Logger {
  return logger.child({
    requestId: ctx.requestId,
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    route: ctx.route,
  });
}

/**
 * Create a child logger scoped to a job context
 * Use this in BullMQ workers for job correlation
 *
 * @example
 * const log = getJobLogger({ jobId: job.id, jobType: 'export' });
 * log.info('Export started');
 */
export function getJobLogger(ctx: JobLogContext): pino.Logger {
  return logger.child({
    jobId: ctx.jobId,
    requestId: ctx.requestId,
    tenantId: ctx.tenantId,
    jobType: ctx.jobType,
  });
}

/**
 * Log with latency measurement
 * Useful for tracking endpoint/operation performance
 *
 * @example
 * const end = logWithLatency(log, 'Processing video');
 * await processVideo();
 * end(); // Logs with latencyMs
 */
export function logWithLatency(
  log: pino.Logger,
  message: string,
  data?: Record<string, unknown>
): () => void {
  const start = Date.now();
  return () => {
    const latencyMs = Date.now() - start;
    log.info({ ...data, latencyMs }, message);
  };
}

export type Logger = typeof logger;
