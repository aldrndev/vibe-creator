import type { Prisma } from '@prisma/client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import {
  resolveTargetDurationRangeConfig,
  type TargetDurationRange,
} from '../analysis-duration-config';
import type { HeuristicScoreBreakdown } from '../analysis-score-breakdown';
import {
  type AnalysisAiPromptCandidate,
  type AnalysisAiProvider,
  type AnalysisAiRating,
  requestAnalysisAiRatings,
} from './analysis-ai-rerank-client';
import {
  type AnalysisRuleScoreBreakdown,
  type DirectorRerankProvider,
  scoreCandidateWithRules,
  toRuleScoreMetadata,
} from './analysis-rule-scorer';

interface AnalysisAiCandidateInput {
  startMs: number;
  endMs: number;
  score: number | null;
  rank: number;
  tags: string[];
  scoreBreakdown: HeuristicScoreBreakdown;
  previewStorageKey?: string | null;
  videoPreviewStorageKey?: string | null;
  refinementVersion?: number;
  sourceStartMs?: number;
  sourceEndMs?: number;
  refinedStartMs?: number;
  refinedEndMs?: number;
  transcriptWindow?: Prisma.JsonObject;
  transcriptCacheKey?: string | null;
}

interface AnalysisAiRerankMetadata {
  provider: AnalysisAiProvider;
  rerankProvider: DirectorRerankProvider;
  label: string;
  reason: string;
  viralScore: number;
  hookScore: number;
  clarityScore: number;
  heuristicScore: number;
  compositeScore: number;
  ruleScores: AnalysisRuleScoreBreakdown;
  contentModeSuggestion: HeuristicScoreBreakdown['contentModeSuggestion'];
  scoreBreakdown: HeuristicScoreBreakdown;
}

interface AnalysisAiRerankedCandidate extends AnalysisAiCandidateInput {
  score: number;
  rank: number;
  metadata: Prisma.JsonObject;
}

interface AnalysisAiScoreResult {
  metadata: AnalysisAiRerankMetadata;
  finalCompositeScore: number;
}

const IDEAL_SHORT_MIN_SECONDS = 30;
const IDEAL_SHORT_MAX_SECONDS = 90;
const EXTENDED_SHORT_MAX_SECONDS = 120;
const FAST_CLIP_MAX_SECONDS = 20;
const MAX_SHORT_SECONDS = 120;
const STRONG_DIALOG_SCORE = 72;
const MEDIUM_DIALOG_SCORE = 62;
const DIALOG_COMPLETION_DURATION_FIT = 82;
const HIGH_VISUAL_PENALTY = 25;
const MEDIUM_VISUAL_PENALTY = 14;
const TRANSCRIPT_WINDOW_PADDING_MS = 8_000;

interface DurationReadinessWindow {
  idealShortMinSeconds: number;
  idealShortMaxSeconds: number;
  extendedShortMaxSeconds: number;
}

