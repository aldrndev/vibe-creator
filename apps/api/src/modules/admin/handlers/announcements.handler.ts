/**
 * Announcement Handlers
 * Admin endpoints for announcement CRUD operations
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuditAction, audit } from '@/lib/audit';
import { redis } from '@/lib/redis';
import { adminService } from '../admin.service';

const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(1000),
});

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(1000).optional(),
  isActive: z.boolean().optional(),
});

export const announcementHandlers = {
  /**
   * Get all announcements
   */
  async getAnnouncements(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const announcements = await adminService.getAnnouncements();
      return reply.send({
        success: true,
        data: announcements,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get announcements';
      return reply.status(500).send({
        success: false,
        error: { code: 'ADMIN_ERROR', message },
      });
    }
  },

  /**
   * Create announcement
   */
  async createAnnouncement(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = createAnnouncementSchema.parse(request.body);
      const announcement = await adminService.createAnnouncement(body.title, body.content);

      if (redis.status === 'ready') {
        await redis.del('announcements:active');
      }

      if (request.user) {
        void audit({
          requestId: request.id,
          userId: request.user.id,
          tenantId: request.user.id,
          action: AuditAction.ADMIN_ACTION,
          resourceType: 'announcement',
          resourceId: announcement.id,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? undefined,
          metadata: { action: 'create_announcement' },
        });
      }

      return reply.status(201).send({
        success: true,
        data: announcement,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message },
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to create announcement';
      return reply.status(500).send({
        success: false,
        error: { code: 'ADMIN_ERROR', message },
      });
    }
  },

  /**
   * Update announcement
   */
  async updateAnnouncement(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const body = updateAnnouncementSchema.parse(request.body);
      const announcement = await adminService.updateAnnouncement(request.params.id, body);

      if (redis.status === 'ready') {
        await redis.del('announcements:active');
      }

      if (request.user) {
        void audit({
          requestId: request.id,
          userId: request.user.id,
          tenantId: request.user.id,
          action: AuditAction.ADMIN_ACTION,
          resourceType: 'announcement',
          resourceId: request.params.id,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? undefined,
          metadata: { action: 'update_announcement' },
        });
      }

      return reply.send({
        success: true,
        data: announcement,
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
      const message = err instanceof Error ? err.message : 'Failed to update announcement';
      return reply.status(500).send({
        success: false,
        error: { code: 'ADMIN_ERROR', message },
      });
    }
  },

  /**
   * Delete announcement
   */
  async deleteAnnouncement(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      await adminService.deleteAnnouncement(request.params.id);
      if (redis.status === 'ready') {
        await redis.del('announcements:active');
      }
      if (request.user) {
        void audit({
          requestId: request.id,
          userId: request.user.id,
          tenantId: request.user.id,
          action: AuditAction.ADMIN_ACTION,
          resourceType: 'announcement',
          resourceId: request.params.id,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? undefined,
          metadata: { action: 'delete_announcement' },
        });
      }
      return reply.send({
        success: true,
        data: { message: 'Announcement deleted successfully' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete announcement';
      return reply.status(500).send({
        success: false,
        error: { code: 'ADMIN_ERROR', message },
      });
    }
  },
};
