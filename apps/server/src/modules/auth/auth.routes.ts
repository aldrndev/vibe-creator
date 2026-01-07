import type { FastifyInstance } from "fastify";
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

import {
  createSession,
  ACCESS_TOKEN_DURATION_MINUTES,
  REFRESH_TOKEN_DURATION_DAYS,
} from "./auth.session";
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE,
} from "./auth.cookies";
import {
  registerRateLimit,
  loginRateLimit,
  refreshRateLimit,
} from "./auth.ratelimit";

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

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Register with stricter rate limit
  fastify.post("/register", registerRateLimit, async (request, reply) => {
    const body = registerSchema.parse(request.body);

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

    setRefreshTokenCookie(reply, tokens.refreshToken, tokens.refreshExpiresAt);

    return sendCreated(reply, {
      user,
      accessToken: tokens.accessToken,
      expiresAt: tokens.accessExpiresAt,
    });
  });

  // Login with stricter rate limit
  fastify.post("/login", loginRateLimit, async (request, reply) => {
    const body = loginSchema.parse(request.body);

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

    setRefreshTokenCookie(reply, tokens.refreshToken, tokens.refreshExpiresAt);

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
      accessToken: tokens.accessToken,
      expiresAt: tokens.accessExpiresAt,
    });
  });

  // Refresh Token - reads from HttpOnly cookie with rate limit
  fastify.post("/refresh", refreshRateLimit, async (request, reply) => {
    try {
      const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE];

      if (!refreshToken) {
        return sendError(
          reply,
          ERROR_CODES.TOKEN_EXPIRED,
          "Refresh token tidak ditemukan",
          400
        );
      }

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
        const expiredSession = await prisma.userSession.findFirst({
          where: { refreshToken: hashedRefreshToken },
          select: { userId: true },
        });

        if (expiredSession) {
          logger.warn(
            { userId: expiredSession.userId, ip: request.ip },
            "Refresh token reuse detected - revoking all sessions"
          );
          await prisma.userSession.deleteMany({
            where: { userId: expiredSession.userId },
          });
        }

        clearRefreshTokenCookie(reply);
        return sendError(
          reply,
          ERROR_CODES.TOKEN_EXPIRED,
          "Refresh token tidak valid atau sudah expired",
          401
        );
      }

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
          refreshToken: hashedNewRefreshToken,
          expiresAt: newAccessExpiresAt,
          refreshExpiresAt: newRefreshExpiresAt,
        },
      });

      setRefreshTokenCookie(reply, newRefreshToken, newRefreshExpiresAt);

      const subscription = await prisma.subscription.findUnique({
        where: { userId: session.userId },
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
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error({ err: error }, "Refresh token error");
      return sendError(
        reply,
        ERROR_CODES.INTERNAL_ERROR,
        `Refresh failed: ${errorMessage}`,
        500
      );
    }
  });

  // Logout
  fastify.post("/logout", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        await prisma.userSession.deleteMany({
          where: { token },
        });
      } catch {
        // Ignore errors
      }
    }

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
