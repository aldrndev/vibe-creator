import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '@/lib/logger';
import { sendError } from '@/utils/response';
import { ERROR_CODES } from '@vibe-creator/shared';

export async function errorHandlerPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      const requestId = request.id;

      // Zod validation errors
      if (error instanceof ZodError) {
        logger.warn({ requestId, errors: error.errors }, 'Validation error');
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          'Validasi gagal',
          400,
          { errors: error.errors }
        );
      }

      // Fastify validation errors
      if (error.validation) {
        logger.warn({ requestId, validation: error.validation }, 'Validation error');
        return sendError(
          reply,
          ERROR_CODES.VALIDATION_ERROR,
          'Validasi gagal',
          400,
          { errors: error.validation }
        );
      }

      // Not found
      if (error.statusCode === 404) {
        return sendError(reply, ERROR_CODES.NOT_FOUND, 'Resource tidak ditemukan', 404);
      }

      // Rate limit
      if (error.statusCode === 429) {
        return sendError(
          reply,
          ERROR_CODES.SERVICE_UNAVAILABLE,
          'Terlalu banyak request. Coba lagi nanti.',
          429
        );
      }

      // Log internal errors
      logger.error(
        {
          requestId,
          err: error,
          stack: error.stack,
          url: request.url,
          method: request.method,
        },
        'Internal server error'
      );

      // Don't expose internal error details
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        'Terjadi kesalahan internal',
        500
      );
    }
  );
}
