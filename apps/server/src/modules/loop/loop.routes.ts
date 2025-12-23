import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { loopService } from './loop.service';
import { createReadStream, existsSync, statSync } from 'fs';

const createLoopSchema = z.object({
  inputPath: z.string(),
  startMs: z.number().optional(),
  endMs: z.number().optional(),
  loopCount: z.number().min(1).max(10).default(3),
});

const createBoomerangSchema = z.object({
  inputPath: z.string(),
  startMs: z.number().optional(),
  endMs: z.number().optional(),
});

const createGifSchema = z.object({
  inputPath: z.string(),
  startMs: z.number().optional(),
  endMs: z.number().optional(),
  fps: z.number().min(5).max(30).default(15),
  width: z.number().min(100).max(1080).default(480),
});

export const loopRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Create looped video
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
      const body = createLoopSchema.parse(request.body);
      const outputPath = await loopService.createLoop(body);

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
      
      const message = err instanceof Error ? err.message : 'Loop creation failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'LOOP_ERROR', message },
      });
    }
  });

  /**
   * Create boomerang effect
   */
  fastify.post('/boomerang', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const body = createBoomerangSchema.parse(request.body);
      const outputPath = await loopService.createBoomerang(body);

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
      
      const message = err instanceof Error ? err.message : 'Boomerang creation failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'BOOMERANG_ERROR', message },
      });
    }
  });

  /**
   * Create GIF from video
   */
  fastify.post('/gif', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const body = createGifSchema.parse(request.body);
      const outputPath = await loopService.createGif(body);

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
      
      const message = err instanceof Error ? err.message : 'GIF creation failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'GIF_ERROR', message },
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

    const filePath = `${process.cwd()}/uploads/loops/${request.params.filename}`;
    
    if (!existsSync(filePath)) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'File not found' },
      });
    }

    const stat = statSync(filePath);
    const isGif = filePath.endsWith('.gif');
    const stream = createReadStream(filePath);

    return reply
      .header('Content-Type', isGif ? 'image/gif' : 'video/mp4')
      .header('Content-Disposition', `attachment; filename="${request.params.filename}"`)
      .header('Content-Length', stat.size)
      .send(stream);
  });
};
