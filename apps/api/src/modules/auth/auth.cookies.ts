/**
 * @module auth/cookies
 * @description Secure cookie management for authentication tokens.
 *
 * This module handles:
 * - HttpOnly cookie storage for refresh tokens
 * - Secure cookie attributes (HTTPS, SameSite)
 * - Cookie clearing for logout operations
 *
 * Security features:
 * - HttpOnly: Prevents XSS access to tokens
 * - Secure: HTTPS-only in production
 * - SameSite=Lax: CSRF protection
 */

import type { FastifyReply } from 'fastify';

/** Cookie name for the refresh token */
export const REFRESH_TOKEN_COOKIE = 'vibe_refresh_token';

/**
 * Sets the refresh token as a secure HttpOnly cookie.
 *
 * @param reply - Fastify reply object
 * @param refreshToken - Plain refresh token to store
 * @param expiresAt - Cookie expiration date
 *
 * @example
 * ```ts
 * setRefreshTokenCookie(reply, tokens.refreshToken, tokens.refreshExpiresAt);
 * ```
 */
export function setRefreshTokenCookie(
  reply: FastifyReply,
  refreshToken: string,
  expiresAt: Date,
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  reply.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/**
 * Clears the refresh token cookie.
 * Must use same attributes as setRefreshTokenCookie for browser to clear it.
 *
 * @param reply - Fastify reply object
 *
 * @example
 * ```ts
 * // On logout
 * clearRefreshTokenCookie(reply);
 * return sendSuccess(reply, { message: 'Logout successful' });
 * ```
 */
export function clearRefreshTokenCookie(reply: FastifyReply): void {
  const isProduction = process.env.NODE_ENV === 'production';

  reply.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
}
