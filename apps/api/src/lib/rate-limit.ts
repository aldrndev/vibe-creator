import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "@/config/env";
import { redis } from "@/lib/redis";
import { sendError } from "@/utils/response";
import { ERROR_CODES } from "@vibe-creator/shared";

/**
 * Fail-closed guard for sensitive endpoints when Redis is unavailable.
 */
export function requireRateLimitReady(
  request: FastifyRequest,
  reply: FastifyReply
): FastifyReply | void {
  if (env.RATE_LIMIT_TEST_MODE) {
    return;
  }

  if (redis.status !== "ready") {
    return sendError(
      reply,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      "Rate limiting unavailable",
      503,
      {
        requestId: request.id,
      }
    );
  }
}
