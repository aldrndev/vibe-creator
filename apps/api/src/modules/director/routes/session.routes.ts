import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuditAction, audit } from '@/lib/audit';
import { directorService } from '../director.service';
import {
  DIRECTOR_SUBTITLE_FONT_SIZE_MAX,
  DIRECTOR_SUBTITLE_FONT_SIZE_MIN,
} from '../processing/video-export-subtitles';

const subtitlePositionValues = [
  'top',
  'center',
  'bottom',
  'cinema-bottom',
  'safe-bottom',
  'lower-third',
] as const;

const subtitleAnimationValues = ['none', 'fade', 'typewriter', 'word', 'phrase', 'line'] as const;

export const updateSubtitleStyleSchema = z.object({
  fontToken: z.string().optional(),
  textColorToken: z.string().optional(),
  bgColorToken: z.string().optional(),
  fontSize: z
    .number()
    .min(DIRECTOR_SUBTITLE_FONT_SIZE_MIN)
    .max(DIRECTOR_SUBTITLE_FONT_SIZE_MAX)
    .optional(),
  position: z.enum(subtitlePositionValues).optional(),
  animation: z.enum(subtitleAnimationValues).optional(),
});

export const sessionRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Create new director session
   */
  fastify.post('/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const session = await directorService.createSession(user.id);
      return reply.status(201).send({
        success: true,
        data: session,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create session';
      return reply.status(400).send({
        success: false,
        error: { code: 'CREATE_FAILED', message },
      });
    }
  });

  /**
   * Get session details
   */
  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const session = await directorService.getSession(request.params.id, user.id);
        return reply.send({
          success: true,
          data: session,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Session not found';
        const code = message.includes('not found') ? 'NOT_FOUND' : 'FORBIDDEN';
        return reply.status(code === 'NOT_FOUND' ? 404 : 403).send({
          success: false,
          error: { code, message },
        });
      }
    },
  );

  /**
   * Delete session
   */
  fastify.delete<{ Params: { id: string } }>(
    '/sessions/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        await directorService.deleteSession(request.params.id, user.id);
        void audit({
          requestId: request.id,
          userId: user.id,
          tenantId: user.id,
          action: AuditAction.RESOURCE_DELETED,
          resourceType: 'director_session',
          resourceId: request.params.id,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? undefined,
        });
        return reply.send({
          success: true,
          data: { deleted: true },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Delete failed';
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message },
        });
      }
    },
  );

  /**
   * Update subtitle style
   */
  fastify.patch<{ Params: { id: string } }>(
    '/sessions/:id/subtitle',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const body = updateSubtitleStyleSchema.parse(request.body);
        const style = await directorService.updateSubtitleStyle(request.params.id, user.id, body);
        return reply.send({
          success: true,
          data: style,
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
