import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { resolveTempUploadReference } from '@/utils/temp-upload';
import { streamService } from './stream.service';

function isPrivateHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  return (
    normalizedHost === 'localhost' ||
    normalizedHost === '::1' ||
    normalizedHost === '[::1]' ||
    normalizedHost.startsWith('127.') ||
    normalizedHost.startsWith('10.') ||
    normalizedHost.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalizedHost)
  );
}

const customRtmpUrlSchema = z
  .string()
  .url()
  .refine((value) => /^rtmps?:\/\//i.test(value), {
    message: 'Custom RTMP URL must use rtmp:// or rtmps://',
  })
  .refine(
    (value) => {
      const parsed = new URL(value);
      return !isPrivateHost(parsed.hostname);
    },
    {
      message: 'Custom RTMP URL must not target private or loopback hosts',
    },
  );

const startStreamSchema = z
  .object({
    inputPath: z.string(),
    config: z.object({
      platform: z.enum(['youtube', 'tiktok', 'twitch', 'facebook', 'instagram', 'custom']),
      rtmpUrl: z.string().optional(),
      streamKey: z.string(),
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
      logger.debug({ body: request.body }, 'Stream Start request');
      const body = startStreamSchema.parse(request.body);
      const result = await streamService.startStream({
        userId: user.id,
        inputPath: resolveTempUploadReference(body.inputPath),
        config: {
          platform: body.config.platform,
          rtmpUrl: body.config.rtmpUrl || '',
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
        data: status,
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
        data: { streams },
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
      const streams = await streamService.getHistory(user.id);

      return reply.send({
        success: true,
        data: { streams },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get stream history';
      return reply.status(500).send({
        success: false,
        error: { code: 'STREAM_ERROR', message },
      });
    }
  });
};
