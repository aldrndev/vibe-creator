import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { adminService } from './admin.service';

const updateSubscriptionSchema = z.object({
  tier: z.enum(['FREE', 'CREATOR', 'PRO']),
  validDays: z.number().optional().default(30),
});

/**
 * Admin route guard - only allows ADMIN role
 */
const requireAdmin = async (request: FastifyRequest) => {
  if (!request.user || request.user.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }
};

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Add admin check hook to all routes
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await requireAdmin(request);
    } catch {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      });
    }
  });

  /**
   * Get dashboard statistics
   */
  fastify.get('/stats', async (_request, reply) => {
    try {
      const stats = await adminService.getStats();
      return reply.send({
        success: true,
        data: stats,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get stats';
      return reply.status(500).send({
        success: false,
        error: { code: 'ADMIN_ERROR', message },
      });
    }
  });

  /**
   * Get users list
   */
  fastify.get<{ Querystring: { page?: string; limit?: string; search?: string } }>(
    '/users',
    async (request, reply) => {
      try {
        const page = parseInt(request.query.page || '1', 10);
        const limit = parseInt(request.query.limit || '20', 10);
        const search = request.query.search;

        const result = await adminService.getUsers(page, limit, search);
        return reply.send({
          success: true,
          data: result,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get users';
        return reply.status(500).send({
          success: false,
          error: { code: 'ADMIN_ERROR', message },
        });
      }
    }
  );

  /**
   * Get user details
   */
  fastify.get<{ Params: { userId: string } }>('/users/:userId', async (request, reply) => {
    try {
      const user = await adminService.getUserDetails(request.params.userId);
      return reply.send({
        success: true,
        data: user,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get user';
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message },
      });
    }
  });

  /**
   * Update user subscription
   */
  fastify.patch<{ Params: { userId: string } }>(
    '/users/:userId/subscription',
    async (request, reply) => {
      try {
        const body = updateSubscriptionSchema.parse(request.body);
        const subscription = await adminService.updateUserSubscription(
          request.params.userId,
          body.tier,
          body.validDays
        );

        return reply.send({
          success: true,
          data: subscription,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message },
          });
        }

        const message = err instanceof Error ? err.message : 'Failed to update subscription';
        return reply.status(500).send({
          success: false,
          error: { code: 'ADMIN_ERROR', message },
        });
      }
    }
  );

  /**
   * Delete user
   */
  fastify.delete<{ Params: { userId: string } }>('/users/:userId', async (request, reply) => {
    try {
      await adminService.deleteUser(request.params.userId);
      return reply.send({
        success: true,
        data: { message: 'User deleted successfully' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      return reply.status(500).send({
        success: false,
        error: { code: 'ADMIN_ERROR', message },
      });
    }
  });

  /**
   * Get recent activity
   */
  fastify.get<{ Querystring: { limit?: string } }>('/activity', async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit || '20', 10);
      const activity = await adminService.getRecentActivity(limit);

      return reply.send({
        success: true,
        data: { activity },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get activity';
      return reply.status(500).send({
        success: false,
        error: { code: 'ADMIN_ERROR', message },
      });
    }
  });

  // ============================================================================
  // ANNOUNCEMENTS
  // ============================================================================

  /**
   * Get all announcements
   */
  fastify.get('/announcements', async (_request, reply) => {
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
  });

  /**
   * Create announcement
   */
  fastify.post('/announcements', async (request, reply) => {
    try {
      const schema = z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1).max(1000),
      });
      const body = schema.parse(request.body);
      const announcement = await adminService.createAnnouncement(body.title, body.content);
      
      return reply.status(201).send({
        success: true,
        data: announcement,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message },
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to create announcement';
      return reply.status(500).send({
        success: false,
        error: { code: 'ADMIN_ERROR', message },
      });
    }
  });

  /**
   * Update announcement
   */
  fastify.patch<{ Params: { id: string } }>('/announcements/:id', async (request, reply) => {
    try {
      const schema = z.object({
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).max(1000).optional(),
        isActive: z.boolean().optional(),
      });
      const body = schema.parse(request.body);
      const announcement = await adminService.updateAnnouncement(request.params.id, body);
      
      return reply.send({
        success: true,
        data: announcement,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message },
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to update announcement';
      return reply.status(500).send({
        success: false,
        error: { code: 'ADMIN_ERROR', message },
      });
    }
  });

  /**
   * Delete announcement
   */
  fastify.delete<{ Params: { id: string } }>('/announcements/:id', async (request, reply) => {
    try {
      await adminService.deleteAnnouncement(request.params.id);
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
  });
};
