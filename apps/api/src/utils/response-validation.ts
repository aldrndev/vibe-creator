/**
 * Response Validation Utilities
 * Middleware and helpers for validating API responses
 */

import { FastifyReply } from "fastify";
import { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * Validate response data against schema before sending
 * Logs validation errors but doesn't fail the request in production
 */
export function validateResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context?: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    logger.warn(
      {
        context,
        errors: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      "Response validation warning"
    );
    // Return data as-is in production to avoid breaking changes
    // Type assertion is intentional - we're logging but not failing
    return data as T;
  }

  return result.data;
}

/**
 * Send validated success response
 */
export function sendValidatedSuccess<T>(
  reply: FastifyReply,
  schema: z.ZodType<T>,
  data: T,
  statusCode = 200
) {
  const validated = validateResponse(schema, { success: true, data });
  return reply.status(statusCode).send(validated);
}

/**
 * Send validated error response
 */
export function sendValidatedError(
  reply: FastifyReply,
  code: string,
  message: string,
  statusCode = 400
) {
  return reply.status(statusCode).send({
    success: false,
    error: { code, message },
  });
}
