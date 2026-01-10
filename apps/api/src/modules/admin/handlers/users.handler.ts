/**
 * User Management Handlers
 * Admin endpoints for user CRUD operations
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { adminService } from "../admin.service";
import { MAX_LIMIT } from "@vibe-creator/shared";
import { audit, AuditAction } from "@/lib/audit";
import { enforceQueryBudget } from "@/utils/query-budget";
import { performance } from "node:perf_hooks";

const updateSubscriptionSchema = z.object({
  tier: z.enum(["FREE", "CREATOR", "PRO"]),
  validDays: z.number().optional().default(30),
});

export const userHandlers = {
  /**
   * Get users list
   */
  async getUsers(
    request: FastifyRequest<{
      Querystring: { page?: string; limit?: string; search?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const page = parseInt(request.query.page || "1", 10);
      const limit = Math.min(
        parseInt(request.query.limit || "20", 10),
        MAX_LIMIT
      );
      const search = request.query.search;

      const start = performance.now();
      const result = await adminService.getUsers(page, limit, search);
      const durationMs = performance.now() - start;

      if (
        enforceQueryBudget(reply, { durationMs, rows: result.users.length })
      ) {
        return reply;
      }
      return reply.send({
        success: true,
        data: result,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get users";
      return reply.status(500).send({
        success: false,
        error: { code: "ADMIN_ERROR", message },
      });
    }
  },

  /**
   * Get user details
   */
  async getUserDetails(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const user = await adminService.getUserDetails(request.params.userId);
      return reply.send({
        success: true,
        data: user,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get user";
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message },
      });
    }
  },

  /**
   * Update user subscription
   */
  async updateSubscription(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const body = updateSubscriptionSchema.parse(request.body);
      const subscription = await adminService.updateUserSubscription(
        request.params.userId,
        body.tier,
        body.validDays
      );

      if (request.user) {
        void audit({
          requestId: request.id,
          userId: request.user.id,
          tenantId: request.user.id,
          action: AuditAction.ADMIN_ACTION,
          resourceType: "subscription",
          resourceId: request.params.userId,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] ?? undefined,
          metadata: { tier: body.tier, validDays: body.validDays },
        });
      }

      return reply.send({
        success: true,
        data: subscription,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: err.issues[0]?.message,
          },
        });
      }

      const message =
        err instanceof Error ? err.message : "Failed to update subscription";
      return reply.status(500).send({
        success: false,
        error: { code: "ADMIN_ERROR", message },
      });
    }
  },

  /**
   * Delete user
   */
  async deleteUser(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) {
    try {
      await adminService.deleteUser(request.params.userId);
      if (request.user) {
        void audit({
          requestId: request.id,
          userId: request.user.id,
          tenantId: request.user.id,
          action: AuditAction.ADMIN_ACTION,
          resourceType: "user",
          resourceId: request.params.userId,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] ?? undefined,
          metadata: { action: "delete_user" },
        });
      }
      return reply.send({
        success: true,
        data: { message: "User deleted successfully" },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete user";
      return reply.status(500).send({
        success: false,
        error: { code: "ADMIN_ERROR", message },
      });
    }
  },
};
