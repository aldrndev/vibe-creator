import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyReply } from 'fastify';

// Default per-request query budget.
export const QUERY_BUDGET_MS = 100;
// Default maximum rows per list response.
export const QUERY_MAX_ROWS = 50;
// Retry-After seconds for budget exceed responses.
const QUERY_RETRY_AFTER_SECONDS = 1;

interface QueryBudgetParams {
  durationMs: number;
  rows: number;
}

/**
 * Enforce query budget and return true if response was sent.
 */
export function enforceQueryBudget(reply: FastifyReply, params: QueryBudgetParams): boolean {
  if (params.rows > QUERY_MAX_ROWS || params.durationMs > QUERY_BUDGET_MS) {
    reply.header('Retry-After', QUERY_RETRY_AFTER_SECONDS.toString());
    reply.status(429).send({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: 'Query budget exceeded',
        details: {
          durationMs: Math.round(params.durationMs),
          rows: params.rows,
        },
      },
    });
    return true;
  }
  return false;
}
