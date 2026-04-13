import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { TRANSCRIBE_LANGUAGE_VALUES } from '@/modules/transcribe/transcribe-language';
import { directorService } from '../director.service';

const updateTranscriptSchema = z.object({
  segments: z.array(
    z.object({
      startMs: z.number(),
      endMs: z.number(),
      text: z.string(),
    }),
  ),
});
const startTranscribeSchema = z.object({
  forceRefresh: z.boolean().optional(),
  language: z.enum(TRANSCRIBE_LANGUAGE_VALUES).optional(),
});

export const transcribeRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Start transcription
   */
  fastify.post<{
    Params: { id: string };
    Body: { forceRefresh?: boolean; language?: 'id' | 'en' | 'mixed' };
  }>(
    '/sessions/:id/transcribe',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { forceRefresh?: boolean; language?: 'id' | 'en' | 'mixed' };
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
        const body = startTranscribeSchema.parse(request.body ?? {});
        const job = await directorService.startTranscribe(request.params.id, user.id, {
          forceRefresh: body.forceRefresh ?? false,
          language: body.language,
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
              message: err.issues[0]?.message ?? 'Body request tidak valid',
            },
          });
        }

        const message = err instanceof Error ? err.message : 'Transcription failed';
        const statusCode = message.includes('queue belum siap') ? 503 : 400;
        return reply.status(statusCode).send({
          success: false,
          error: { code: 'TRANSCRIBE_FAILED', message },
        });
      }
    },
  );

  /**
   * Get transcription status & result
   */
  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id/transcribe',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const result = await directorService.getTranscribeResult(request.params.id, user.id);
        // result can be null if no transcription started yet
        return reply.send({
          success: true,
          data: result,
        });
      } catch {
        // Only 404 if session not found
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session not found' },
        });
      }
    },
  );

  /**
   * Update clip transcript
   */
  fastify.patch<{ Params: { id: string; clipId: string } }>(
    '/sessions/:id/clips/:clipId/transcript',
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
        const body = updateTranscriptSchema.parse(request.body);
        const transcript = await directorService.updateClipTranscript(
          request.params.id,
          user.id,
          request.params.clipId,
          body.segments,
        );
        return reply.send({
          success: true,
          data: transcript,
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
};
