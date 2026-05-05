import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { targetDurationRangeValues } from '../analysis-duration-config';
import { directorService } from '../director.service';

const selectClipsSchema = z.object({
  clipIds: z
    .array(z.string())
    .min(1, 'Pilih tepat 1 klip untuk membuat short')
    .max(1, 'Maksimal 1 klip per short'),
});

const updateClipSchema = z.object({
  trimStartMs: z.number().min(0).optional(),
  trimEndMs: z.number().min(0).optional(),
  orderIndex: z.number().min(0).optional(),
});

const analyzeRequestSchema = z
  .object({
    targetDurationRange: z.enum(targetDurationRangeValues).optional(),
  })
  .optional();

export const analysisRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Start analysis
   */
  fastify.post<{
    Params: { id: string };
    Body?: {
      targetDurationRange?: (typeof targetDurationRangeValues)[number];
    };
  }>(
    '/sessions/:id/analyze',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body?: {
          targetDurationRange?: (typeof targetDurationRangeValues)[number];
        };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const body = analyzeRequestSchema.parse(request.body ?? {});
        const job = await directorService.startAnalysis(request.params.id, user.id, {
          targetDurationRange: body?.targetDurationRange,
        });
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
        const message = err instanceof Error ? err.message : 'Analysis failed';
        return reply.status(400).send({
          success: false,
          error: { code: 'ANALYSIS_FAILED', message },
        });
      }
    },
  );

  /**
   * Get analysis status & results
   */
  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id/analyze',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const result = await directorService.getAnalysisResult(request.params.id, user.id);
        return reply.send({
          success: true,
          data: result,
        });
      } catch {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Analysis not found' },
        });
      }
    },
  );

  /**
   * Select clips
   */
  fastify.post<{ Params: { id: string } }>(
    '/sessions/:id/clips',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const body = selectClipsSchema.parse(request.body);
        const clips = await directorService.selectClips(request.params.id, user.id, body.clipIds);
        return reply.send({
          success: true,
          data: clips,
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
        const message = err instanceof Error ? err.message : 'Selection failed';
        return reply.status(400).send({
          success: false,
          error: { code: 'SELECTION_FAILED', message },
        });
      }
    },
  );

  /**
   * Get selected clips
   */
  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id/clips',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const clips = await directorService.getSelectedClips(request.params.id, user.id);
        return reply.send({
          success: true,
          data: clips,
        });
      } catch {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Clips not found' },
        });
      }
    },
  );

  /**
   * Update clip
   */
  fastify.patch<{ Params: { id: string; clipId: string } }>(
    '/sessions/:id/clips/:clipId',
    async (
      request: FastifyRequest<{ Params: { id: string; clipId: string } }>,
      reply: FastifyReply,
    ) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const body = updateClipSchema.parse(request.body);
        const clip = await directorService.updateClip(
          request.params.id,
          user.id,
          request.params.clipId,
          body,
        );
        return reply.send({
          success: true,
          data: clip,
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
        const message = err instanceof Error ? err.message : 'Update failed';
        return reply.status(400).send({
          success: false,
          error: { code: 'UPDATE_FAILED', message },
        });
      }
    },
  );

  /**
   * Delete a selected clip
   */
  fastify.delete<{ Params: { id: string; clipId: string } }>(
    '/sessions/:id/clips/:clipId',
    async (
      request: FastifyRequest<{ Params: { id: string; clipId: string } }>,
      reply: FastifyReply,
    ) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const result = await directorService.deleteClip(
          request.params.id,
          user.id,
          request.params.clipId,
        );
        return reply.send({
          success: true,
          data: result,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Delete failed';
        return reply.status(400).send({
          success: false,
          error: { code: 'DELETE_FAILED', message },
        });
      }
    },
  );
};
