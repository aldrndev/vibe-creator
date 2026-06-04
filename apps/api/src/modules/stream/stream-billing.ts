import type { StreamStatus } from '@prisma/client';

type StreamFinalStatus = 'ENDED' | 'FAILED';

interface CalculateStreamBilledMinutesInput {
  readonly previousStatus: StreamStatus;
  readonly finalStatus: StreamFinalStatus;
  readonly startedAt: Date;
  readonly finalizedAt: Date;
}

interface ResolveStreamEffectiveDurationInput {
  readonly isAdmin: boolean;
  readonly requestedDurationMinutes: number;
  readonly quotaRemainingMinutes: number;
  readonly absoluteMaxDurationMinutes: number;
}

export function calculateStreamBilledMinutes({
  previousStatus,
  finalStatus,
  startedAt,
  finalizedAt,
}: CalculateStreamBilledMinutesInput): number {
  if (previousStatus === 'STARTING' && finalStatus === 'FAILED') {
    return 0;
  }

  const seconds = Math.max(0, (finalizedAt.getTime() - startedAt.getTime()) / 1000);
  return Math.ceil(seconds / 60);
}

export function resolveStreamEffectiveDuration({
  isAdmin,
  requestedDurationMinutes,
  quotaRemainingMinutes,
  absoluteMaxDurationMinutes,
}: ResolveStreamEffectiveDurationInput): number {
  const quotaLimit = isAdmin ? absoluteMaxDurationMinutes : quotaRemainingMinutes;
  return Math.min(requestedDurationMinutes, quotaLimit, absoluteMaxDurationMinutes);
}
