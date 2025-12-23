import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { reactionService } from './reaction.service';
import { createReadStream, existsSync, statSync } from 'fs';

const createReactionSchema = z.object({
  mainVideoPath: z.string(),
  reactionVideoPath: z.string(),
  position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).default('bottom-right'),
  scale: z.number().min(0.1).max(0.5).default(0.3),
  margin: z.number().min(0).max(100).default(20),
});

const createSideBySideSchema = z.object({
  leftVideoPath: z.string(),
  rightVideoPath: z.string(),
  layout: z.enum(['horizontal', 'vertical']).default('horizontal'),
});

const createReactionMixedSchema = createReactionSchema.extend({
  reactionVolume: z.number().min(0).max(2).default(0.8),
});

export const reactionRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Create reaction video with PiP overlay
   */
  fastify.post('/create', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const body = createReactionSchema.parse(request.body);
      const outputPath = await reactionService.createReaction(body);

      return reply.send({
        success: true,
        data: { outputPath },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message },
        });
      }
      
      const message = err instanceof Error ? err.message : 'Reaction creation failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'REACTION_ERROR', message },
      });
    }
  });

  /**
   * Create side-by-side video
   */
  fastify.post('/side-by-side', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const body = createSideBySideSchema.parse(request.body);
      const outputPath = await reactionService.createSideBySide(body);

      return reply.send({
        success: true,
        data: { outputPath },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message },
        });
      }
      
      const message = err instanceof Error ? err.message : 'Side-by-side creation failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'SIDEBYSIDE_ERROR', message },
      });
    }
  });

  /**
   * Create reaction video with mixed audio
   */
  fastify.post('/create-mixed', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const body = createReactionMixedSchema.parse(request.body);
      const outputPath = await reactionService.createReactionMixedAudio(body);

      return reply.send({
        success: true,
        data: { outputPath },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message },
        });
      }
      
      const message = err instanceof Error ? err.message : 'Reaction creation failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'REACTION_ERROR', message },
      });
    }
  });

  /**
   * Download generated file
   */
  fastify.get<{ Params: { filename: string } }>('/download/:filename', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const filePath = `${process.cwd()}/uploads/reactions/${request.params.filename}`;
    
    if (!existsSync(filePath)) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'File not found' },
      });
    }

    const stat = statSync(filePath);
    const stream = createReadStream(filePath);

    return reply
      .header('Content-Type', 'video/mp4')
      .header('Content-Disposition', `attachment; filename="${request.params.filename}"`)
      .header('Content-Length', stat.size)
      .send(stream);
  });
};
