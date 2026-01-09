/**
 * @module auth/session
 * @description Session management for user authentication.
 *
 * This module handles:
 * - JWT access token generation (short-lived, ≤15 minutes per Digitesia Standard)
 * - Refresh token generation (opaque, long-lived, 7 days)
 * - Single session enforcement (one active session per user)
 * - Secure token storage (hashed refresh tokens in database)
 *
 * Per Digitesia Standard (digitesia-standard-backend.md § Authentication):
 * - Access tokens are JWTs with cryptographic signatures
 * - Refresh tokens are opaque with rotation and replay detection
 */

import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/utils/crypto";
import { signAccessToken } from "@/lib/jwt";
import { nanoid } from "nanoid";

/**
 * Access token duration in minutes.
 * Per Digitesia Standard: MAX 15 minutes for JWT access tokens
 */
export const ACCESS_TOKEN_DURATION_MINUTES = 15;

/**
 * Refresh token duration in days.
 * Long-lived opaque token for silent re-authentication.
 */
export const REFRESH_TOKEN_DURATION_DAYS = 7;

/**
 * Session tokens returned after authentication.
 */
interface SessionTokens {
  /** Short-lived JWT access token for API requests */
  accessToken: string;
  /** Long-lived refresh token for obtaining new access tokens */
  refreshToken: string;
  /** Session ID for tracking */
  sessionId: string;
  /** Access token expiration timestamp */
  accessExpiresAt: Date;
  /** Refresh token expiration timestamp */
  refreshExpiresAt: Date;
}

/**
 * Creates a new authenticated session for a user.
 *
 * Security features:
 * - Generates signed JWT for access token (Digitesia Standard C1)
 * - Invalidates all existing sessions (single session enforcement)
 * - Stores hashed refresh token in database
 * - Returns plain refresh token to client (stored in HttpOnly cookie)
 * - Initializes token family for replay detection (Digitesia Standard C4)
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

  // Generate JWT access token (Digitesia Standard C1)
  const accessToken = await signAccessToken(userId);

  // Generate opaque refresh token
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

  // Initialize token family for replay detection (Digitesia Standard C4)
  const tokenFamily = nanoid();
  const sessionId = nanoid();

  await prisma.userSession.create({
    data: {
      id: sessionId,
      userId,
      token: sessionId, // Store session ID instead of access token (JWT is stateless)
      refreshToken: hashedRefreshToken,
      tokenFamily,
      parentTokenId: null, // First token in family has no parent
      userAgent,
      ipAddress,
      expiresAt: accessExpiresAt,
      refreshExpiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    sessionId,
    accessExpiresAt,
    refreshExpiresAt,
  };
}
