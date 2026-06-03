import type { SubscriptionTier } from '@prisma/client';

export const PRO_UNLIMITED_EXPORT_LIMIT = 999_999;

const EXPORT_LIMIT_BY_TIER: Record<SubscriptionTier, number> = {
  FREE: 5,
  CREATOR: 50,
  PRO: PRO_UNLIMITED_EXPORT_LIMIT,
};

export function getExportLimitForTier(tier: SubscriptionTier): number {
  return EXPORT_LIMIT_BY_TIER[tier];
}

export function resolveSubscriptionValidUntil(
  tier: SubscriptionTier,
  validDays: number,
): Date | null {
  if (tier === 'FREE') {
    return null;
  }

  return new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);
}
