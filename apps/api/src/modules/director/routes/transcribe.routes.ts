import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  isAutoTranscribeLanguage,
  isTranscribeLanguage,
  normalizeTranscribeLanguage,
} from '@/modules/transcribe/transcribe-language';
import { directorService } from '../director.service';

const transcriptWordSchema = z
  .object({
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(0),
    text: z.string().trim().min(1).max(500),
    confidence: z.number().min(0).max(1).optional(),
    speaker: z.string().trim().min(1).max(64).optional(),
  })
  .superRefine((word, ctx) => {
    if (word.endMs <= word.startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endMs'],
        message: 'Word endMs harus lebih besar dari startMs.',
      });
    }
  });

const transcriptSegmentSchema = z
  .object({
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(0),
    text: z.string().trim().min(1).max(2_000),
    speaker: z.string().trim().min(1).max(64).optional(),
    words: z.array(transcriptWordSchema).optional(),
  })
  .superRefine((segment, ctx) => {
    if (segment.endMs <= segment.startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endMs'],
        message: 'Segment endMs harus lebih besar dari startMs.',
      });
    }

    segment.words?.forEach((word, index) => {
      if (word.startMs < segment.startMs || word.endMs > segment.endMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['words', index],
          message: 'Timing word harus berada di dalam timing segment.',
        });
      }
    });
  });

export const updateTranscriptSchema = z.object({
  segments: z.array(transcriptSegmentSchema),
});
const transcribeLanguageSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .refine((value) => isTranscribeLanguage(value), {
    message:
      'Language tidak valid. Gunakan "mixed"/"auto" atau kode bahasa (contoh: "id", "en", "es", "pt-BR").',
  })
  .transform((value) => normalizeTranscribeLanguage(value));
const startTranscribeSchema = z
  .object({
    forceRefresh: z.boolean().optional(),
    language: transcribeLanguageSchema.optional(),
    subtitleMode: z.enum(['original', 'translate']).optional(),
    subtitleTargetLanguage: transcribeLanguageSchema.optional(),
  })
  .superRefine((payload, ctx) => {
    if (payload.subtitleMode !== 'translate') {
      return;
    }

    if (!payload.subtitleTargetLanguage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['subtitleTargetLanguage'],
        message: 'Bahasa target wajib diisi saat mode subtitle terjemahan aktif.',
      });
      return;
    }

    if (isAutoTranscribeLanguage(payload.subtitleTargetLanguage)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['subtitleTargetLanguage'],
        message: 'Bahasa target terjemahan harus spesifik (contoh: "en", "es", "ja").',
      });
    }
  });

export const transcribeRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Start transcription
   */
  fastify.post<{
    Params: { id: string };
    Body: {
      forceRefresh?: boolean;
      language?: string;
      subtitleMode?: 'original' | 'translate';
      subtitleTargetLanguage?: string;
    };
  }>(
    '/sessions/:id/transcribe',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          forceRefresh?: boolean;
          language?: string;
          subtitleMode?: 'original' | 'translate';
          subtitleTargetLanguage?: string;
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
        const body = startTranscribeSchema.parse(request.body ?? {});
        const job = await directorService.startTranscribe(request.params.id, user.id, {
          forceRefresh: body.forceRefresh ?? false,
          language: body.language,
          subtitleMode: body.subtitleMode,
          subtitleTargetLanguage: body.subtitleTargetLanguage,
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
