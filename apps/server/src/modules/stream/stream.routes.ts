import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { streamService } from './stream.service';

const startStreamSchema = z.object({
  inputPath: z.string(),
  config: z.object({
    platform: z.enum(['youtube', 'tiktok', 'twitch', 'facebook', 'instagram', 'custom']),
    rtmpUrl: z.string().optional(),
    streamKey: z.string(),
  }),
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
      const result = await streamService.startStream({
        userId: user.id,
        inputPath: body.inputPath,
        config: {
          platform: body.config.platform,
          rtmpUrl: body.config.rtmpUrl || '',
          streamKey: body.config.streamKey,
        },
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message },
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
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message },
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
