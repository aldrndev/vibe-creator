import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@/lib/prisma";
import { sendError } from "@/utils/response";
import { ERROR_CODES } from "@vibe-creator/shared";
import { logger } from "@/lib/logger";
import type { User, UserSession } from "@prisma/client";
import { verifyAccessToken } from "@/lib/jwt";
import { env } from "@/config/env";
import { audit, AuditAction } from "@/lib/audit";

declare module 'fastify' {
  interface FastifyRequest {
    user: User | null;
    session: UserSession | null;
    auth: { userId: string; tenantId: string } | null;
  }
}

export async function authPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorateRequest('user', null);
  fastify.decorateRequest('session', null);
  fastify.decorateRequest("auth", null);

  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    const authHeader = request.headers.authorization;
    let token: string | undefined;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      // Allow token in query param for file downloads/media
      const query = request.query as { token?: string };
      if (query?.token) {
        token = query.token;
      }
    }

    if (!token) {
      return;
    }

    try {
      const payload = await verifyAccessToken(token);
      request.auth = { userId: payload.sub, tenantId: payload.tid };

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) {
        return;
      }

      request.user = user;
      request.session = null;
      return;
    } catch (error) {
      if (!env.ENABLE_LEGACY_SESSION_AUTH) {
        return;
      }

      const session = await prisma.userSession.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!session) {
        return;
      }

      if (session.expiresAt < new Date()) {
        return;
      }

      logger.warn(
        { userId: session.userId, err: error instanceof Error ? error.message : "unknown" },
        "Legacy session auth fallback"
      );
      request.user = session.user;
      request.session = session;
      request.auth = { userId: session.userId, tenantId: session.userId };
    }
  });
}

export function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> | void {
  if (!request.user) {
    void audit({
      requestId: request.id,
      action: AuditAction.ACCESS_DENIED,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] ?? undefined,
      metadata: { reason: "unauthenticated" },
    });
    sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
    return;
  }
}

export function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> | void {
  if (!request.user) {
    void audit({
      requestId: request.id,
      action: AuditAction.ACCESS_DENIED,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] ?? undefined,
      metadata: { reason: "unauthenticated_admin" },
    });
    sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
    return;
  }
  if (request.user.role !== 'ADMIN') {
    void audit({
      requestId: request.id,
      userId: request.user.id,
      tenantId: request.user.id,
      action: AuditAction.ACCESS_DENIED,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] ?? undefined,
      metadata: { reason: "forbidden_admin" },
    });
    sendError(reply, ERROR_CODES.FORBIDDEN, 'Akses admin diperlukan', 403);
    return;
  }
}
