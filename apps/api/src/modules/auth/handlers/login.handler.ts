/**
 * Login Handler
 * User authentication with captcha verification
 */

import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuditAction, audit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { verifyPassword } from '@/utils/crypto';
import { sendError, sendSuccess } from '@/utils/response';
import { setRefreshTokenCookie } from '../auth.cookies';
import { createSession } from '../auth.session';

const loginSchema = z.object({
  email: z.email('Email tidak valid'),
  password: z.string().min(1, 'Password diperlukan'),
  turnstileToken: z.string().min(1, 'Captcha diperlukan'),
});

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = loginSchema.parse(request.body);

  const isValidCaptcha = await verifyTurnstileToken(body.turnstileToken, request.ip);
  if (!isValidCaptcha) {
    return sendError(
      reply,
      ERROR_CODES.VALIDATION_ERROR,
      'Verifikasi captcha gagal. Silakan coba lagi.',
      400,
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (!user) {
    return sendError(reply, ERROR_CODES.INVALID_CREDENTIALS, 'Email atau password salah', 401);
  }

  const isValidPassword = await verifyPassword(body.password, user.password);

  if (!isValidPassword) {
    return sendError(reply, ERROR_CODES.INVALID_CREDENTIALS, 'Email atau password salah', 401);
  }

  const tokens = await createSession(user.id, request.headers['user-agent'] ?? null, request.ip);

  setRefreshTokenCookie(reply, tokens.refreshToken, tokens.refreshExpiresAt);

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  await audit({
    requestId: request.id,
    userId: user.id,
    tenantId: user.id,
    sessionId: tokens.sessionId,
    action: AuditAction.LOGIN,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] ?? undefined,
    metadata: { method: 'login' },
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
    accessToken: tokens.accessToken,
    expiresAt: tokens.accessExpiresAt,
  });
}
