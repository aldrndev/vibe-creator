import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { sendError, sendSuccess } from '@/utils/response';
import { adminActivityQuerySchema } from '../admin.schemas';
import { adminService } from '../admin.service';

function validationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Validasi gagal';
}

export const statsHandlers = {
  async getStats(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await adminService.getStats();
      return sendSuccess(reply, stats);
    } catch (error) {
      logger.error({ err: error }, 'Admin stats failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Gagal memuat statistik admin', 500);
    }
  },

  async getActivity(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = adminActivityQuerySchema.parse(request.query);
      const activity = await adminService.getRecentActivity(query.limit);
      return sendSuccess(reply, { activity });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendError(reply, ERROR_CODES.VALIDATION_ERROR, validationMessage(error), 400);
      }

      logger.error({ err: error }, 'Admin activity failed');
      return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Gagal memuat aktivitas admin', 500);
    }
  },
};
