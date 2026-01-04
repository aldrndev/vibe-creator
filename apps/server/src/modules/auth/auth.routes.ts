import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendSuccess, sendError, sendCreated } from "@/utils/response";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
} from "@/utils/crypto";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { requireAuth } from "@/plugins/auth";
import { ERROR_CODES } from "@vibe-creator/shared";
import { logger } from "@/lib/logger";

const registerSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  turnstileToken: z.string().min(1, "Captcha diperlukan"),
});

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password diperlukan"),
  turnstileToken: z.string().min(1, "Captcha diperlukan"),
});

// Token durations
const ACCESS_TOKEN_DURATION_MINUTES = 60; // 1 hour - balance between security and UX
const REFRESH_TOKEN_DURATION_DAYS = 30; // Long-lived

// Cookie name for refresh token
const REFRESH_TOKEN_COOKIE = "vibe_refresh_token";

/**
 * Set refresh token as HttpOnly cookie
 */
function setRefreshTokenCookie(
  reply: FastifyReply,
  refreshToken: string,
  expiresAt: Date
) {
  const isProduction = process.env.NODE_ENV === "production";

  reply.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Clear refresh token cookie
 * Must include same attributes as when setting for browser to clear it
 */
function clearRefreshTokenCookie(reply: FastifyReply) {
  const isProduction = process.env.NODE_ENV === "production";

  reply.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
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

  // Security: Store hashed refresh token in DB
  const hashedRefreshToken = hashToken(refreshToken);

  const accessExpiresAt = new Date();
  accessExpiresAt.setMinutes(
    accessExpiresAt.getMinutes() + ACCESS_TOKEN_DURATION_MINUTES
  );

  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(
    refreshExpiresAt.getDate() + REFRESH_TOKEN_DURATION_DAYS
  );

  await prisma.userSession.create({
    data: {
      userId,
      token: accessToken,
      refreshToken: hashedRefreshToken, // Store hashed
      userAgent,
      ipAddress,
      expiresAt: accessExpiresAt,
      refreshExpiresAt,
    },
  });

  return {
    accessToken,
    refreshToken, // Return plain token to client
    accessExpiresAt,
    refreshExpiresAt,
  };
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Rate limit configs for auth endpoints
  const registerRateLimit = {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: "1 hour",
        keyGenerator: (request: { ip: string }) => `register:${request.ip}`,
        errorResponseBuilder: () => ({
          success: false,
          error: {
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
            message:
              "Terlalu banyak percobaan daftar. Silakan coba lagi dalam 1 jam.",
          },
        }),
      },
    },
  };

  const loginRateLimit = {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "15 minutes",
        keyGenerator: (request: { ip: string }) => `login:${request.ip}`,
        errorResponseBuilder: () => ({
          success: false,
          error: {
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
            message:
              "Terlalu banyak percobaan masuk. Silakan coba lagi dalam 15 menit.",
          },
        }),
      },
    },
  };

  const refreshRateLimit = {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
        keyGenerator: (request: { ip: string }) => `refresh:${request.ip}`,
        errorResponseBuilder: () => ({
          success: false,
          error: {
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
            message:
              "Terlalu banyak permintaan refresh token. Mohon tunggu sebentar.",
          },
        }),
      },
    },
  };

  // Register with stricter rate limit
  fastify.post("/register", registerRateLimit, async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Verify Turnstile token
    const isValidCaptcha = await verifyTurnstileToken(
      body.turnstileToken,
      request.ip
    );
    if (!isValidCaptcha) {
      return sendError(
        reply,
        ERROR_CODES.VALIDATION_ERROR,
        "Verifikasi captcha gagal. Silakan coba lagi.",
        400
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    // Security: Generic error message to prevent user enumeration
    // Log actual reason internally for debugging
    if (existingUser) {
      logger.info(
        { email: body.email },
        "Registration attempt for existing email"
      );
      return sendError(
        reply,
        ERROR_CODES.VALIDATION_ERROR,
        "Registrasi gagal. Silakan periksa data Anda atau hubungi support.",
        400
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
            tier: "FREE",
            status: "ACTIVE",
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
      request.headers["user-agent"] ?? null,
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

  // Login with stricter rate limit
  fastify.post("/login", loginRateLimit, async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // Verify Turnstile token
    const isValidCaptcha = await verifyTurnstileToken(
      body.turnstileToken,
      request.ip
    );
    if (!isValidCaptcha) {
      return sendError(
        reply,
        ERROR_CODES.VALIDATION_ERROR,
        "Verifikasi captcha gagal. Silakan coba lagi.",
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
        "Email atau password salah",
        401
      );
    }

    const isValidPassword = await verifyPassword(body.password, user.password);

    if (!isValidPassword) {
      return sendError(
        reply,
        ERROR_CODES.INVALID_CREDENTIALS,
        "Email atau password salah",
        401
      );
    }

    const tokens = await createSession(
      user.id,
      request.headers["user-agent"] ?? null,
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

  // Refresh Token - reads from HttpOnly cookie with rate limit
  fastify.post("/refresh", refreshRateLimit, async (request, reply) => {
    try {
      // Get refresh token from cookie
      const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE];

      if (!refreshToken) {
        return sendError(
          reply,
          ERROR_CODES.TOKEN_EXPIRED,
          "Refresh token tidak ditemukan",
          400
        );
      }

      // Security: Hash the incoming token to match stored hash
      const hashedRefreshToken = hashToken(refreshToken);

      const session = await prisma.userSession.findFirst({
        where: {
          refreshToken: hashedRefreshToken,
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
        // Security: Potential token reuse attack detected
        // Check if this token was previously valid (indicates stolen token)
        const expiredSession = await prisma.userSession.findFirst({
          where: { refreshToken: hashedRefreshToken },
          select: { userId: true },
        });

        if (expiredSession) {
          // Token was valid before but already rotated - possible theft!
          // Revoke ALL sessions for this user as a security measure
          logger.warn(
            { userId: expiredSession.userId, ip: request.ip },
            "Refresh token reuse detected - revoking all sessions"
          );
          await prisma.userSession.deleteMany({
            where: { userId: expiredSession.userId },
          });
        }

        // Clear invalid cookie
        clearRefreshTokenCookie(reply);
        return sendError(
          reply,
          ERROR_CODES.TOKEN_EXPIRED,
          "Refresh token tidak valid atau sudah expired",
          401
        );
      }

      // Generate new tokens (ROTATION: new refresh token for security)
      const newAccessToken = generateToken();
      const newRefreshToken = generateToken(64);
      const hashedNewRefreshToken = hashToken(newRefreshToken);

      const newAccessExpiresAt = new Date();
      newAccessExpiresAt.setMinutes(
        newAccessExpiresAt.getMinutes() + ACCESS_TOKEN_DURATION_MINUTES
      );

      const newRefreshExpiresAt = new Date();
      newRefreshExpiresAt.setDate(
        newRefreshExpiresAt.getDate() + REFRESH_TOKEN_DURATION_DAYS
      );

      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          token: newAccessToken,
          refreshToken: hashedNewRefreshToken, // Store new hashed token
          expiresAt: newAccessExpiresAt,
          refreshExpiresAt: newRefreshExpiresAt,
        },
      });

      // Set new refresh token cookie (rotation)
      setRefreshTokenCookie(reply, newRefreshToken, newRefreshExpiresAt);

      const subscription = await prisma.subscription.findUnique({
        where: { userId: session.userId },
      });

      return sendSuccess(reply, {
        user: session.user,
        subscription,
        accessToken: newAccessToken,
        expiresAt: newAccessExpiresAt,
      });
    } catch (error: any) {
      logger.error({ err: error }, "Refresh token error");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        `Refresh failed: ${error.message}`,
        500
      );
    }
  });

  // Logout - doesn't require valid auth, always clears cookie
  fastify.post("/logout", async (request, reply) => {
    // Try to delete session if we have a valid token (best effort)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        await prisma.userSession.deleteMany({
          where: { token },
        });
      } catch {
        // Ignore errors - session might already be deleted
      }
    }

    // Also try to delete session using refresh token from cookie
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

    // ALWAYS clear refresh token cookie
    clearRefreshTokenCookie(reply);

    return sendSuccess(reply, { message: "Berhasil logout" });
  });

  // Get current user
  fastify.get("/me", { preHandler: requireAuth }, async (request, reply) => {
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
  });
}
