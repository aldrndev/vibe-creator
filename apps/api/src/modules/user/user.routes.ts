import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AuditAction, audit } from '@/lib/audit';
import { requireRateLimitReady } from '@/lib/rate-limit';
import { requireAuth } from '@/plugins/auth';
import { sendError, sendSuccess } from '@/utils/response';
import {
  getUserPreferencesRouteSchema,
  notificationPreferencesUpdateSchema,
  updateUserPreferencesRouteSchema,
} from './user-preferences.schemas';
import { getUserPreferences, updateUserPreferences } from './user-preferences.service';

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', async (request, reply) => {
    const result = requireRateLimitReady(request, reply);
    if (result) {
      return result;
    }
  });

  fastify.get(
    '/preferences',
    {
      preHandler: requireAuth,
      schema: getUserPreferencesRouteSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
      }

      const preferences = await getUserPreferences(user.id);
      return sendSuccess(reply, preferences);
    },
  );

  fastify.patch(
    '/preferences',
    {
      preHandler: requireAuth,
      schema: updateUserPreferencesRouteSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
      }

      const parsed = notificationPreferencesUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Validasi gagal', 400, {
          issues: parsed.error.issues,
        });
      }

      const preferences = await updateUserPreferences(user.id, parsed.data);

      await audit({
        requestId: request.id,
        userId: user.id,
        tenantId: user.id,
        action: AuditAction.USER_PREFERENCES_UPDATED,
        resourceType: 'user-preferences',
        resourceId: user.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? undefined,
        metadata: {
          fields: Object.keys(parsed.data),
        },
      });

      return sendSuccess(reply, preferences);
    },
  );
}
