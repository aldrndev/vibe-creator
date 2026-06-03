import { REFRESH_TOKEN_COOKIE } from '@/modules/auth/auth.cookies';
import type { ChangePasswordRequest, UpdateProfileRequest } from '@/modules/auth/auth.schemas';
import { hashPassword, hashToken, verifyPassword } from '@/utils/crypto';
import {
  type AuthProfileSnapshot,
  findAuthProfile,
  findUserPasswordHash,
  updatePasswordAndRevokeOtherSessions,
  updateUserProfile,
} from './auth.repository';

export class AuthProfileError extends Error {
  constructor(readonly code: 'PROFILE_NOT_FOUND' | 'CURRENT_PASSWORD_INVALID') {
    super(code);
    this.name = 'AuthProfileError';
  }
}

export async function getAuthProfile(userId: string): Promise<AuthProfileSnapshot> {
  const profile = await findAuthProfile(userId);
  if (!profile) {
    throw new AuthProfileError('PROFILE_NOT_FOUND');
  }
  return profile;
}

export async function updateAuthProfile(
  userId: string,
  input: UpdateProfileRequest,
): Promise<AuthProfileSnapshot> {
  const profile = await updateUserProfile(userId, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
  });

  if (!profile) {
    throw new AuthProfileError('PROFILE_NOT_FOUND');
  }

  return profile;
}

export async function changeAuthPassword(params: {
  readonly userId: string;
  readonly input: ChangePasswordRequest;
  readonly refreshTokenCookie?: string;
}): Promise<{ revokedSessions: number }> {
  const passwordHash = await findUserPasswordHash(params.userId);
  if (!passwordHash) {
    throw new AuthProfileError('PROFILE_NOT_FOUND');
  }

  const isCurrentPasswordValid = await verifyPassword(params.input.currentPassword, passwordHash);
  if (!isCurrentPasswordValid) {
    throw new AuthProfileError('CURRENT_PASSWORD_INVALID');
  }

  const nextPasswordHash = await hashPassword(params.input.newPassword);
  const currentRefreshTokenHash = params.refreshTokenCookie
    ? hashToken(params.refreshTokenCookie)
    : undefined;

  const revokedSessions = await updatePasswordAndRevokeOtherSessions({
    userId: params.userId,
    passwordHash: nextPasswordHash,
    currentRefreshTokenHash,
  });

  return { revokedSessions };
}

export function readRefreshTokenCookie(
  cookies: Record<string, string | undefined>,
): string | undefined {
  return cookies[REFRESH_TOKEN_COOKIE];
}
