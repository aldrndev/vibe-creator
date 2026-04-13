import type { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import type { HeuristicScoreBreakdown } from '../analysis-score-breakdown';
import {
  type AnalysisAiPromptCandidate,
  type AnalysisAiProvider,
  type AnalysisAiRating,
  requestAnalysisAiRatings,
} from './analysis-ai-rerank-client';

interface AnalysisAiCandidateInput {
  startMs: number;
  endMs: number;
  score: number | null;
  rank: number;
  tags: string[];
  scoreBreakdown: HeuristicScoreBreakdown;
  previewStorageKey?: string | null;
  videoPreviewStorageKey?: string | null;
}

interface AnalysisAiRerankMetadata {
  provider: AnalysisAiProvider;
  label: string;
  reason: string;
  viralScore: number;
  hookScore: number;
  clarityScore: number;
  heuristicScore: number;
  compositeScore: number;
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

const IDEAL_SHORT_MIN_SECONDS = 40;
const IDEAL_SHORT_MAX_SECONDS = 60;
const EXTENDED_SHORT_MAX_SECONDS = 80;
const FAST_CLIP_MAX_SECONDS = 20;
const MAX_SHORT_SECONDS = 120;
const STRONG_DIALOG_SCORE = 72;
const MEDIUM_DIALOG_SCORE = 62;
const DIALOG_COMPLETION_DURATION_FIT = 82;
const HIGH_VISUAL_PENALTY = 25;
const MEDIUM_VISUAL_PENALTY = 14;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getDurationSeconds(candidate: AnalysisAiCandidateInput): number {
  return Math.max(1, Math.round((candidate.endMs - candidate.startMs) / 1000));
}

function getHeuristicScore(candidate: AnalysisAiCandidateInput): number {
  return clampScore((candidate.score ?? 0) * 100);
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

function getShortReadinessAdjustment(candidate: AnalysisAiCandidateInput): number {
  const durationSeconds = getDurationSeconds(candidate);
  const dialogDensity = candidate.scoreBreakdown.dialogDensity;
  const durationFit = candidate.scoreBreakdown.durationFit;
  const visualPenalty = candidate.scoreBreakdown.visualPenalty;
  const hasStrongDialogBadge = hasBadge(candidate, 'Dialog Padat');
  const hasNeedReviewBadge = hasBadge(candidate, 'Butuh Review');
  let adjustment = 0;

  if (durationSeconds >= IDEAL_SHORT_MIN_SECONDS && durationSeconds <= IDEAL_SHORT_MAX_SECONDS) {
    adjustment += 12;
  } else if (
    durationSeconds > IDEAL_SHORT_MAX_SECONDS &&
    durationSeconds <= EXTENDED_SHORT_MAX_SECONDS
  ) {
    adjustment += isDialogCompleteProxy(candidate) ? 5 : -4;
  } else if (durationSeconds > EXTENDED_SHORT_MAX_SECONDS && durationSeconds <= MAX_SHORT_SECONDS) {
    adjustment -= isDialogCompleteProxy(candidate) ? 10 : 16;
  } else if (durationSeconds < IDEAL_SHORT_MIN_SECONDS) {
    adjustment -= durationSeconds < 30 ? 9 : 4;
  } else {
    adjustment -= 20;
  }

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

  if (candidate.tags.includes('HIGH ENERGY') || hasBadge(candidate, 'Hook Kuat')) {
    adjustment += 4;
  }

  if (hasStrongDialogBadge) {
    adjustment += 3;
  }

  if (hasNeedReviewBadge || visualPenalty >= HIGH_VISUAL_PENALTY) {
    adjustment -= 18;
  } else if (visualPenalty >= MEDIUM_VISUAL_PENALTY) {
    adjustment -= 6;
  }

  if (candidate.rank <= 3) {
    adjustment += 2;
  }

  return adjustment;
}

function getShortReadinessScore(candidate: AnalysisAiCandidateInput): number {
  const heuristicScore = getHeuristicScore(candidate);
  return clampScore(heuristicScore + getShortReadinessAdjustment(candidate));
}

function buildHeuristicLabelMeta(candidate: AnalysisAiCandidateInput): {
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

  if (durationSeconds >= IDEAL_SHORT_MIN_SECONDS && durationSeconds <= IDEAL_SHORT_MAX_SECONDS) {
    return {
      label: 'Short Utuh',
      reason: 'Durasi 40-60 detik paling aman untuk menjaga narasi tetap lengkap dan rapi.',
    };
  }

  if (
    durationSeconds > IDEAL_SHORT_MAX_SECONDS &&
    durationSeconds <= EXTENDED_SHORT_MAX_SECONDS &&
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

function buildHeuristicMeta(candidate: AnalysisAiCandidateInput): AnalysisAiScoreResult {
  const heuristicScore = getHeuristicScore(candidate);
  const shortReadinessScore = getShortReadinessScore(candidate);
  const labelMeta = buildHeuristicLabelMeta(candidate);

  return {
    metadata: {
      provider: 'heuristic',
      label: labelMeta.label,
      reason: labelMeta.reason,
      viralScore: clampScore(shortReadinessScore + 2),
      hookScore: clampScore(shortReadinessScore + 2),
      clarityScore: clampScore(shortReadinessScore + 4),
      heuristicScore,
      compositeScore: shortReadinessScore,
      contentModeSuggestion: candidate.scoreBreakdown.contentModeSuggestion,
      scoreBreakdown: candidate.scoreBreakdown,
    },
    finalCompositeScore: shortReadinessScore,
  };
}

function buildMetadata(meta: AnalysisAiRerankMetadata): Prisma.JsonObject {
  return {
    aiRerank: {
      provider: meta.provider,
      label: meta.label,
      reason: meta.reason,
      viralScore: meta.viralScore,
      hookScore: meta.hookScore,
      clarityScore: meta.clarityScore,
      heuristicScore: meta.heuristicScore,
      compositeScore: meta.compositeScore,
      contentModeSuggestion: meta.contentModeSuggestion,
    },
    scoreBreakdown: {
      energy: meta.scoreBreakdown.energy,
      dialogDensity: meta.scoreBreakdown.dialogDensity,
      durationFit: meta.scoreBreakdown.durationFit,
      visualPenalty: meta.scoreBreakdown.visualPenalty,
      topSignals: meta.scoreBreakdown.topSignals,
      badges: meta.scoreBreakdown.badges,
      contentModeSuggestion: meta.scoreBreakdown.contentModeSuggestion,
    },
  };
}

function buildCompositeScore(
  candidate: AnalysisAiCandidateInput,
  rating: AnalysisAiRating | null,
): AnalysisAiScoreResult {
  const heuristicScore = getHeuristicScore(candidate);
  const shortReadinessScore = getShortReadinessScore(candidate);

  if (!rating) {
    return buildHeuristicMeta(candidate);
  }

  const aiCompositeScore = clampScore(
    rating.viralScore * 0.45 + rating.hookScore * 0.35 + rating.clarityScore * 0.2,
  );
  const finalCompositeScore = clampScore(aiCompositeScore * 0.7 + shortReadinessScore * 0.3);

  return {
    metadata: {
      provider: 'heuristic',
      label: rating.label.trim(),
      reason: rating.reason.trim(),
      viralScore: clampScore(rating.viralScore),
      hookScore: clampScore(rating.hookScore),
      clarityScore: clampScore(rating.clarityScore),
      heuristicScore,
      compositeScore: aiCompositeScore,
      contentModeSuggestion: candidate.scoreBreakdown.contentModeSuggestion,
      scoreBreakdown: {
        ...candidate.scoreBreakdown,
        badges: Array.from(
          new Set([
            ...candidate.scoreBreakdown.badges,
            ...(rating.hookScore >= 85 ? ['Hook Kuat'] : []),
          ]),
        ),
        topSignals: Array.from(
          new Set([
            ...candidate.scoreBreakdown.topSignals,
            `Hook ${clampScore(rating.hookScore)}`,
            `Clarity ${clampScore(rating.clarityScore)}`,
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
  };
}

export const directorAnalysisAiRerankService = {
  async rerankCandidates(
    candidates: AnalysisAiCandidateInput[],
  ): Promise<AnalysisAiRerankedCandidate[]> {
    if (candidates.length === 0) {
      return [];
    }

    let provider: AnalysisAiProvider = 'heuristic';
    let ratings: AnalysisAiRating[] | null = null;

    try {
      const response = await requestAnalysisAiRatings(
        candidates.map<AnalysisAiPromptCandidate>((candidate) => ({
          durationSeconds: getDurationSeconds(candidate),
          heuristicScore: getHeuristicScore(candidate),
          rank: candidate.rank,
          tags: candidate.tags,
          energy: candidate.scoreBreakdown.energy,
          dialogDensity: candidate.scoreBreakdown.dialogDensity,
          durationFit: candidate.scoreBreakdown.durationFit,
          visualPenalty: candidate.scoreBreakdown.visualPenalty,
        })),
      );
      provider = response.provider;
      ratings = response.ratings;
    } catch (error) {
      logger.warn({ error }, 'Analysis AI rerank request failed');
    }

    const ratedCandidates = candidates
      .map((candidate, index) => {
        const rating = ratings?.find((item) => item.index === index) ?? null;
        const scoreResult = buildCompositeScore(candidate, rating);
        const metadata = applyProviderToMetadata(scoreResult.metadata, provider);

        return {
          ...candidate,
          score: scoreResult.finalCompositeScore / 100,
          rank: candidate.rank,
          metadata: buildMetadata(metadata),
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
