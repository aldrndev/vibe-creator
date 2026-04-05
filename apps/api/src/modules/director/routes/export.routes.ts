import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '@/config/env';
import { requireAuth } from '@/plugins/auth';
import { contentModeValues } from '../content-mode';
import { directorService } from '../director.service';

const startExportSchema = z.object({
  aspectRatio: z.enum(['9:16', '16:9', '1:1']).optional(),
  quality: z.enum(['720p', '1080p']).optional(),
  includeSubtitles: z.boolean().optional(),
  normalizeAudio: z.boolean().optional(),
  refineSettings: z
    .record(
      z.string(),
      z.object({
        faceTracking: z.boolean().optional(),
        removeSilence: z.boolean().optional(),
        optimizeHook: z.boolean().optional(),
        stabilize: z.boolean().optional(),
        contentMode: z.enum(contentModeValues).optional(),
      }),
    )
    .optional(),
});

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Start export
   */
  fastify.post<{ Params: { id: string } }>(
    '/sessions/:id/export',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const body = startExportSchema.parse(request.body);
        const job = await directorService.startExport(request.params.id, user.id, body);
        return reply.status(202).send({
          success: true,
          data: job,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: err.issues[0]?.message,
            },
          });
        }
        const message = err instanceof Error ? err.message : 'Export failed';
        return reply.status(400).send({
          success: false,
          error: { code: 'EXPORT_FAILED', message },
        });
      }
    },
  );

  /**
   * Get export status
   */
  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id/export',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const result = await directorService.getExportResult(request.params.id, user.id);
        return reply.send({
          success: true,
          data: result,
        });
      } catch {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Export not found' },
        });
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id/export/download',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const exportJob = await directorService.getExportResult(request.params.id, user.id);

        if (!exportJob.outputStorageKey) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Export file not found' },
          });
        }

        const fileName = basename(exportJob.outputStorageKey);
        const filePath = join(env.MEDIA_INPUT_DIR, 'director', 'exports', fileName);

        try {
          await access(filePath);
        } catch {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Export file not found' },
          });
        }

        const fileStats = await stat(filePath);
        return reply
          .type('video/mp4')
          .header('Content-Disposition', `attachment; filename="${fileName}"`)
          .header('Content-Length', fileStats.size)
          .header('X-Content-Type-Options', 'nosniff')
          .send(createReadStream(filePath));
      } catch {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Export not found' },
        });
      }
    },
  );
};
