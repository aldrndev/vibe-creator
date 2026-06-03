import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { resolveTempUploadReference } from '@/utils/temp-upload';
import {
  customRtmpUrlSchema,
  projectStreamStartBodySchema,
  streamHistoryQuerySchema,
  streamHistoryResponseSchema,
  streamStatusResponseSchema,
} from './stream.schemas';
import { streamService } from './stream.service';

const startStreamSchema = z
  .object({
    inputPath: z.string(),
    config: z.object({
      platform: z.enum(['youtube', 'tiktok', 'twitch', 'facebook', 'instagram', 'custom']),
      rtmpUrl: z.string().optional(),
      streamKey: z.string().min(1).max(500),
      quality: z.enum(['720p', '1080p']).default('720p'),
      bitrateKbps: z.number().optional(),
      durationMinutes: z.number().min(1).max(1440).default(60), // Max 24 hours
    }),
  })
  .superRefine((data, ctx) => {
    if (data.config.platform === 'custom') {
      if (!data.config.rtmpUrl) {
        ctx.addIssue({
          code: 'custom',
          message: 'Custom RTMP URL is required for custom platform',
          path: ['config', 'rtmpUrl'],
        });
        return;
      }

      const result = customRtmpUrlSchema.safeParse(data.config.rtmpUrl);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            ...issue,
            path: ['config', 'rtmpUrl', ...issue.path],
          });
        }
      }
    }
  });

const stopStreamSchema = z.object({
  streamId: z.string(),
});

export const streamRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Start streaming
   */
  fastify.post('/start', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const body = startStreamSchema.parse(request.body);
      logger.debug(
        {
          platform: body.config.platform,
          quality: body.config.quality,
          durationMinutes: body.config.durationMinutes,
        },
        'Stream start request',
      );
      const result = await streamService.startStream({
        userId: user.id,
        inputPath: resolveTempUploadReference(body.inputPath),
        config: {
          platform: body.config.platform,
          rtmpUrl: body.config.rtmpUrl,
          streamKey: body.config.streamKey,
          quality: body.config.quality,
          bitrateKbps: body.config.bitrateKbps,
          durationMinutes: body.config.durationMinutes,
        },
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        logger.debug({ errors: err.issues }, 'Validation Error');
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message },
        });
      }

      const message = err instanceof Error ? err.message : 'Stream start failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'STREAM_ERROR', message },
      });
    }
  });

  fastify.get<{ Params: { id: string } }>('/projects/:id/source', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const sourceInfo = await streamService.getProjectSourceInfo(request.params.id, user.id);
      return reply.send({ success: true, data: sourceInfo });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Source video tidak tersedia.';
      return reply.status(400).send({
        success: false,
        error: { code: 'STREAM_SOURCE_ERROR', message },
      });
    }
  });

  fastify.post<{ Params: { id: string } }>('/projects/:id/start', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const body = projectStreamStartBodySchema.parse(request.body);

      const result = await streamService.startProjectStream({
        userId: user.id,
        projectId: request.params.id,
        streamKey: body.streamKey,
        customRtmpUrl: body.customRtmpUrl,
      });

      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message },
        });
      }

      const message = err instanceof Error ? err.message : 'Stream start failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'STREAM_ERROR', message },
      });
    }
  });

  /**
   * Stop streaming
   */
  fastify.post('/stop', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const body = stopStreamSchema.parse(request.body);
      await streamService.stopStream(body.streamId, user.id);

      return reply.send({
        success: true,
        data: { message: 'Stream stopped' },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message },
        });
      }

      const message = err instanceof Error ? err.message : 'Stream stop failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'STREAM_ERROR', message },
      });
    }
  });

  /**
   * Get stream status
   */
  fastify.get<{ Params: { streamId: string } }>('/:streamId/status', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const status = await streamService.getStreamStatus(request.params.streamId, user.id);

      return reply.send({
        success: true,
        data: streamStatusResponseSchema.parse(status),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get stream status';
      return reply.status(500).send({
        success: false,
        error: { code: 'STREAM_ERROR', message },
      });
    }
  });

  /**
   * Get active streams
   */
  fastify.get('/active', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const streams = await streamService.getActiveStreams(user.id);

      return reply.send({
        success: true,
        data: { streams: streams.map((stream) => streamStatusResponseSchema.parse(stream)) },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get active streams';
      return reply.status(500).send({
        success: false,
        error: { code: 'STREAM_ERROR', message },
      });
    }
  });

  /**
   * Get stream history
   */
  fastify.get('/history', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const query = streamHistoryQuerySchema.parse(request.query);
      const result = await streamService.getHistory(user.id, query);

      return reply.send({
        success: true,
        data: streamHistoryResponseSchema.parse(result),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message },
        });
      }

      const message = err instanceof Error ? err.message : 'Failed to get stream history';
      return reply.status(500).send({
        success: false,
        error: { code: 'STREAM_ERROR', message },
      });
    }
  });
};
