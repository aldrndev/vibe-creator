import {
  resolveTargetDurationRangeConfig,
  type TargetDurationRange,
} from './analysis-duration-config';
import { type ContentModeSignal, guessContentMode, type ResolvedContentMode } from './content-mode';

export interface HeuristicScoreBreakdown {
  energy: number;
  dialogDensity: number;
  durationFit: number;
  visualPenalty: number;
  topSignals: string[];
  badges: string[];
  contentModeSuggestion: ResolvedContentMode;
}

export interface CandidateScoreBreakdownInput extends ContentModeSignal {}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getDurationFitScoreAuto(durationSeconds: number): number {
  if (durationSeconds >= 45 && durationSeconds <= 75) {
    return 92;
  }

  if (durationSeconds >= 30 && durationSeconds < 45) {
    return 86;
  }

  if (durationSeconds > 75 && durationSeconds <= 90) {
    return 84;
  }

  if (durationSeconds > 90 && durationSeconds <= 120) {
    return 76;
  }

  if (durationSeconds >= 20 && durationSeconds < 30) {
    return 60;
  }

  return 38;
}

function getDurationFitScoreByRange(
  durationSeconds: number,
  targetDurationRange: Exclude<TargetDurationRange, 'auto'>,
): number {
  const resolvedRange = resolveTargetDurationRangeConfig(targetDurationRange);
  const minDurationSeconds = Math.round(resolvedRange.minClipDurationMs / 1000);
  const maxDurationSeconds = Math.round(resolvedRange.maxClipDurationMs / 1000);

  if (durationSeconds >= minDurationSeconds && durationSeconds <= maxDurationSeconds) {
    return 92;
  }

  const lowerDistance = Math.max(0, minDurationSeconds - durationSeconds);
  const upperDistance = Math.max(0, durationSeconds - maxDurationSeconds);
  const distance = Math.max(lowerDistance, upperDistance);

  if (distance <= 10) {
    return clampScore(84 - distance * 2);
  }

  if (distance <= 20) {
    return clampScore(64 - (distance - 10) * 2.2);
  }

  return clampScore(38 - (distance - 20) * 1.5);
}

function getDurationFitScore(
  durationSeconds: number,
  targetDurationRange: TargetDurationRange | undefined,
): number {
  if (!targetDurationRange || targetDurationRange === 'auto') {
    return getDurationFitScoreAuto(durationSeconds);
  }

  return getDurationFitScoreByRange(durationSeconds, targetDurationRange);
}

function buildTopSignals(
  input: CandidateScoreBreakdownInput,
  targetDurationRange: TargetDurationRange | undefined,
): string[] {
  const durationFitScore = getDurationFitScore(input.durationSeconds, targetDurationRange);
  const signals: Array<{ label: string; weight: number }> = [
    { label: `Energy ${input.energyScore}`, weight: input.energyScore },
    { label: `Dialog ${input.dialogDensityScore}`, weight: input.dialogDensityScore },
    {
      label: `Durasi ${durationFitScore}`,
      weight: durationFitScore,
    },
  ];

  if (input.visualPenalty > 0) {
    signals.push({
      label: `Penalty visual ${input.visualPenalty}`,
      weight: 100 - input.visualPenalty,
    });
  }

  return signals
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 3)
    .map((signal) => signal.label);
}

function buildBadges(
  input: CandidateScoreBreakdownInput,
  contentModeSuggestion: ResolvedContentMode,
  targetDurationRange: TargetDurationRange | undefined,
): string[] {
  const badges = new Set<string>(['Highlight']);

  if (input.durationSeconds <= 20) {
    badges.add('Fast');
  }

  if (input.energyScore >= 78 || input.tags.includes('HIGH ENERGY')) {
    badges.add('High Energy');
  }

  if (input.dialogDensityScore >= 76 || input.tags.includes('DENSE SPEECH')) {
    badges.add('Dialog Padat');
  }

  if (getDurationFitScore(input.durationSeconds, targetDurationRange) >= 85) {
    badges.add('Durasi Pas');
  }

  if (contentModeSuggestion === 'cinematic') {
    badges.add('Sinematik');
  }

  if (contentModeSuggestion === 'product-review') {
    badges.add('Product Focus');
  }

  if (contentModeSuggestion === 'interview') {
    badges.add('Interview');
  }

  if (
    input.visualPenalty >= 25 ||
    input.tags.includes('BLACK SCREEN') ||
    input.tags.includes('STATIC')
  ) {
    badges.add('Butuh Review');
  }

  return [...badges];
}

export function buildHeuristicScoreBreakdown(
  input: CandidateScoreBreakdownInput,
  options?: {
    targetDurationRange?: TargetDurationRange;
  },
): HeuristicScoreBreakdown {
  const targetDurationRange = options?.targetDurationRange;
  const contentModeSuggestion = guessContentMode(input);
  const durationFit = getDurationFitScore(input.durationSeconds, targetDurationRange);

  return {
    energy: clampScore(input.energyScore),
    dialogDensity: clampScore(input.dialogDensityScore),
    durationFit,
    visualPenalty: clampScore(input.visualPenalty),
    topSignals: buildTopSignals(input, targetDurationRange),
    badges: buildBadges(input, contentModeSuggestion, targetDurationRange),
    contentModeSuggestion,
  };
}
