import type { SubscriptionTier, UserRole } from '@prisma/client';
import {
  DIRECTOR_SOURCE_MIN_DURATION_MS,
  ERROR_CODES,
  type ErrorCode,
  formatDirectorSourceDuration,
  formatDirectorSourceSize,
  getDirectorSourceTierLimits,
} from '@vibe-creator/shared';
import { env } from '@/config/env';
import { paymentService } from '@/modules/payment/payment.service';

const DIRECTOR_MAX_DURATION_TOLERANCE_MS = 10_000;

export type DirectorSourceOrigin = 'upload' | 'url';

export interface DirectorSourceActor {
  readonly id: string;
  readonly role: UserRole;
}

export interface DirectorSourceLimits {
  readonly minDurationMs: number;
  readonly maxDurationMs: number;
  readonly maxSizeBytes: number;
  readonly maxDurationLabel: string;
  readonly maxSizeLabel: string;
}

export interface DirectorSourceLimitDetails extends Record<string, unknown> {
  readonly minDurationMs: number;
  readonly maxDurationMs: number;
  readonly maxSizeBytes: number;
  readonly maxDurationLabel: string;
  readonly maxSizeLabel: string;
}

/** Stable, user-safe error for AI Director source policy violations. */
export class DirectorSourceLimitError extends Error {
  readonly code: ErrorCode;
  readonly details: DirectorSourceLimitDetails;
  readonly statusCode = 400;

  constructor(input: {
    readonly code: ErrorCode;
    readonly message: string;
    readonly details: DirectorSourceLimitDetails;
  }) {
    super(input.message);
    this.name = 'DirectorSourceLimitError';
    this.code = input.code;
    this.details = input.details;
  }
}

/** Resolve upload/import limits for a subscription tier and role. */
export function getDirectorSourceLimits(input: {
  readonly tier: SubscriptionTier;
  readonly role: UserRole;
}): DirectorSourceLimits {
  if (input.role === 'ADMIN') {
    const maxSizeBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
    return {
      minDurationMs: DIRECTOR_SOURCE_MIN_DURATION_MS,
      maxDurationMs: env.MAX_VIDEO_DURATION_MS,
      maxSizeBytes,
      maxDurationLabel: formatDirectorSourceDuration(env.MAX_VIDEO_DURATION_MS),
      maxSizeLabel: formatDirectorSourceSize(maxSizeBytes),
    };
  }

  return getDirectorSourceTierLimits(input.tier);
}

/** Resolve authoritative AI Director source limits for the current authenticated user. */
export async function resolveDirectorSourceLimitsForActor(
  actor: DirectorSourceActor,
): Promise<DirectorSourceLimits> {
  if (actor.role === 'ADMIN') {
    return getDirectorSourceLimits({ tier: 'PRO', role: actor.role });
  }

  const subscription = await paymentService.getSubscription(actor.id);
  return getDirectorSourceLimits({ tier: subscription.tier, role: actor.role });
}

function buildLimitDetails(limits: DirectorSourceLimits): DirectorSourceLimitDetails {
  return {
    minDurationMs: limits.minDurationMs,
    maxDurationMs: limits.maxDurationMs,
    maxSizeBytes: limits.maxSizeBytes,
    maxDurationLabel: limits.maxDurationLabel,
    maxSizeLabel: limits.maxSizeLabel,
  };
}

function createTooLargeError(
  limits: DirectorSourceLimits,
  origin: DirectorSourceOrigin,
): DirectorSourceLimitError {
  if (origin === 'url') {
    return new DirectorSourceLimitError({
      code: ERROR_CODES.DIRECTOR_URL_TOO_LARGE,
      message:
        'Video dari URL melebihi batas paket kamu. Pilih video yang lebih kecil, video yang lebih pendek, atau upgrade paket.',
      details: buildLimitDetails(limits),
    });
  }

  return new DirectorSourceLimitError({
    code: ERROR_CODES.DIRECTOR_FILE_TOO_LARGE,
    message: `File melebihi batas paket kamu. Maksimal ${limits.maxSizeLabel} atau ${limits.maxDurationLabel}. Pilih video yang lebih kecil, kompres video, atau upgrade paket.`,
    details: buildLimitDetails(limits),
  });
}

/** Validate duration and size for AI Director uploads and URL imports. */
export function validateDirectorSourceVideo(input: {
  readonly durationSeconds: number;
  readonly sizeBytes?: number;
  readonly limits: DirectorSourceLimits;
  readonly origin: DirectorSourceOrigin;
}): void {
  if (typeof input.sizeBytes === 'number' && input.sizeBytes > input.limits.maxSizeBytes) {
    throw createTooLargeError(input.limits, input.origin);
  }

  const durationMs = Math.round(input.durationSeconds * 1000);
  if (Number.isFinite(durationMs) && durationMs > 0 && durationMs < input.limits.minDurationMs) {
    throw new DirectorSourceLimitError({
      code: ERROR_CODES.DIRECTOR_VIDEO_TOO_SHORT,
      message:
        'Video terlalu pendek. AI Director butuh video minimal 5 menit. Untuk video pendek, gunakan Video Studio.',
      details: buildLimitDetails(input.limits),
    });
  }

  if (
    Number.isFinite(durationMs) &&
    durationMs > input.limits.maxDurationMs + DIRECTOR_MAX_DURATION_TOLERANCE_MS
  ) {
    throw new DirectorSourceLimitError({
      code: ERROR_CODES.DIRECTOR_VIDEO_TOO_LONG,
      message: `Durasi video melebihi batas paket kamu. Maksimal ${input.limits.maxDurationLabel}. Pilih video yang lebih pendek atau upgrade paket.`,
      details: buildLimitDetails(input.limits),
    });
  }
}
