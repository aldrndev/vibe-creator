/**
 * @module auth/session
 * @description Session management for user authentication.
 *
 * This module handles:
 * - Access token generation (short-lived, 1 hour)
 * - Refresh token generation (long-lived, 30 days)
 * - Single session enforcement (one active session per user)
 * - Secure token storage (hashed refresh tokens in database)
 */

import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/utils/crypto";

/**
 * Access token duration in minutes.
 * Set to 1 hour for balance between security and UX.
 */
export const ACCESS_TOKEN_DURATION_MINUTES = 60;

/**
 * Refresh token duration in days.
 * Long-lived token for silent re-authentication.
 */
export const REFRESH_TOKEN_DURATION_DAYS = 30;

/**
 * Session tokens returned after authentication.
 */
interface SessionTokens {
  /** Short-lived access token for API requests */
  accessToken: string;
  /** Long-lived refresh token for obtaining new access tokens */
  refreshToken: string;
  /** Access token expiration timestamp */
  accessExpiresAt: Date;
  /** Refresh token expiration timestamp */
  refreshExpiresAt: Date;
}

/**
 * Creates a new authenticated session for a user.
 *
 * Security features:
 * - Invalidates all existing sessions (single session enforcement)
 * - Stores hashed refresh token in database
 * - Returns plain refresh token to client (stored in HttpOnly cookie)
 *
 * @param userId - The authenticated user's ID
 * @param userAgent - Request User-Agent header for session tracking
 * @param ipAddress - Request IP address for audit logging
 * @returns Session tokens for client storage
 *
 * @example
 * ```ts
 * const tokens = await createSession(
 *   user.id,
 *   request.headers['user-agent'],
 *   request.ip
 * );
 * ```
 */
export async function createSession(
  userId: string,
  userAgent: string | null,
  ipAddress: string
): Promise<SessionTokens> {
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
      refreshToken: hashedRefreshToken,
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
