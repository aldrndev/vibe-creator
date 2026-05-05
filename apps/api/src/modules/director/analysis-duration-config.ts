export const targetDurationRangeValues = ['auto', '20-40', '40-60', '60-90', '90-120'] as const;

export type TargetDurationRange = (typeof targetDurationRangeValues)[number];

export interface ClipDurationConfig {
  targetDurationRange: TargetDurationRange;
  minClipDurationMs: number;
  maxClipDurationMs: number;
}

export const DEFAULT_MIN_CLIP_DURATION_MS = 15_000;
export const DEFAULT_MAX_CLIP_DURATION_MS = 60_000;
export const DEFAULT_MAX_CANDIDATES = 20;
export const DIALOG_COMPLETION_EXTENSION_MS = 30_000;
export const ABSOLUTE_MAX_SHORT_DURATION_MS = 120_000;

const durationRangeBoundsMs: Record<
  Exclude<TargetDurationRange, 'auto'>,
  { minClipDurationMs: number; maxClipDurationMs: number }
> = {
  '20-40': {
    minClipDurationMs: 20_000,
    maxClipDurationMs: 40_000,
  },
  '40-60': {
    minClipDurationMs: 40_000,
    maxClipDurationMs: 60_000,
  },
  '60-90': {
    minClipDurationMs: 60_000,
    maxClipDurationMs: 90_000,
  },
  '90-120': {
    minClipDurationMs: 90_000,
    maxClipDurationMs: 120_000,
  },
};

function parsePositiveNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.round(value);
}

function isTargetDurationRange(value: unknown): value is TargetDurationRange {
  return targetDurationRangeValues.some((range) => range === value);
}

function resolveTargetDurationRangeFromBounds(
  minClipDurationMs: number,
  maxClipDurationMs: number,
): TargetDurationRange {
  const knownEntry = Object.entries(durationRangeBoundsMs).find(([, bounds]) => {
    return (
      bounds.minClipDurationMs === minClipDurationMs &&
      bounds.maxClipDurationMs === maxClipDurationMs
    );
  });

  if (!knownEntry) {
    return 'auto';
  }

  const [targetDurationRange] = knownEntry;
  return targetDurationRange as Exclude<TargetDurationRange, 'auto'>;
}

function getDistanceFromRangeMs(
  durationMs: number,
  minClipDurationMs: number,
  maxClipDurationMs: number,
): number {
  if (durationMs < minClipDurationMs) {
    return minClipDurationMs - durationMs;
  }

  if (durationMs > maxClipDurationMs) {
    return durationMs - maxClipDurationMs;
  }

  return 0;
}

export function resolveTargetDurationRangeConfig(
  targetDurationRange: TargetDurationRange | undefined,
): ClipDurationConfig {
  if (!targetDurationRange || targetDurationRange === 'auto') {
    return {
      targetDurationRange: 'auto',
      minClipDurationMs: DEFAULT_MIN_CLIP_DURATION_MS,
      maxClipDurationMs: DEFAULT_MAX_CLIP_DURATION_MS,
    };
  }

  const bounds = durationRangeBoundsMs[targetDurationRange];
  return {
    targetDurationRange,
    minClipDurationMs: bounds.minClipDurationMs,
    maxClipDurationMs: bounds.maxClipDurationMs,
  };
}