interface AnalysisAiRerankOptions {
  targetDurationRange?: TargetDurationRange;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getDurationSeconds(candidate: AnalysisAiCandidateInput): number {
  return Math.max(1, Math.round((candidate.endMs - candidate.startMs) / 1000));
}

function getHeuristicScore(candidate: AnalysisAiCandidateInput): number {
  return clampScore((candidate.score ?? 0) * 100);
}

function resolveDurationReadinessWindow(
  targetDurationRange: TargetDurationRange | undefined,
): DurationReadinessWindow {
  if (!targetDurationRange || targetDurationRange === 'auto') {
    return {
      idealShortMinSeconds: IDEAL_SHORT_MIN_SECONDS,
      idealShortMaxSeconds: IDEAL_SHORT_MAX_SECONDS,
      extendedShortMaxSeconds: EXTENDED_SHORT_MAX_SECONDS,
    };
  }

  const resolvedRange = resolveTargetDurationRangeConfig(targetDurationRange);
  const idealShortMinSeconds = Math.round(resolvedRange.minClipDurationMs / 1000);
  const idealShortMaxSeconds = Math.round(resolvedRange.maxClipDurationMs / 1000);

  return {
    idealShortMinSeconds,
    idealShortMaxSeconds,
    extendedShortMaxSeconds: Math.min(MAX_SHORT_SECONDS, idealShortMaxSeconds + 20),
  };
}

function hasBadge(candidate: AnalysisAiCandidateInput, badge: string): boolean {
  return candidate.scoreBreakdown.badges.includes(badge);
}

function isDialogCompleteProxy(candidate: AnalysisAiCandidateInput): boolean {
  return (
    candidate.scoreBreakdown.dialogDensity >= STRONG_DIALOG_SCORE &&
    candidate.scoreBreakdown.durationFit >= DIALOG_COMPLETION_DURATION_FIT
  );
}

function calculateDurationAdjustment(
  durationSeconds: number,
  durationWindow: DurationReadinessWindow,
  isDialogComplete: boolean,
): number {
  if (
    durationSeconds >= durationWindow.idealShortMinSeconds &&
    durationSeconds <= durationWindow.idealShortMaxSeconds
  ) {
    return 12;
  }
  if (
    durationSeconds > durationWindow.idealShortMaxSeconds &&
    durationSeconds <= durationWindow.extendedShortMaxSeconds
  ) {
    return isDialogComplete ? 5 : -4;
  }
  if (
    durationSeconds > durationWindow.extendedShortMaxSeconds &&
    durationSeconds <= MAX_SHORT_SECONDS
  ) {
    return isDialogComplete ? -10 : -16;
  }
  if (durationSeconds < durationWindow.idealShortMinSeconds) {
    return durationSeconds < 30 ? -9 : -4;
  }
  return -20;
}

function calculateDialogAdjustment(dialogDensity: number, durationFit: number): number {
  let adjustment = 0;

  if (dialogDensity >= STRONG_DIALOG_SCORE) {
    adjustment += 7;
  } else if (dialogDensity >= MEDIUM_DIALOG_SCORE) {
    adjustment += 3;
  } else {
    adjustment -= 4;
  }

  if (durationFit >= 88) {
    adjustment += 5;
  } else if (durationFit >= 78) {
    adjustment += 2;
  }

  return adjustment;
}

function calculateVisualAdjustment(visualPenalty: number, hasNeedReviewBadge: boolean): number {
  if (hasNeedReviewBadge || visualPenalty >= HIGH_VISUAL_PENALTY) {
    return -18;
  }
  if (visualPenalty >= MEDIUM_VISUAL_PENALTY) {
    return -6;
  }
  return 0;
}

function getShortReadinessAdjustment(
  candidate: AnalysisAiCandidateInput,
  durationWindow: DurationReadinessWindow,
): number {
  const durationSeconds = getDurationSeconds(candidate);
  const dialogDensity = candidate.scoreBreakdown.dialogDensity;
  const durationFit = candidate.scoreBreakdown.durationFit;
  const visualPenalty = candidate.scoreBreakdown.visualPenalty;
  const hasStrongDialogBadge = hasBadge(candidate, 'Dialog Padat');
  const hasNeedReviewBadge = hasBadge(candidate, 'Butuh Review');
  const isDialogComplete = isDialogCompleteProxy(candidate);

  let adjustment = calculateDurationAdjustment(durationSeconds, durationWindow, isDialogComplete);
  adjustment += calculateDialogAdjustment(dialogDensity, durationFit);
  adjustment += calculateVisualAdjustment(visualPenalty, hasNeedReviewBadge);

  if (candidate.tags.includes('HIGH ENERGY') || hasBadge(candidate, 'Hook Kuat')) {
    adjustment += 4;
  }

  if (hasStrongDialogBadge) {
    adjustment += 3;
  }

  if (candidate.rank <= 3) {
    adjustment += 2;
  }

  return adjustment;
}

function getShortReadinessScore(
  candidate: AnalysisAiCandidateInput,
  durationWindow: DurationReadinessWindow,
): number {
  const heuristicScore = getHeuristicScore(candidate);
  const ruleScores = scoreCandidateWithRules(candidate);
  return clampScore(
    ruleScores.compositeScore * 0.72 +
      (heuristicScore + getShortReadinessAdjustment(candidate, durationWindow)) * 0.28,
  );
}

function buildHeuristicLabelMeta(
  candidate: AnalysisAiCandidateInput,
  durationWindow: DurationReadinessWindow,
): {
  label: string;
  reason: string;
} {
  const durationSeconds = getDurationSeconds(candidate);
  const hasHighEnergy = candidate.tags.includes('HIGH ENERGY');
  const hasNeedReviewBadge = hasBadge(candidate, 'Butuh Review');
  const hasStrongDialog = isDialogCompleteProxy(candidate);

  if (hasNeedReviewBadge) {
    return {
      label: 'Perlu Cek Ulang',
      reason: 'Sinyal visual mengindikasikan bagian ini berisiko kurang rapi untuk short final.',
    };
  }

  if (hasHighEnergy && durationSeconds <= FAST_CLIP_MAX_SECONDS) {
    return {
      label: 'Hook Cepat',
      reason: 'Tempo tinggi dan singkat, cocok untuk pembuka short yang langsung menghentak.',
    };
  }

  if (
    durationSeconds >= durationWindow.idealShortMinSeconds &&
    durationSeconds <= durationWindow.idealShortMaxSeconds
  ) {
    return {
      label: 'Short Utuh',
      reason: `Durasi ${durationWindow.idealShortMinSeconds}-${durationWindow.idealShortMaxSeconds} detik paling aman untuk menjaga narasi tetap lengkap dan rapi.`,
    };
  }

  if (
    durationSeconds > durationWindow.idealShortMaxSeconds &&
    durationSeconds <= durationWindow.extendedShortMaxSeconds &&
    hasStrongDialog
  ) {
    return {
      label: 'Dialog Aman',
      reason:
        'Durasi lebih panjang dipertahankan karena dialog dan penutupan scene terdeteksi aman.',
    };
  }

  return {
    label: 'Cadangan Bagus',
    reason: 'Masih layak dipakai sebagai alternatif, tapi bukan prioritas utama short final.',
  };
}

function buildHeuristicMeta(
  candidate: AnalysisAiCandidateInput,
  durationWindow: DurationReadinessWindow,
): AnalysisAiScoreResult {
  const heuristicScore = getHeuristicScore(candidate);
  const ruleScores = scoreCandidateWithRules(candidate);
  const shortReadinessScore = getShortReadinessScore(candidate, durationWindow);
  const labelMeta = buildHeuristicLabelMeta(candidate, durationWindow);
  const primaryLabel = ruleScores.reasonLabels[0] ?? labelMeta.label;

  return {
    metadata: {
      provider: 'heuristic',
      rerankProvider: 'rules',
      label: primaryLabel,
      reason: labelMeta.reason,
      viralScore: clampScore(shortReadinessScore + 2),
      hookScore: ruleScores.hookScore,
      clarityScore: ruleScores.clarityScore,
      heuristicScore,
      compositeScore: shortReadinessScore,
      ruleScores,
      contentModeSuggestion: candidate.scoreBreakdown.contentModeSuggestion,
      scoreBreakdown: candidate.scoreBreakdown,
    },
    finalCompositeScore: shortReadinessScore,
  };
}

function buildMetadata(
  meta: AnalysisAiRerankMetadata,
  candidate: AnalysisAiCandidateInput,
): Prisma.JsonObject {
  const ruleMetadata = toRuleScoreMetadata(meta.ruleScores, meta.rerankProvider);
  const transcriptWindow =
    candidate.transcriptWindow ??
    ({
      startMs: Math.max(0, candidate.startMs - TRANSCRIPT_WINDOW_PADDING_MS),
      endMs: candidate.endMs + TRANSCRIPT_WINDOW_PADDING_MS,
      status: 'pending-selection-transcribe',
    } satisfies Prisma.JsonObject);

  return {
    aiRerank: {
      provider: meta.provider,
      rerankProvider: meta.rerankProvider,
      label: meta.label,
      reason: meta.reason,
      viralScore: meta.viralScore,
      hookScore: meta.hookScore,
      clarityScore: meta.clarityScore,
      heuristicScore: meta.heuristicScore,
      compositeScore: meta.compositeScore,
      contentModeSuggestion: meta.contentModeSuggestion,
      reasonLabels: meta.ruleScores.reasonLabels,
    },
    scoreBreakdown: {
      energy: meta.scoreBreakdown.energy,
      dialogDensity: meta.scoreBreakdown.dialogDensity,
      durationFit: meta.scoreBreakdown.durationFit,
      visualPenalty: meta.scoreBreakdown.visualPenalty,
      topSignals: meta.scoreBreakdown.topSignals,
      badges: meta.scoreBreakdown.badges,
      contentModeSuggestion: meta.scoreBreakdown.contentModeSuggestion,
      rule: ruleMetadata.scoreBreakdown,
    },
    refinementVersion: candidate.refinementVersion ?? 1,
    sourceStartMs: candidate.sourceStartMs ?? candidate.startMs,
    sourceEndMs: candidate.sourceEndMs ?? candidate.endMs,
    refinedStartMs: candidate.refinedStartMs ?? candidate.startMs,
    refinedEndMs: candidate.refinedEndMs ?? candidate.endMs,
    transcriptWindow,
    transcriptCacheKey: candidate.transcriptCacheKey ?? null,
    rerankProvider: meta.rerankProvider,
  };
}

function buildCompositeScore(
  candidate: AnalysisAiCandidateInput,
  rating: AnalysisAiRating | null,
  durationWindow: DurationReadinessWindow,
): AnalysisAiScoreResult {
  const heuristicScore = getHeuristicScore(candidate);
  const shortReadinessScore = getShortReadinessScore(candidate, durationWindow);
  const ruleScores = scoreCandidateWithRules(candidate);

  if (!rating) {
    return buildHeuristicMeta(candidate, durationWindow);
  }

  const aiCompositeScore = clampScore(
    rating.viralScore * 0.45 + rating.hookScore * 0.35 + rating.clarityScore * 0.2,
  );
  const weightedCompositeScore = clampScore(shortReadinessScore * 0.65 + aiCompositeScore * 0.35);
  const finalCompositeScore =
    ruleScores.riskFlags.length > 0
      ? Math.min(weightedCompositeScore, ruleScores.compositeScore)
      : weightedCompositeScore;

  return {
    metadata: {
      provider: 'heuristic',
      rerankProvider: 'rules',
      label: rating.label.trim(),
      reason: rating.reason.trim(),
      viralScore: clampScore(rating.viralScore),
      hookScore: clampScore(rating.hookScore),
      clarityScore: clampScore(rating.clarityScore),
      heuristicScore,
      compositeScore: aiCompositeScore,
      ruleScores,
      contentModeSuggestion: candidate.scoreBreakdown.contentModeSuggestion,
      scoreBreakdown: {
        ...candidate.scoreBreakdown,
        badges: Array.from(
          new Set([
            ...candidate.scoreBreakdown.badges,
            ...ruleScores.reasonLabels,
            ...(rating.hookScore >= 85 ? ['Hook Kuat'] : []),
          ]),
        ),
        topSignals: Array.from(
          new Set([
            ...candidate.scoreBreakdown.topSignals,
            `Hook ${clampScore(rating.hookScore)}`,
            `Clarity ${clampScore(rating.clarityScore)}`,
            `Completion ${ruleScores.completionScore}`,
          ]),
        ).slice(0, 4),
      },
    },
    finalCompositeScore,
  };
}

function applyProviderToMetadata(
  metadata: AnalysisAiRerankMetadata,
  provider: AnalysisAiProvider,
): AnalysisAiRerankMetadata {
  return {
    ...metadata,
    provider,
    rerankProvider: provider === 'ollama' ? 'ollama' : metadata.rerankProvider,
  };
}

export const directorAnalysisAiRerankService = {
  async rerankCandidates(
    candidates: AnalysisAiCandidateInput[],
    options: AnalysisAiRerankOptions = {},
  ): Promise<AnalysisAiRerankedCandidate[]> {
    if (candidates.length === 0) {
      return [];
    }
    const durationWindow = resolveDurationReadinessWindow(options.targetDurationRange);

    let provider: AnalysisAiProvider = 'heuristic';
    let ratings: AnalysisAiRating[] | null = null;

    if (env.DIRECTOR_LOCAL_RERANK_ENABLED) {
      try {
        const response = await requestAnalysisAiRatings(
          candidates.map<AnalysisAiPromptCandidate>((candidate) => {
            const ruleScores = scoreCandidateWithRules(candidate);
            return {
              durationSeconds: getDurationSeconds(candidate),
              heuristicScore: getHeuristicScore(candidate),
              rank: candidate.rank,
              tags: candidate.tags,
              energy: candidate.scoreBreakdown.energy,
              dialogDensity: candidate.scoreBreakdown.dialogDensity,
              durationFit: candidate.scoreBreakdown.durationFit,
              visualPenalty: candidate.scoreBreakdown.visualPenalty,
              completionScore: ruleScores.completionScore,
              standaloneScore: ruleScores.standaloneScore,
              reasonLabels: ruleScores.reasonLabels,
            };
          }),
        );
        provider = response.provider;
        ratings = response.ratings;
      } catch (error) {
        logger.warn({ error }, 'Analysis AI rerank request failed');
      }
    }

    const ratedCandidates = candidates
      .map((candidate, index) => {
        const rating = ratings?.find((item) => item.index === index) ?? null;
        const scoreResult = buildCompositeScore(candidate, rating, durationWindow);
        const metadata = applyProviderToMetadata(scoreResult.metadata, provider);

        return {
          ...candidate,
          score: scoreResult.finalCompositeScore / 100,
          rank: candidate.rank,
          metadata: buildMetadata(metadata, candidate),
          _compositeScore: scoreResult.finalCompositeScore,
        };
      })
      .sort((left, right) => right._compositeScore - left._compositeScore)
      .map(({ _compositeScore: _score, ...candidate }, index) => ({
        ...candidate,
        rank: index + 1,
      }));

    return ratedCandidates;
  },
};
