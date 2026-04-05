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

function buildTopSignals(input: CandidateScoreBreakdownInput): string[] {
  const signals: Array<{ label: string; weight: number }> = [
    { label: `Energy ${input.energyScore}`, weight: input.energyScore },
    { label: `Dialog ${input.dialogDensityScore}`, weight: input.dialogDensityScore },
    {
      label: `Durasi ${getDurationFitScore(input.durationSeconds)}`,
      weight: getDurationFitScore(input.durationSeconds),
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

function getDurationFitScore(durationSeconds: number): number {
  if (durationSeconds >= 18 && durationSeconds <= 35) {
    return 92;
  }

  if (durationSeconds >= 12 && durationSeconds < 18) {
    return 80;
  }

  if (durationSeconds > 35 && durationSeconds <= 45) {
    return 62;
  }

  return 46;
}

function buildBadges(
  input: CandidateScoreBreakdownInput,
  contentModeSuggestion: ResolvedContentMode,
): string[] {
  const badges = new Set<string>(['Highlight']);

  if (input.durationSeconds <= 18) {
    badges.add('Fast');
  }

  if (input.energyScore >= 78 || input.tags.includes('HIGH ENERGY')) {
    badges.add('High Energy');
  }

  if (input.dialogDensityScore >= 76 || input.tags.includes('DENSE SPEECH')) {
    badges.add('Dialog Padat');
  }

  if (getDurationFitScore(input.durationSeconds) >= 85) {
    badges.add('Durasi Pas');
  }

  if (contentModeSuggestion === 'cinematic') {
    badges.add('Sinematik');
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
): HeuristicScoreBreakdown {
  const contentModeSuggestion = guessContentMode(input);
  const durationFit = getDurationFitScore(input.durationSeconds);

  return {
    energy: clampScore(input.energyScore),
    dialogDensity: clampScore(input.dialogDensityScore),
    durationFit,
    visualPenalty: clampScore(input.visualPenalty),
    topSignals: buildTopSignals(input),
    badges: buildBadges(input, contentModeSuggestion),
    contentModeSuggestion,
  };
}