export function resolveClipDurationConfig(config: unknown): ClipDurationConfig {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return resolveTargetDurationRangeConfig('auto');
  }

  const cfg = config as Record<string, unknown>;
  const targetDurationRangeFromConfig = isTargetDurationRange(cfg.targetDurationRange)
    ? cfg.targetDurationRange
    : undefined;
  const rangeDefaults = resolveTargetDurationRangeConfig(targetDurationRangeFromConfig);
  const minClipDurationMs = parsePositiveNumber(
    cfg.minClipDuration,
    rangeDefaults.minClipDurationMs,
  );
  const maxClipDurationMs = parsePositiveNumber(
    cfg.maxClipDuration,
    rangeDefaults.maxClipDurationMs,
  );
  const normalizedMinClipDurationMs = Math.min(minClipDurationMs, maxClipDurationMs);
  const normalizedMaxClipDurationMs = Math.max(minClipDurationMs, maxClipDurationMs);

  return {
    targetDurationRange:
      targetDurationRangeFromConfig ??
      resolveTargetDurationRangeFromBounds(
        normalizedMinClipDurationMs,
        normalizedMaxClipDurationMs,
      ),
    minClipDurationMs: normalizedMinClipDurationMs,
    maxClipDurationMs: normalizedMaxClipDurationMs,
  };
}

export function resolveHardMaxCandidateDurationMs(maxClipDurationMs: number): number {
  return Math.min(
    ABSOLUTE_MAX_SHORT_DURATION_MS,
    maxClipDurationMs + DIALOG_COMPLETION_EXTENSION_MS,
  );
}

export function isConfigCompatible(
  config: unknown,
  targetDurationRange: TargetDurationRange,
): boolean {
  const expectedConfig = resolveTargetDurationRangeConfig(targetDurationRange);
  const currentConfig = resolveClipDurationConfig(config);

  return (
    expectedConfig.minClipDurationMs === currentConfig.minClipDurationMs &&
    expectedConfig.maxClipDurationMs === currentConfig.maxClipDurationMs
  );
}

export function preferCandidatesWithinTargetDurationRange<
  T extends {
    startMs: number;
    endMs: number;
    rank?: number;
  },
>(
  candidates: T[],
  targetDurationRange: TargetDurationRange,
): {
  candidates: T[];
  fallbackApplied: boolean;
} {
  if (candidates.length === 0 || targetDurationRange === 'auto') {
    return {
      candidates,
      fallbackApplied: false,
    };
  }

  const rangeConfig = resolveTargetDurationRangeConfig(targetDurationRange);
  const inRangeCandidates = candidates.filter((candidate) => {
    const durationMs = candidate.endMs - candidate.startMs;
    return (
      durationMs >= rangeConfig.minClipDurationMs && durationMs <= rangeConfig.maxClipDurationMs
    );
  });

  if (inRangeCandidates.length > 0) {
    return {
      candidates: inRangeCandidates,
      fallbackApplied: false,
    };
  }

  const sortedByRangeDistance = [...candidates].sort((left, right) => {
    const leftDurationMs = left.endMs - left.startMs;
    const rightDurationMs = right.endMs - right.startMs;
    const leftDistance = getDistanceFromRangeMs(
      leftDurationMs,
      rangeConfig.minClipDurationMs,
      rangeConfig.maxClipDurationMs,
    );
    const rightDistance = getDistanceFromRangeMs(
      rightDurationMs,
      rangeConfig.minClipDurationMs,
      rangeConfig.maxClipDurationMs,
    );

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    return (left.rank ?? 9999) - (right.rank ?? 9999);
  });

  const nearestCandidate = sortedByRangeDistance[0];
  if (!nearestCandidate) {
    return {
      candidates,
      fallbackApplied: true,
    };
  }

  const nearestDurationDistance = getDistanceFromRangeMs(
    nearestCandidate.endMs - nearestCandidate.startMs,
    rangeConfig.minClipDurationMs,
    rangeConfig.maxClipDurationMs,
  );
  const nearestCandidates = sortedByRangeDistance.filter((candidate) => {
    const durationMs = candidate.endMs - candidate.startMs;
    const durationDistance = getDistanceFromRangeMs(
      durationMs,
      rangeConfig.minClipDurationMs,
      rangeConfig.maxClipDurationMs,
    );
    return durationDistance === nearestDurationDistance;
  });

  return {
    candidates: nearestCandidates.sort((left, right) => (left.rank ?? 9999) - (right.rank ?? 9999)),
    fallbackApplied: true,
  };
}
