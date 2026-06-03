/**
 * Auth Routes - Main Entry Point
 * Authentication API endpoints
 */

import type { FastifyInstance } from 'fastify';
import { requireRateLimitReady } from '@/lib/rate-limit';
import { requireAuth } from '@/plugins/auth';
import {
  loginRateLimit,
  passwordChangeRateLimit,
  refreshRateLimit,
  registerRateLimit,
} from './auth.ratelimit';
import {
  changePasswordRouteSchema,
  loginRouteSchema,
  logoutRouteSchema,
  meRouteSchema,
  refreshRouteSchema,
  registerRouteSchema,
  updateProfileRouteSchema,
} from './auth.schemas';
import { loginHandler } from './handlers/login.handler';
import { changePasswordHandler, updateProfileHandler } from './handlers/profile.handler';
import { refreshHandler } from './handlers/refresh.handler';
import { registerHandler } from './handlers/register.handler';
import { logoutHandler, meHandler } from './handlers/session.handler';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Rate limit check hook
  fastify.addHook('preHandler', async (request, reply) => {
    const result = requireRateLimitReady(request, reply);
    if (result) {
      return result;
    }
  });

  // Register with stricter rate limit
  fastify.post(
    '/register',
    {
      ...registerRateLimit,
      schema: registerRouteSchema,
    },
    registerHandler,
  );

  // Login with stricter rate limit
  fastify.post(
    '/login',
    {
      ...loginRateLimit,
      schema: loginRouteSchema,
    },
    loginHandler,
  );

  // Refresh token with rate limit
  fastify.post(
    '/refresh',
    {
      ...refreshRateLimit,
      schema: refreshRouteSchema,
    },
    refreshHandler,
  );

  // Logout
  fastify.post(
    '/logout',
    {
      schema: logoutRouteSchema,
    },
    logoutHandler,
  );

  // Get current user
  fastify.get(
    '/me',
    {
      preHandler: requireAuth,
      schema: meRouteSchema,
    },
    meHandler,
  );

  fastify.patch(
    '/profile',
    {
      preHandler: requireAuth,
      schema: updateProfileRouteSchema,
    },
    updateProfileHandler,
  );

  fastify.post(
    '/change-password',
    {
      ...passwordChangeRateLimit,
      preHandler: requireAuth,
      schema: changePasswordRouteSchema,
    },
    changePasswordHandler,
  );
}
