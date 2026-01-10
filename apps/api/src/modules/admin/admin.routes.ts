/**
 * Admin Routes - Main Entry Point
 * Administrative API endpoints with role-based access control
 */

import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { requireRateLimitReady } from "@/lib/rate-limit";
import { userHandlers } from "./handlers/users.handler";
import { statsHandlers } from "./handlers/stats.handler";
import { announcementHandlers } from "./handlers/announcements.handler";

/**
 * Admin route guard - only allows ADMIN role
 */
const requireAdmin = async (request: FastifyRequest) => {
  if (!request.user || request.user.role !== "ADMIN") {
    throw new Error("Admin access required");
  }
};

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Rate limit check
  fastify.addHook("preHandler", async (request, reply) => {
    const result = requireRateLimitReady(request, reply);
    if (result) {
      return result;
    }
  });

  // Admin authorization check
  fastify.addHook("preHandler", async (request, reply) => {
    try {
      await requireAdmin(request);
    } catch {
      return reply.status(403).send({
        success: false,
        error: { code: "FORBIDDEN", message: "Admin access required" },
      });
    }
  });

  // ============================================================================
  // STATS & ACTIVITY
  // ============================================================================

  fastify.get("/stats", statsHandlers.getStats);
  fastify.get("/activity", statsHandlers.getActivity);

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  fastify.get("/users", userHandlers.getUsers);
  fastify.get("/users/:userId", userHandlers.getUserDetails);
  fastify.patch("/users/:userId/subscription", userHandlers.updateSubscription);
  fastify.delete("/users/:userId", userHandlers.deleteUser);

  // ============================================================================
  // ANNOUNCEMENTS
  // ============================================================================

  fastify.get("/announcements", announcementHandlers.getAnnouncements);
  fastify.post("/announcements", announcementHandlers.createAnnouncement);
  fastify.patch("/announcements/:id", announcementHandlers.updateAnnouncement);
  fastify.delete("/announcements/:id", announcementHandlers.deleteAnnouncement);
};
