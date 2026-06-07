import type { Prisma } from '@prisma/client';
import type { HeuristicScoreBreakdown } from '../analysis-score-breakdown';

export type DirectorRerankProvider = 'rules' | 'ollama' | 'heuristic';

export interface AnalysisRuleScorerInput {
  startMs: number;
  endMs: number;
  score: number | null;
  rank: number;
  tags: string[];
  scoreBreakdown: HeuristicScoreBreakdown;
}

export interface AnalysisRuleScoreBreakdown {
  hookScore: number;
  completionScore: number;
  standaloneScore: number;
  clarityScore: number;
  durationScore: number;
  visualScore: number;
  energyScore: number;
  compositeScore: number;
  reasonLabels: string[];
  riskFlags: string[];
}

const IDEAL_MIN_SECONDS = 30;
const IDEAL_CENTER_MIN_SECONDS = 45;
const IDEAL_CENTER_MAX_SECONDS = 75;
const IDEAL_MAX_SECONDS = 90;
const HARD_MAX_SECONDS = 120;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function durationSeconds(candidate: AnalysisRuleScorerInput): number {
  return Math.max(1, Math.round((candidate.endMs - candidate.startMs) / 1000));
}

function includesNormalized(values: readonly string[], needle: string): boolean {
  const normalizedNeedle = needle.toLowerCase();
  return values.some((value) => value.toLowerCase() === normalizedNeedle);
}

function hasSignal(candidate: AnalysisRuleScorerInput, signal: string): boolean {
  return (
    includesNormalized(candidate.tags, signal) ||
    includesNormalized(candidate.scoreBreakdown.badges, signal)
  );
}

function getDurationScore(seconds: number): number {
  if (seconds >= IDEAL_CENTER_MIN_SECONDS && seconds <= IDEAL_CENTER_MAX_SECONDS) {
    return 94;
  }

  if (seconds >= IDEAL_MIN_SECONDS && seconds < IDEAL_CENTER_MIN_SECONDS) {
    return 86;
  }

  if (seconds > IDEAL_CENTER_MAX_SECONDS && seconds <= IDEAL_MAX_SECONDS) {
    return 84;
  }

  if (seconds > IDEAL_MAX_SECONDS && seconds <= HARD_MAX_SECONDS) {
    return 68;
  }

  if (seconds >= 20 && seconds < IDEAL_MIN_SECONDS) {
    return 58;
  }

  return 28;
}

function getCompletionScore(candidate: AnalysisRuleScorerInput, seconds: number): number {
  const dialogDensity = candidate.scoreBreakdown.dialogDensity;
  const durationFit = candidate.scoreBreakdown.durationFit;
  const visualPenalty = candidate.scoreBreakdown.visualPenalty;
  const hasDialogSignal = hasSignal(candidate, 'Dialog Padat');
  const hasReviewSignal = hasSignal(candidate, 'Butuh Review');
  let score = 54;

  if (dialogDensity >= 76) {
    score += 22;
  } else if (dialogDensity >= 62) {
    score += 13;
  } else if (dialogDensity < 38) {
    score -= 16;
  }

  if (durationFit >= 86) {
    score += 16;
  } else if (durationFit >= 74) {
    score += 8;
  } else if (durationFit < 52) {
    score -= 14;
  }

  if (seconds >= IDEAL_MIN_SECONDS && seconds <= IDEAL_MAX_SECONDS) {
    score += 8;
  } else if (seconds < 24 || seconds > HARD_MAX_SECONDS) {
    score -= 24;
  }

  if (hasDialogSignal) {
    score += 5;
  }

  if (hasReviewSignal || visualPenalty >= 28) {
    score -= 24;
  } else if (visualPenalty >= 16) {
    score -= 8;
  }

  return clampScore(score);
}

function getStandaloneScore(candidate: AnalysisRuleScorerInput, seconds: number): number {
  const dialogScore = candidate.scoreBreakdown.dialogDensity;
  const energyScore = candidate.scoreBreakdown.energy;
  const durationScore = getDurationScore(seconds);
  const visualScore = 100 - candidate.scoreBreakdown.visualPenalty;
  return clampScore(
    dialogScore * 0.38 + durationScore * 0.28 + energyScore * 0.18 + visualScore * 0.16,
  );
}

function getHookScore(candidate: AnalysisRuleScorerInput, seconds: number): number {
  const fastBonus = seconds <= 45 ? 8 : 0;
  const rankBonus = candidate.rank <= 3 ? 5 : 0;
  const highEnergyBonus =
    hasSignal(candidate, 'High Energy') || hasSignal(candidate, 'HIGH ENERGY') ? 8 : 0;
  return clampScore(
    candidate.scoreBreakdown.energy * 0.72 + fastBonus + rankBonus + highEnergyBonus,
  );
}

