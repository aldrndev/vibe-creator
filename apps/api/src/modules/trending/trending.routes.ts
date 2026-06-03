/**
 * Trending Routes
 * ============================================================================
 * API endpoints for trending feature
 */

import { DEFAULT_TRENDING_REGION } from '@vibe-creator/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AuditAction, audit } from '@/lib/audit';
import { requireAdmin } from '@/plugins/auth';
import { trendingQueue } from './jobs/trending.queue';
import { TrendingQuerySchema, TrendingRegionCodeSchema } from './trending.schema';
import { trendingService } from './trending.service';
import { createTrendingRefreshJobId } from './trending-refresh-jobs';

const TrendingRefreshBodySchema = z
  .object({
    region: TrendingRegionCodeSchema.default(DEFAULT_TRENDING_REGION),
    mode: z.enum(['quick', 'full']).default('quick'),
  })
  .optional();

const TrendingStatusQuerySchema = z.object({
  region: TrendingRegionCodeSchema.default(DEFAULT_TRENDING_REGION),
});

export const trendingRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /trending
   * List all trending items with cursor pagination
   */
  fastify.get('/', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const query = TrendingQuerySchema.parse(request.query);
      const result = await trendingService.getItems(query);

      return reply.send({
        success: true,
        data: result,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message },
        });
      }
      throw err;
    }
  });

  /**
   * GET /trending/hashtags
   * List trending hashtags only
   */
  fastify.get('/hashtags', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const rawQuery = request.query as Record<string, unknown>;
    const query = TrendingQuerySchema.parse({ ...rawQuery, type: 'HASHTAG' });
    const result = await trendingService.getItems(query);

    return reply.send({
      success: true,
      data: result,
    });
  });

  /**
   * GET /trending/topics
   * List trending topics only
   */
  fastify.get('/topics', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const rawQuery = request.query as Record<string, unknown>;
    const query = TrendingQuerySchema.parse({ ...rawQuery, type: 'TOPIC' });
    const result = await trendingService.getItems(query);

    return reply.send({
      success: true,
      data: result,
    });
  });

  /**
   * GET /trending/status
   * Get platform status
   */
  fastify.get('/status', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const queryResult = TrendingStatusQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: queryResult.error.issues[0]?.message ?? 'Invalid status request',
        },
      });
    }

    const status = await trendingService.getStatus(queryResult.data.region);

    return reply.send({
      success: true,
      data: status,
    });
  });

  /**
   * POST /trending/refresh
   * Trigger manual refresh (admin only)
   */
  fastify.post('/refresh', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const adminGuard = await requireAdmin(request, reply);
    if (adminGuard) {
      return adminGuard;
    }

    const refreshBodyResult = TrendingRefreshBodySchema.safeParse(request.body);
    if (!refreshBodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: refreshBodyResult.error.issues[0]?.message ?? 'Invalid refresh request',
        },
      });
    }

    const { region, mode } = refreshBodyResult.data ?? {
      region: DEFAULT_TRENDING_REGION,
      mode: 'quick',
    };

    // Check cooldown
    const canRefresh = await trendingService.canRefresh(region);
    if (!canRefresh) {
      return reply.status(429).send({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Refresh cooldown active',
        },
      });
    }

    // Idempotency key for job deduplication
    const idempotencyKey = `trending:refresh:${mode}:${region}`;

    // Check if job with same key is active
    const existingJobs = await trendingQueue.getJobs(['active', 'waiting', 'delayed']);
    const isDuplicate = existingJobs.some((job) => job.data.idempotencyKey === idempotencyKey);

    if (isDuplicate) {
      return reply.status(409).send({
        success: false,
        error: { code: 'CONFLICT', message: 'Refresh job already in progress' },
      });
    }

    // Enqueue job (idempotent)
    const job = await trendingQueue.add(
      'refresh',
      { region, mode, idempotencyKey },
      { jobId: createTrendingRefreshJobId(mode, region) },
    );

    // Set cooldown
    await trendingService.setRefreshCooldown(region);

    // Audit log
    void audit({
      requestId: request.id,
      userId: user.id,
      tenantId: user.id,
      action: AuditAction.ADMIN_ACTION,
      resourceType: 'trending',
      resourceId: job.id ?? idempotencyKey,
      metadata: { mode, region },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? undefined,
    });

    return reply.status(202).send({
      success: true,
      data: {
        jobId: job.id ?? idempotencyKey,
        message: 'Refresh job enqueued',
      },
    });
  });
};
