import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuditAction, audit } from '@/lib/audit';
import {
  changePasswordRequestSchema,
  updateProfileRequestSchema,
} from '@/modules/auth/auth.schemas';
import {
  AuthProfileError,
  changeAuthPassword,
  readRefreshTokenCookie,
  updateAuthProfile,
} from '@/modules/auth/auth-profile.service';
import { sendError, sendSuccess } from '@/utils/response';

export async function updateProfileHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Tidak terautentikasi', 401);
  }

  const parsed = updateProfileRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Validasi gagal', 400, {
      issues: parsed.error.issues,
    });
  }

  try {
    const profile = await updateAuthProfile(user.id, parsed.data);
    await audit({
      requestId: request.id,
      userId: user.id,
      tenantId: user.id,
      action: AuditAction.PROFILE_UPDATED,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? undefined,
      metadata: {
        fields: Object.keys(parsed.data),
      },
    });

    return sendSuccess(reply, profile);
  } catch (error) {
    if (error instanceof AuthProfileError && error.code === 'PROFILE_NOT_FOUND') {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Profil tidak ditemukan', 404);
    }
    return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Update profil gagal', 500);
  }
}

export async function changePasswordHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Tidak terautentikasi', 401);
  }

  const parsed = changePasswordRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Validasi gagal', 400, {
      issues: parsed.error.issues,
    });
  }

  try {
    const result = await changeAuthPassword({
      userId: user.id,
      input: parsed.data,
      refreshTokenCookie: readRefreshTokenCookie(request.cookies),
    });

    await audit({
      requestId: request.id,
      userId: user.id,
      tenantId: user.id,
      action: AuditAction.PASSWORD_CHANGED,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? undefined,
      metadata: {
        revokedSessions: result.revokedSessions,
      },
    });

    return sendSuccess(reply, {
      message: 'Password berhasil diubah.',
      revokedSessions: result.revokedSessions,
    });
  } catch (error) {
    if (error instanceof AuthProfileError && error.code === 'CURRENT_PASSWORD_INVALID') {
      return sendError(
        reply,
        ERROR_CODES.INVALID_CREDENTIALS,
        'Password saat ini tidak sesuai.',
        401,
      );
    }
    if (error instanceof AuthProfileError && error.code === 'PROFILE_NOT_FOUND') {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Profil tidak ditemukan', 404);
    }
    return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Ubah password gagal', 500);
  }
}
