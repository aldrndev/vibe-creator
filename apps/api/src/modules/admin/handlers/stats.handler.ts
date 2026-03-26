/**
 * Stats & Activity Handlers
 * Admin endpoints for dashboard statistics and activity logs
 */

import { performance } from 'node:perf_hooks';
import { MAX_LIMIT } from '@vibe-creator/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { enforceQueryBudget } from '@/utils/query-budget';
import { adminService } from '../admin.service';

export const statsHandlers = {
  /**
   * Get dashboard statistics
   */
  async getStats(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await adminService.getStats();
      return reply.send({
        success: true,
        data: stats,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get stats';
      return reply.status(500).send({
        success: false,
        error: { code: 'ADMIN_ERROR', message },
      });
    }
  },

  /**
   * Get recent activity
   */
  async getActivity(
    request: FastifyRequest<{ Querystring: { limit?: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const limit = Math.min(parseInt(request.query.limit || '20', 10), MAX_LIMIT);
      const start = performance.now();
      const activity = await adminService.getRecentActivity(limit);
      const durationMs = performance.now() - start;

      if (enforceQueryBudget(reply, { durationMs, rows: activity.length })) {
        return reply;
      }

      return reply.send({
        success: true,
        data: { activity },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get activity';
      return reply.status(500).send({
        success: false,
        error: { code: 'ADMIN_ERROR', message },
      });
    }
  },
};
