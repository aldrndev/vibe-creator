/**
 * Refresh Token Handler
 * JWT refresh with token rotation and replay detection
 */

import { randomUUID } from 'node:crypto';
import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { nanoid } from 'nanoid';
import { AuditAction, audit } from '@/lib/audit';
import { signAccessToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { generateToken, hashToken } from '@/utils/crypto';
import { sendError, sendSuccess } from '@/utils/response';
import {
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE,
  setRefreshTokenCookie,
} from '../auth.cookies';
import { ACCESS_TOKEN_DURATION_MINUTES, REFRESH_TOKEN_DURATION_DAYS } from '../auth.session';

export async function refreshHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      return sendError(reply, ERROR_CODES.TOKEN_EXPIRED, 'Refresh token tidak ditemukan', 400);
    }

    const hashedRefreshToken = hashToken(refreshToken);

    const session = await prisma.userSession.findFirst({
      where: { refreshToken: hashedRefreshToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    if (!session) {
      clearRefreshTokenCookie(reply);
      return sendError(
        reply,
        ERROR_CODES.TOKEN_EXPIRED,
        'Refresh token tidak valid atau sudah expired',
        401,
      );
    }

    if (session.refreshExpiresAt <= new Date()) {
      await prisma.userSession.delete({ where: { id: session.id } });
      clearRefreshTokenCookie(reply);
      return sendError(
        reply,
        ERROR_CODES.TOKEN_EXPIRED,
        'Refresh token tidak valid atau sudah expired',
        401,
      );
    }

    const tokenFamily = session.tokenFamily ?? randomUUID();

    // Replay detection
    if (session.consumedAt) {
      await prisma.userSession.deleteMany({
        where: tokenFamily ? { tokenFamily } : { userId: session.userId },
      });
      await audit({
        requestId: request.id,
        userId: session.userId,
        tenantId: session.userId,
        sessionId: session.id,
        action: AuditAction.TOKEN_REPLAY_DETECTED,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? undefined,
        metadata: { tokenFamily },
      });
      clearRefreshTokenCookie(reply);
      return sendError(
        reply,
        ERROR_CODES.TOKEN_EXPIRED,
        'Refresh token tidak valid atau sudah expired',
        401,
      );
    }

    // Generate new tokens
    const newAccessToken = await signAccessToken(session.userId);
    const newRefreshToken = generateToken(64);
    const hashedNewRefreshToken = hashToken(newRefreshToken);
    const now = new Date();
    const newAccessExpiresAt = new Date(now);
    newAccessExpiresAt.setMinutes(newAccessExpiresAt.getMinutes() + ACCESS_TOKEN_DURATION_MINUTES);
    const newRefreshExpiresAt = new Date(now);
    newRefreshExpiresAt.setDate(newRefreshExpiresAt.getDate() + REFRESH_TOKEN_DURATION_DAYS);
    const newSessionId = nanoid();

    // Token rotation with transaction
    const rotationResult = await prisma.$transaction(
      async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
        const updated = await tx.userSession.updateMany({
          where: { id: session.id, consumedAt: null },
          data: { consumedAt: now, tokenFamily },
        });
        if (updated.count !== 1) return { rotated: false };

        await tx.userSession.create({
          data: {
            id: newSessionId,
            userId: session.userId,
            token: newSessionId,
            refreshToken: hashedNewRefreshToken,
            tokenFamily,
            parentTokenId: session.id,
            consumedAt: null,
            userAgent: request.headers['user-agent'] ?? null,
            ipAddress: request.ip,
            expiresAt: newAccessExpiresAt,
            refreshExpiresAt: newRefreshExpiresAt,
          },
        });

        return { rotated: true };
      },
    );

    if (!rotationResult.rotated) {
      await prisma.userSession.deleteMany({
        where: tokenFamily ? { tokenFamily } : { userId: session.userId },
      });
      await audit({
        requestId: request.id,
        userId: session.userId,
        tenantId: session.userId,
        sessionId: session.id,
        action: AuditAction.TOKEN_REPLAY_DETECTED,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? undefined,
        metadata: { tokenFamily },
      });
      clearRefreshTokenCookie(reply);
      return sendError(
        reply,
        ERROR_CODES.TOKEN_EXPIRED,
        'Refresh token tidak valid atau sudah expired',
        401,
      );
    }

    setRefreshTokenCookie(reply, newRefreshToken, newRefreshExpiresAt);

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.userId },
    });

    await audit({
      requestId: request.id,
      userId: session.userId,
      tenantId: session.userId,
      sessionId: newSessionId,
      action: AuditAction.REFRESH,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? undefined,
      metadata: { tokenFamily },
    });

    return sendSuccess(reply, {
      user: session.user,
      subscription: subscription
        ? {
            tier: subscription.tier,
            status: subscription.status,
            exportsUsed: subscription.exportsUsed,
            exportsLimit: subscription.exportsLimit,
            validUntil: subscription.validUntil,
          }
        : null,
      accessToken: newAccessToken,
      expiresAt: newAccessExpiresAt,
    });
  } catch (error: unknown) {
    logger.error({ err: error }, 'Refresh token error');
    return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Refresh failed', 500);
  }
}
