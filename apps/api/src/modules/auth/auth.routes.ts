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

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Rate limit check hook
  fastify.addHook("preHandler", async (request, reply) => {
    const result = requireRateLimitReady(request, reply);
    if (result) {
      return result;
    }
  });

  // Register with stricter rate limit
  fastify.post("/register", registerRateLimit, registerHandler);

  // Login with stricter rate limit
  fastify.post("/login", loginRateLimit, loginHandler);

  // Refresh token with rate limit
  fastify.post("/refresh", refreshRateLimit, refreshHandler);

  // Logout
  fastify.post("/logout", logoutHandler);

  // Get current user
  fastify.get("/me", { preHandler: requireAuth }, meHandler);
}
