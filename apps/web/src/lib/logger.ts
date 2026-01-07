/**
 * Frontend Logger - Digitesia Standard Compliant
 *
 * Features:
 * - Environment-aware (dev-only console output)
 * - Component context scoping
 * - Structured logging interface
 * - Production-ready error tracking integration point
 */

const isDev = import.meta.env.DEV;

/**
 * Log context for component-scoped logging
 */
export interface LogContext {
  component?: string;
  action?: string;
}

/**
 * Scoped logger instance with context
 */
interface ScopedLogger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
}

/**
 * Format log prefix with context
 */
function formatPrefix(ctx?: LogContext): string {
  if (!ctx) return "";
  const parts: string[] = [];
  if (ctx.component) parts.push(ctx.component);
  if (ctx.action) parts.push(ctx.action);
  return parts.length > 0 ? `[${parts.join(":")}]` : "";
}

/**
 * Safe stringify for data objects (avoid circular refs)
 */
function safeStringify(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

/**
 * Create a scoped logger with component context
 *
 * @example
 * const log = logger.withContext({ component: 'AiDirector', action: 'export' });
 * log.info('Export started', { sessionId });
 */
function createScopedLogger(ctx: LogContext): ScopedLogger {
  const prefix = formatPrefix(ctx);

  return {
    debug: (message: string, data?: unknown) => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.debug(
          `${prefix} ${message}`,
          data !== undefined ? safeStringify(data) : ""
        );
      }
    },
    info: (message: string, data?: unknown) => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.info(
          `${prefix} ${message}`,
          data !== undefined ? safeStringify(data) : ""
        );
      }
    },
    warn: (message: string, data?: unknown) => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.warn(
          `${prefix} ${message}`,
          data !== undefined ? safeStringify(data) : ""
        );
      }
    },
    error: (message: string, error?: unknown) => {
      // Errors are always logged (for production error tracking)
      if (isDev) {
        // eslint-disable-next-line no-console
        console.error(`${prefix} ${message}`, error);
      }
      // Production: Send to error tracking service
      // TODO: Integrate with Sentry, LogRocket, etc.
      // if (!isDev) {
      //   Sentry.captureException(error, { extra: { message, ...ctx } });
      // }
    },
  };
}

/**
 * Frontend logger with context support
 *
 * @example
 * // Basic logging
 * logger.info('User logged in');
 *
 * // Scoped logging
 * const log = logger.withContext({ component: 'Editor' });
 * log.debug('Canvas rendered', { width: 1920, height: 1080 });
 */
export const logger = {
  /**
   * Create a scoped logger with component context
   */
  withContext(ctx: LogContext): ScopedLogger {
    return createScopedLogger(ctx);
  },

  /**
   * Log debug information (only in development)
   */
  debug(message: string, data?: unknown): void {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug(
        `[DEBUG] ${message}`,
        data !== undefined ? safeStringify(data) : ""
      );
    }
  },

  /**
   * Log general information (only in development)
   */
  info(message: string, data?: unknown): void {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.info(
        `[INFO] ${message}`,
        data !== undefined ? safeStringify(data) : ""
      );
    }
  },

  /**
   * Log warnings (only in development)
   */
  warn(message: string, data?: unknown): void {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn(
        `[WARN] ${message}`,
        data !== undefined ? safeStringify(data) : ""
      );
    }
  },

  /**
   * Log errors - always logged for production tracking
   */
  error(message: string, error?: unknown): void {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`, error);
    }
    // Production error tracking hook
    // TODO: Add Sentry/LogRocket integration
  },
};
