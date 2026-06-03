/**
 * Admin Routes - Main Entry Point
 * Administrative API endpoints with role-based access control
 */

import type { FastifyPluginAsync } from 'fastify';
import { requireRateLimitReady } from '@/lib/rate-limit';
import { requireAdmin } from '@/plugins/auth';
import { announcementHandlers } from './handlers/announcements.handler';
import { statsHandlers } from './handlers/stats.handler';
import { userHandlers } from './handlers/users.handler';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Rate limit check
  fastify.addHook('preHandler', async (request, reply) => {
    const result = requireRateLimitReady(request, reply);
    if (result) {
      return result;
    }
  });

  // Admin authorization check
  fastify.addHook('preHandler', requireAdmin);

  // ============================================================================
  // STATS & ACTIVITY
  // ============================================================================

  fastify.get('/stats', statsHandlers.getStats);
  fastify.get('/activity', statsHandlers.getActivity);

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  fastify.get('/users', userHandlers.getUsers);
  fastify.get('/users/:userId', userHandlers.getUserDetails);
  fastify.patch('/users/:userId/subscription', userHandlers.updateSubscription);
  fastify.patch('/users/:userId/status', userHandlers.updateStatus);
  fastify.delete('/users/:userId', userHandlers.deleteUser);

  // ============================================================================
  // ANNOUNCEMENTS
  // ============================================================================

  fastify.get('/announcements', announcementHandlers.getAnnouncements);
  fastify.post('/announcements', announcementHandlers.createAnnouncement);
  fastify.patch('/announcements/:id', announcementHandlers.updateAnnouncement);
  fastify.delete('/announcements/:id', announcementHandlers.deleteAnnouncement);
};
