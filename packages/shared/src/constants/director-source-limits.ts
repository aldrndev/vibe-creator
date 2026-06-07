import type { SubscriptionTier } from '../types/subscription';

export const DIRECTOR_SOURCE_MIN_DURATION_MS = 5 * 60_000;

export interface DirectorSourceTierLimit {
  readonly minDurationMs: number;
  readonly maxDurationMs: number;
  readonly maxSizeBytes: number;
  readonly maxDurationLabel: string;
  readonly maxSizeLabel: string;
}

export const DIRECTOR_SOURCE_TIER_LIMITS: Record<SubscriptionTier, DirectorSourceTierLimit> = {
  FREE: {
    minDurationMs: DIRECTOR_SOURCE_MIN_DURATION_MS,
    maxDurationMs: 30 * 60_000,
    maxSizeBytes: 200 * 1024 * 1024,
    maxDurationLabel: '30 menit',
    maxSizeLabel: '200MB',
  },
  CREATOR: {
    minDurationMs: DIRECTOR_SOURCE_MIN_DURATION_MS,
    maxDurationMs: 90 * 60_000,
    maxSizeBytes: 750 * 1024 * 1024,
    maxDurationLabel: '90 menit',
    maxSizeLabel: '750MB',
  },
  PRO: {
    minDurationMs: DIRECTOR_SOURCE_MIN_DURATION_MS,
    maxDurationMs: 120 * 60_000,
    maxSizeBytes: Math.round(1.5 * 1024 * 1024 * 1024),
    maxDurationLabel: '120 menit',
    maxSizeLabel: '1.5GB',
  },
} as const;

export function getDirectorSourceTierLimits(tier: SubscriptionTier): DirectorSourceTierLimit {
  return DIRECTOR_SOURCE_TIER_LIMITS[tier];
}

export function formatDirectorSourceSize(bytes: number): string {
  const megabytes = bytes / 1024 / 1024;
  if (megabytes >= 1024) {
    const gigabytes = megabytes / 1024;
    return `${Number.isInteger(gigabytes) ? gigabytes.toFixed(0) : gigabytes.toFixed(1)}GB`;
  }

  return `${Math.round(megabytes)}MB`;
}

export function formatDirectorSourceDuration(durationMs: number): string {
  const minutes = Math.round(durationMs / 60_000);
  return `${minutes} menit`;
}
