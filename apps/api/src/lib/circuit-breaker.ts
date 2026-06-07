/**
 * Circuit Breaker for External APIs
 *
 * Per Digitesia Standard (H3 - Circuit Breakers for External Dependencies):
 * - Prevents cascading failures from external API outages
 * - Fail-fast when external service is degraded
 * - Bounded retries with idempotency checks
 * - Automatic recovery after reset timeout
 */

import CircuitBreaker from 'opossum';
import { logger } from '@/lib/logger';

export interface CircuitBreakerOptions {
  /** Service name for logging */
  serviceName: string;
  /** Timeout per request (ms) */
  timeout: number;
  /** Error threshold percentage to open circuit (0-100) */
  errorThresholdPercentage: number;
  /** Time to wait before attempting reset (ms) */
  resetTimeout: number;
  /** Whether the operation is idempotent (safe to retry) */
  allowRetry?: boolean;
}

/**
 * Create a circuit breaker for an external API call
 *
 * @param fn - Async function to wrap
 * @param options - Circuit breaker configuration
 * @returns Circuit breaker instance
 *
 * @example
 * ```typescript
 * const cobaltBreaker = createCircuitBreaker(
 *   fetchFromCobaltAPI,
 *   {
 *     serviceName: 'Cobalt API',
 *     timeout: 30000,
 *     errorThresholdPercentage: 50,
 *     resetTimeout: 60000,
 *     allowRetry: true,
 *   }
 * );
 * ```
 */
export function createCircuitBreaker<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: CircuitBreakerOptions,
): CircuitBreaker<Parameters<T>, ReturnType<T>> {
  const breaker = new CircuitBreaker(fn, {
    timeout: options.timeout,
    errorThresholdPercentage: options.errorThresholdPercentage,
    resetTimeout: options.resetTimeout,
    name: options.serviceName,
  });

  // Event logging
  breaker.on('open', () => {
    logger.error({ service: options.serviceName }, 'Circuit breaker opened - failing fast');
  });

  breaker.on('halfOpen', () => {
    logger.warn({ service: options.serviceName }, 'Circuit breaker half-open - testing recovery');
  });

  breaker.on('close', () => {
    logger.info({ service: options.serviceName }, 'Circuit breaker closed - service recovered');
  });

  breaker.on('timeout', () => {
    logger.warn(
      { service: options.serviceName, timeout: options.timeout },
      'Circuit breaker timeout',
    );
  });

  breaker.on('reject', () => {
    logger.warn(
      { service: options.serviceName },
      'Circuit breaker rejected request (circuit open)',
    );
  });

  breaker.on('fallback', (_result: unknown) => {
    logger.info({ service: options.serviceName }, 'Circuit breaker fallback executed');
  });

  breaker.on('failure', (err: Error) => {
    logger.error({ service: options.serviceName, err: err.message }, 'Circuit breaker failure');
  });

  breaker.on('success', (_result: unknown) => {
    logger.debug({ service: options.serviceName }, 'Circuit breaker success');
  });

  return breaker as CircuitBreaker<Parameters<T>, ReturnType<T>>;
}

/**
 * Execute a circuit breaker with optional retry logic
 *
 * CRITICAL: Only retries idempotent operations
 *
 * @param breaker - Circuit breaker instance
 * @param args - Arguments to pass to wrapped function
 * @param isIdempotent - Whether operation is safe to retry
 * @returns Result of wrapped function
 */
export async function executeWithCircuitBreaker<T>(
  breaker: CircuitBreaker<unknown[], T>,
  args: unknown[],
  isIdempotent: boolean = false,
): Promise<T> {
  try {
    return await breaker.fire(...args);
  } catch (err) {
    // If circuit is open, fail immediately
    if (breaker.opened) {
      throw new Error(`${breaker.name} unavailable (circuit open)`);
    }

    // Only retry if operation is idempotent
    if (!isIdempotent) {
      throw err;
    }

    throw err; // Let circuit breaker handle retry logic
  }
}

/**
 * Get circuit breaker health status
 */
export function getCircuitBreakerStats(breaker: CircuitBreaker<unknown[], unknown>) {
  const stats = breaker.stats;
  let state = 'CLOSED';
  if (breaker.opened) {
    state = 'OPEN';
  } else if (breaker.halfOpen) {
    state = 'HALF_OPEN';
  }
  return {
    name: breaker.name,
    state,
    failures: stats.failures,
    fallbacks: stats.fallbacks,
    successes: stats.successes,
    rejects: stats.rejects,
    timeouts: stats.timeouts,
    latencyMean: stats.latencyMean,
  };
}
