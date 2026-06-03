import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuditAction, audit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { sendError, sendSuccess } from '@/utils/response';
import {
  adminUpdateSubscriptionSchema,
  adminUpdateUserStatusSchema,
  adminUserIdParamsSchema,
  adminUsersQuerySchema,
} from '../admin.schemas';
import { AdminServiceError, adminService } from '../admin.service';

function validationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Validasi gagal';
}

function handleAdminError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof z.ZodError) {
    return sendError(reply, ERROR_CODES.VALIDATION_ERROR, validationMessage(error), 400);
  }

  if (error instanceof AdminServiceError) {
    if (error.code === 'NOT_FOUND') {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'User tidak ditemukan', 404);
    }

    return sendError(
      reply,
      ERROR_CODES.VALIDATION_ERROR,
      'Admin tidak bisa mengubah akun sendiri',
      400,
    );
  }

  logger.error({ err: error }, 'Admin user operation failed');
  return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Operasi admin gagal', 500);
}

async function auditAdminUserAction(
  request: FastifyRequest,
  resourceId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  if (!request.user) return;

  await audit({
    requestId: request.id,
    userId: request.user.id,
    tenantId: request.user.id,
    action: AuditAction.ADMIN_ACTION,
    resourceType: 'user',
    resourceId,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] ?? undefined,
    metadata,
  });
}

export const userHandlers = {
  async getUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = adminUsersQuerySchema.parse(request.query);
      const result = await adminService.getUsers(query);
      return sendSuccess(reply, result);
    } catch (error) {
      return handleAdminError(reply, error);
    }
  },

  async getUserDetails(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = adminUserIdParamsSchema.parse(request.params);
      const user = await adminService.getUserDetails(params.userId);
      return sendSuccess(reply, user);
    } catch (error) {
      return handleAdminError(reply, error);
    }
  },

  async updateSubscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = adminUserIdParamsSchema.parse(request.params);
      const body = adminUpdateSubscriptionSchema.parse(request.body);
      const result = await adminService.updateUserSubscription(params.userId, body);

      await auditAdminUserAction(request, params.userId, {
        action: 'update_subscription',
        previousTier: result.previous?.tier ?? null,
        nextTier: result.subscription.tier,
        previousExportsUsed: result.previous?.exportsUsed ?? null,
        nextExportsUsed: result.subscription.exportsUsed,
        resetUsage: body.resetUsage,
        validUntil: result.subscription.validUntil,
      });

      return sendSuccess(reply, result.subscription);
    } catch (error) {
      return handleAdminError(reply, error);
    }
  },

  async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actorUserId = request.user?.id;
      if (!actorUserId) {
        return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
      }

      const params = adminUserIdParamsSchema.parse(request.params);
      const body = adminUpdateUserStatusSchema.parse(request.body);
      const user = await adminService.updateUserStatus(actorUserId, params.userId, body);

      await auditAdminUserAction(request, params.userId, {
        action: 'update_user_status',
        status: body.status,
        reason: body.reason ?? null,
      });

      return sendSuccess(reply, user);
    } catch (error) {
      return handleAdminError(reply, error);
    }
  },

  async deleteUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actorUserId = request.user?.id;
      if (!actorUserId) {
        return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
      }

      const params = adminUserIdParamsSchema.parse(request.params);
      const user = await adminService.softDeleteUser(actorUserId, params.userId);

      await auditAdminUserAction(request, params.userId, { action: 'soft_delete_user' });

      return sendSuccess(reply, user);
    } catch (error) {
      return handleAdminError(reply, error);
    }
  },
};
