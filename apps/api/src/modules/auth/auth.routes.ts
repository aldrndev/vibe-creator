/**
 * Auth Routes - Main Entry Point
 * Authentication API endpoints
 */

import type { FastifyInstance } from "fastify";
import { requireRateLimitReady } from "@/lib/rate-limit";
import { requireAuth } from "@/plugins/auth";

import { registerHandler } from "./handlers/register.handler";
import { loginHandler } from "./handlers/login.handler";
import { refreshHandler } from "./handlers/refresh.handler";
import { logoutHandler, meHandler } from "./handlers/session.handler";
import {
  registerRateLimit,
  loginRateLimit,
  refreshRateLimit,
} from "./auth.ratelimit";
import {
  loginRouteSchema,
  registerRouteSchema,
  refreshRouteSchema,
  logoutRouteSchema,
  meRouteSchema,
} from "./auth.schemas";

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Rate limit check hook
  fastify.addHook("preHandler", async (request, reply) => {
    const result = requireRateLimitReady(request, reply);
    if (result) {
      return result;
    }
  });

  // Register with stricter rate limit
  fastify.post(
    "/register",
    {
      ...registerRateLimit,
      schema: registerRouteSchema,
    },
    registerHandler
  );

  // Login with stricter rate limit
  fastify.post(
    "/login",
    {
      ...loginRateLimit,
      schema: loginRouteSchema,
    },
    loginHandler
  );

  // Refresh token with rate limit
  fastify.post(
    "/refresh",
    {
      ...refreshRateLimit,
      schema: refreshRouteSchema,
    },
    refreshHandler
  );

  // Logout
  fastify.post(
    "/logout",
    {
      schema: logoutRouteSchema,
    },
    logoutHandler
  );

  // Get current user
  fastify.get(
    "/me",
    {
      preHandler: requireAuth,
      schema: meRouteSchema,
    },
    meHandler
  );
}
