import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendSuccess, sendError, sendCreated } from '@/utils/response';
import { hashPassword, verifyPassword, generateToken } from '@/utils/crypto';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { requireAuth } from '@/plugins/auth';
import { ERROR_CODES } from '@vibe-creator/shared';

const registerSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  turnstileToken: z.string().min(1, 'Captcha diperlukan'),
});

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password diperlukan'),
  turnstileToken: z.string().min(1, 'Captcha diperlukan'),
});

// Token durations
const ACCESS_TOKEN_DURATION_MINUTES = 15; // Short-lived
const REFRESH_TOKEN_DURATION_DAYS = 30; // Long-lived

// Cookie name for refresh token
const REFRESH_TOKEN_COOKIE = 'vibe_refresh_token';

/**
 * Set refresh token as HttpOnly cookie
 */
function setRefreshTokenCookie(
  reply: FastifyReply,
  refreshToken: string,
  expiresAt: Date
) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  reply.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/**
 * Clear refresh token cookie
 */
function clearRefreshTokenCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_TOKEN_COOKIE, {
    path: '/',
  });
}

/**
 * Create tokens for a user session
 */
async function createSession(
  userId: string,
  userAgent: string | null,
  ipAddress: string
) {
  // Single session enforcement: invalidate all existing sessions
  await prisma.userSession.deleteMany({
    where: { userId },
  });

  const accessToken = generateToken();
  const refreshToken = generateToken(64);
  
  const accessExpiresAt = new Date();
  accessExpiresAt.setMinutes(accessExpiresAt.getMinutes() + ACCESS_TOKEN_DURATION_MINUTES);
  
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + REFRESH_TOKEN_DURATION_DAYS);

  await prisma.userSession.create({
    data: {
      userId,
      token: accessToken,
      refreshToken,
      userAgent,
      ipAddress,
      expiresAt: accessExpiresAt,
      refreshExpiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    accessExpiresAt,
    refreshExpiresAt,
  };
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Register
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Verify Turnstile token
    const isValidCaptcha = await verifyTurnstileToken(body.turnstileToken, request.ip);
    if (!isValidCaptcha) {
      return sendError(
        reply,
        ERROR_CODES.VALIDATION_ERROR,
        'Verifikasi captcha gagal. Silakan coba lagi.',
        400
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return sendError(
        reply,
        ERROR_CODES.ALREADY_EXISTS,
        'Email sudah terdaftar',
        409
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

    const tokens = await createSession(
      user.id,
      request.headers['user-agent'] ?? null,
      request.ip
    );

    // Set refresh token as HttpOnly cookie
    setRefreshTokenCookie(reply, tokens.refreshToken, tokens.refreshExpiresAt);

    // Only return access token in response body
    return sendCreated(reply, {
      user,
      accessToken: tokens.accessToken,
      expiresAt: tokens.accessExpiresAt,
    });
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // Verify Turnstile token
    const isValidCaptcha = await verifyTurnstileToken(body.turnstileToken, request.ip);
    if (!isValidCaptcha) {
      return sendError(
        reply,
        ERROR_CODES.VALIDATION_ERROR,
        'Verifikasi captcha gagal. Silakan coba lagi.',
        400
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return sendError(
        reply,
        ERROR_CODES.INVALID_CREDENTIALS,
        'Email atau password salah',
        401
      );
    }

    const isValidPassword = await verifyPassword(body.password, user.password);

    if (!isValidPassword) {
      return sendError(
        reply,
        ERROR_CODES.INVALID_CREDENTIALS,
        'Email atau password salah',
        401
      );
    }

    const tokens = await createSession(
      user.id,
      request.headers['user-agent'] ?? null,
      request.ip
    );

    // Set refresh token as HttpOnly cookie
    setRefreshTokenCookie(reply, tokens.refreshToken, tokens.refreshExpiresAt);

    // Only return access token in response body
    return sendSuccess(reply, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      expiresAt: tokens.accessExpiresAt,
    });
  });

  // Refresh Token - reads from HttpOnly cookie
  fastify.post('/refresh', async (request, reply) => {
    // Get refresh token from cookie
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      return sendError(
        reply,
        ERROR_CODES.TOKEN_EXPIRED,
        'Refresh token tidak ditemukan',
        400
      );
    }

    const session = await prisma.userSession.findFirst({
      where: {
        refreshToken,
        refreshExpiresAt: { gt: new Date() },
      },
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
      // Clear invalid cookie
      clearRefreshTokenCookie(reply);
      return sendError(
        reply,
        ERROR_CODES.TOKEN_EXPIRED,
        'Refresh token tidak valid atau sudah expired',
        401
      );
    }

    // Generate new tokens (ROTATION: new refresh token for security)
    const newAccessToken = generateToken();
    const newRefreshToken = generateToken(64);
    
    const newAccessExpiresAt = new Date();
    newAccessExpiresAt.setMinutes(newAccessExpiresAt.getMinutes() + ACCESS_TOKEN_DURATION_MINUTES);
    
    const newRefreshExpiresAt = new Date();
    newRefreshExpiresAt.setDate(newRefreshExpiresAt.getDate() + REFRESH_TOKEN_DURATION_DAYS);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: newAccessExpiresAt,
        refreshExpiresAt: newRefreshExpiresAt,
      },
    });

    // Set new refresh token cookie (rotation)
    setRefreshTokenCookie(reply, newRefreshToken, newRefreshExpiresAt);

    return sendSuccess(reply, {
      user: session.user,
      accessToken: newAccessToken,
      expiresAt: newAccessExpiresAt,
    });
  });

  // Logout
  fastify.post('/logout', { preHandler: requireAuth }, async (request, reply) => {
    if (request.session) {
      await prisma.userSession.delete({
        where: { id: request.session.id },
      });
    }

    // Clear refresh token cookie
    clearRefreshTokenCookie(reply);

    return sendSuccess(reply, { message: 'Berhasil logout' });
  });

  // Get current user
  fastify.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user;

    if (!user) {
      return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Tidak terautentikasi', 401);
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
  });
}
