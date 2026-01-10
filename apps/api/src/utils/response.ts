import type { FastifyReply } from 'fastify';
import type { ApiSuccessResponse, ApiErrorResponse, ApiMeta, ErrorCode } from '@vibe-creator/shared';

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  meta?: ApiMeta,
  statusCode = 200
): FastifyReply {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };
  return reply.status(statusCode).send(response);
}

export function sendError(
  reply: FastifyReply,
  code: ErrorCode,
  message: string,
  statusCode = 400,
  details?: Record<string, unknown>
): FastifyReply {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  return reply.status(statusCode).send(response);
}

export function sendCreated<T>(reply: FastifyReply, data: T): FastifyReply {
  return sendSuccess(reply, data, undefined, 201);
}

export function sendNoContent(reply: FastifyReply): FastifyReply {
  return reply.status(204).send();
}

export function sendPaginated<T>(
  reply: FastifyReply,
  data: T[],
  total: number,
  page: number,
  limit: number
): FastifyReply {
  const totalPages = Math.ceil(total / limit);
  return sendSuccess(reply, data, { page, limit, total, totalPages });
}