function getReasonLabels(scores: {
  hookScore: number;
  completionScore: number;
  standaloneScore: number;
  clarityScore: number;
  durationScore: number;
  visualScore: number;
}): string[] {
  const labels: string[] = [];

  if (scores.hookScore >= 78) {
    labels.push('Hook kuat');
  }
  if (scores.completionScore >= 80) {
    labels.push('Kalimat selesai');
  }
  if (scores.standaloneScore >= 76) {
    labels.push('Mudah dipahami');
  }
  if (scores.durationScore >= 82) {
    labels.push('Durasi pas');
  }
  if (scores.visualScore >= 82) {
    labels.push('Visual jelas');
  }
  if (scores.clarityScore >= 78) {
    labels.push('Audio jelas');
  }

  return labels.length > 0 ? labels.slice(0, 4) : ['Momen menonjol'];
}

function getRiskFlags(
  candidate: AnalysisRuleScorerInput,
  scores: AnalysisRuleScoreBreakdown,
): string[] {
  const flags: string[] = [];
  const seconds = durationSeconds(candidate);

  if (scores.completionScore < 48) {
    flags.push('ending-cut-risk');
  }
  if (seconds < 24) {
    flags.push('too-short');
  }
  if (seconds > HARD_MAX_SECONDS) {
    flags.push('too-long');
  }
  if (candidate.scoreBreakdown.visualPenalty >= 28 || hasSignal(candidate, 'Butuh Review')) {
    flags.push('visual-risk');
  }
  if (candidate.scoreBreakdown.dialogDensity < 30 && candidate.scoreBreakdown.energy < 45) {
    flags.push('thin-moment');
  }

  return flags;
}

function applyRiskCaps(score: number, riskFlags: readonly string[]): number {
  let cappedScore = score;

  if (riskFlags.includes('ending-cut-risk')) {
    cappedScore = Math.min(cappedScore, 58);
  }
  if (riskFlags.includes('too-short')) {
    cappedScore = Math.min(cappedScore, 54);
  }
  if (riskFlags.includes('too-long')) {
    cappedScore = Math.min(cappedScore, 50);
  }
  if (riskFlags.includes('visual-risk')) {
    cappedScore = Math.min(cappedScore, 62);
  }

  return clampScore(cappedScore);
}

/**
 * Scores AI Director candidates locally using deterministic short-readiness signals.
 *
 * The scorer is intentionally transcript-light: it combines VAD/heuristic proxies,
 * duration fit, visual risk, and dialogue density so local analysis remains fast.
 */
export function scoreCandidateWithRules(
  candidate: AnalysisRuleScorerInput,
): AnalysisRuleScoreBreakdown {
  const seconds = durationSeconds(candidate);
  const durationScore = getDurationScore(seconds);
  const completionScore = getCompletionScore(candidate, seconds);
  const standaloneScore = getStandaloneScore(candidate, seconds);
  const hookScore = getHookScore(candidate, seconds);
  const visualScore = clampScore(100 - candidate.scoreBreakdown.visualPenalty);
  const energyScore = clampScore(candidate.scoreBreakdown.energy);
  const clarityScore = clampScore(
    candidate.scoreBreakdown.dialogDensity * 0.62 + visualScore * 0.24 + durationScore * 0.14,
  );
  const rawComposite = clampScore(
    hookScore * 0.2 +
      completionScore * 0.28 +
      standaloneScore * 0.2 +
      clarityScore * 0.14 +
      durationScore * 0.12 +
      visualScore * 0.04 +
      energyScore * 0.02,
  );
  const preliminary: AnalysisRuleScoreBreakdown = {
    hookScore,
    completionScore,
    standaloneScore,
    clarityScore,
    durationScore,
    visualScore,
    energyScore,
    compositeScore: rawComposite,
    reasonLabels: [],
    riskFlags: [],
  };
  const riskFlags = getRiskFlags(candidate, preliminary);
  const compositeScore = applyRiskCaps(rawComposite, riskFlags);
  const reasonLabels = getReasonLabels({
    hookScore,
    completionScore,
    standaloneScore,
    clarityScore,
    durationScore,
    visualScore,
  });

  return {
    ...preliminary,
    compositeScore,
    reasonLabels,
    riskFlags,
  };
}

/**
 * Converts local rule scores into JSON-safe candidate metadata.
 */
export function toRuleScoreMetadata(
  ruleScores: AnalysisRuleScoreBreakdown,
  provider: DirectorRerankProvider,
): Prisma.JsonObject {
  return {
    rerankProvider: provider,
    scoreBreakdown: {
      hookScore: ruleScores.hookScore,
      completionScore: ruleScores.completionScore,
      standaloneScore: ruleScores.standaloneScore,
      clarityScore: ruleScores.clarityScore,
      durationScore: ruleScores.durationScore,
      visualScore: ruleScores.visualScore,
      energyScore: ruleScores.energyScore,
      compositeScore: ruleScores.compositeScore,
      reasonLabels: ruleScores.reasonLabels,
      riskFlags: ruleScores.riskFlags,
    },
  };
}
