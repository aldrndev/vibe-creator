import type { SubscriptionTier } from '@prisma/client';
import type { LoopAspectRatio, LoopTransitionMode } from './loop.schemas';

const MIN_SEGMENT_DURATION_MS = 1000;

export const LOOP_TIER_MAX_DURATION_MS: Record<SubscriptionTier | 'ADMIN', number> = {
  FREE: 15 * 60 * 1000,
  CREATOR: 60 * 60 * 1000,
  PRO: 3 * 60 * 60 * 1000,
  ADMIN: 3 * 60 * 60 * 1000,
};

export interface LoopTimingInput {
  readonly selectedSegmentDurationMs: number;
  readonly targetDurationMs: number;
  readonly tierMaxDurationMs: number;
  readonly transitionMode: LoopTransitionMode;
}

export interface LoopTimingResult {
  readonly transitionDurationMs: number;
  readonly cycleDurationMs: number;
  readonly cycleCount: number;
  readonly actualDurationMs: number;
  readonly adjustedToTier: boolean;
}

/**
 * Resolves the automatic dissolve duration used by the original seamless-loop algorithm.
 */
export function resolveAutomaticTransitionDurationMs(segmentDurationMs: number): number {
  return Math.min(2000, Math.floor(segmentDurationMs * 0.3));
}

/**
 * Calculates a long-loop output using only complete cycles and the active tier limit.
 */
export function calculateLoopTiming(input: LoopTimingInput): LoopTimingResult {
  const segmentDurationMs = Math.round(input.selectedSegmentDurationMs);
  if (segmentDurationMs < MIN_SEGMENT_DURATION_MS) {
    throw new Error('Pilih potongan video minimal 1 detik.');
  }

  const transitionDurationMs =
    input.transitionMode === 'smooth' ? resolveAutomaticTransitionDurationMs(segmentDurationMs) : 0;

  const cycleDurationMs =
    input.transitionMode === 'smooth'
      ? segmentDurationMs - transitionDurationMs
      : segmentDurationMs;
  const requestedCycles = Math.max(1, Math.ceil(input.targetDurationMs / cycleDurationMs));
  const maximumCycles = Math.floor(input.tierMaxDurationMs / cycleDurationMs);

  if (maximumCycles < 1) {
    throw new Error('Potongan video melebihi batas durasi paket saat ini.');
  }

  const cycleCount = Math.min(requestedCycles, maximumCycles);
  return {
    transitionDurationMs,
    cycleDurationMs,
    cycleCount,
    actualDurationMs: cycleCount * cycleDurationMs,
    adjustedToTier: requestedCycles > maximumCycles,
  };
}

/**
 * Resolves fixed format output dimensions while leaving original footage untouched.
 */
export function resolveLoopOutputDimensions(
  ratio: LoopAspectRatio,
  source: { readonly width: number; readonly height: number },
  tier: SubscriptionTier | 'ADMIN',
): { width: number; height: number } {
  if (ratio === 'original') {
    return source;
  }

  const shortEdge = tier === 'FREE' ? 720 : 1080;
  switch (ratio) {
    case '16:9':
      return { width: tier === 'FREE' ? 1280 : 1920, height: shortEdge };
    case '9:16':
      return { width: shortEdge, height: tier === 'FREE' ? 1280 : 1920 };
    case '1:1':
      return { width: shortEdge, height: shortEdge };
    case '4:5':
      return { width: shortEdge, height: tier === 'FREE' ? 900 : 1350 };
  }
}
