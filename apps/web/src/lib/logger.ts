/**
 * Frontend logger utility
 * Replaces direct console.* calls for ESLint compliance
 * In production, this could integrate with error tracking services
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log debug information (only in development)
   */
  debug: (...args: unknown[]): void => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * Log general information
   */
  info: (...args: unknown[]): void => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Log warnings
   */
  warn: (...args: unknown[]): void => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log errors - always logged, could integrate with error tracking
   */
  error: (message: string, error?: unknown): void => {
    // In production, this could send to Sentry, LogRocket, etc.
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('[ERROR]', message, error);
    }
    
    // TODO: Add production error tracking integration here
    // Example: Sentry.captureException(error);
  },
};
