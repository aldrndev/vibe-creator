/**
 * Register Handler
 * User registration with captcha verification
 */

import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuditAction, audit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { hashPassword } from '@/utils/crypto';
import { sendCreated, sendError } from '@/utils/response';
import { setRefreshTokenCookie } from '../auth.cookies';
import { createSession } from '../auth.session';

const registerSchema = z.object({
  email: z.email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  turnstileToken: z.string().min(1, 'Captcha diperlukan'),
});

export async function registerHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = registerSchema.parse(request.body);

  const isValidCaptcha = await verifyTurnstileToken(body.turnstileToken, request.ip);
  if (!isValidCaptcha) {
    return sendError(
      reply,
      ERROR_CODES.VALIDATION_ERROR,
      'Verifikasi captcha gagal. Silakan coba lagi.',
      400,
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existingUser) {
    logger.info({ email: body.email }, 'Registration attempt for existing email');
    return sendError(
      reply,
      ERROR_CODES.VALIDATION_ERROR,
      'Registrasi gagal. Silakan periksa data Anda atau hubungi support.',
      400,
    );
  }

  const hashedPassword = await hashPassword(body.password);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      password: hashedPassword,
      name: body.name,
      subscription: {
        create: {
          tier: 'FREE',
          status: 'ACTIVE',
          exportsUsed: 0,
          exportsLimit: 0,
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
    },
  });

  const tokens = await createSession(user.id, request.headers['user-agent'] ?? null, request.ip);

  setRefreshTokenCookie(reply, tokens.refreshToken, tokens.refreshExpiresAt);

  await audit({
    requestId: request.id,
    userId: user.id,
    tenantId: user.id,
    sessionId: tokens.sessionId,
    action: AuditAction.LOGIN,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] ?? undefined,
    metadata: { method: 'register' },
  });

  return sendCreated(reply, {
    user,
    accessToken: tokens.accessToken,
    expiresAt: tokens.accessExpiresAt,
  });
}
