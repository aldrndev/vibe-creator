import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuditAction, audit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import { sendError, sendSuccess } from '@/utils/response';
import {
  adminAnnouncementIdParamsSchema,
  adminCreateAnnouncementSchema,
  adminUpdateAnnouncementSchema,
} from '../admin.schemas';
import { adminService } from '../admin.service';

const ACTIVE_ANNOUNCEMENTS_CACHE_KEY = 'announcements:active';

function validationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Validasi gagal';
}

async function invalidateAnnouncementCache(): Promise<void> {
  if (redis.status === 'ready') {
    await redis.del(ACTIVE_ANNOUNCEMENTS_CACHE_KEY);
  }
}

async function auditAnnouncementAction(
  request: FastifyRequest,
  resourceId: string,
  action: string,
): Promise<void> {
  if (!request.user) return;

  await audit({
    requestId: request.id,
    userId: request.user.id,
    tenantId: request.user.id,
    action: AuditAction.ADMIN_ACTION,
    resourceType: 'announcement',
    resourceId,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] ?? undefined,
    metadata: { action },
  });
}

function handleAnnouncementError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof z.ZodError) {
    return sendError(reply, ERROR_CODES.VALIDATION_ERROR, validationMessage(error), 400);
  }

  logger.error({ err: error }, 'Admin announcement operation failed');
  return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Operasi pengumuman gagal', 500);
}

export const announcementHandlers = {
  async getAnnouncements(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const announcements = await adminService.getAnnouncements();
      return sendSuccess(reply, announcements);
    } catch (error) {
      return handleAnnouncementError(reply, error);
    }
  },

  async createAnnouncement(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = adminCreateAnnouncementSchema.parse(request.body);
      const announcement = await adminService.createAnnouncement(body.title, body.content);

      await invalidateAnnouncementCache();
      await auditAnnouncementAction(request, announcement.id, 'create_announcement');

      return sendSuccess(reply, announcement, undefined, 201);
    } catch (error) {
      return handleAnnouncementError(reply, error);
    }
  },

  async updateAnnouncement(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = adminAnnouncementIdParamsSchema.parse(request.params);
      const body = adminUpdateAnnouncementSchema.parse(request.body);
      const announcement = await adminService.updateAnnouncement(params.id, body);

      await invalidateAnnouncementCache();
      await auditAnnouncementAction(request, params.id, 'update_announcement');

      return sendSuccess(reply, announcement);
    } catch (error) {
      return handleAnnouncementError(reply, error);
    }
  },

  async deleteAnnouncement(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = adminAnnouncementIdParamsSchema.parse(request.params);
      await adminService.deleteAnnouncement(params.id);

      await invalidateAnnouncementCache();
      await auditAnnouncementAction(request, params.id, 'delete_announcement');

      return sendSuccess(reply, { message: 'Announcement deleted successfully' });
    } catch (error) {
      return handleAnnouncementError(reply, error);
    }
  },
};
