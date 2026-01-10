/**
 * Logout and Me Handlers
 * Session management endpoints
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@/lib/prisma";
import { sendSuccess, sendError } from "@/utils/response";
import { hashToken } from "@/utils/crypto";
import { verifyAccessToken } from "@/lib/jwt";
import { ERROR_CODES } from "@vibe-creator/shared";
import { audit, AuditAction } from "@/lib/audit";
import { clearRefreshTokenCookie, REFRESH_TOKEN_COOKIE } from "../auth.cookies";

/**
 * Logout handler - clears session
 */
export async function logoutHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE];
  if (refreshToken) {
    try {
      const hashedToken = hashToken(refreshToken);
      await prisma.userSession.deleteMany({
        where: { refreshToken: hashedToken },
      });
    } catch {
      // Ignore errors
    }
  }

  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyAccessToken(token);
      await prisma.userSession.deleteMany({
        where: { userId: payload.sub },
      });
    } catch {
      // Ignore
    }
  }

  clearRefreshTokenCookie(reply);
  if (request.user) {
    await audit({
      requestId: request.id,
      userId: request.user.id,
      tenantId: request.user.id,
      action: AuditAction.LOGOUT,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] ?? undefined,
    });
  }
  return sendSuccess(reply, { message: "Berhasil logout" });
}

/**
 * Get current user handler
 */
export async function meHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;

  if (!user) {
    return sendError(
      reply,
      ERROR_CODES.UNAUTHORIZED,
      "Tidak terautentikasi",
      401
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  return sendSuccess(reply, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
    subscription: subscription
      ? {
          tier: subscription.tier,
          status: subscription.status,
          exportsUsed: subscription.exportsUsed,
          exportsLimit: subscription.exportsLimit,
          validUntil: subscription.validUntil,
        }
      : null,
  });
}
