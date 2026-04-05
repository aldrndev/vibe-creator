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

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getDurationSeconds(candidate: AnalysisAiCandidateInput): number {
  return Math.max(1, Math.round((candidate.endMs - candidate.startMs) / 1000));
}

function getHeuristicScore(candidate: AnalysisAiCandidateInput): number {
  return clampScore((candidate.score ?? 0) * 100);
}

function buildHeuristicMeta(candidate: AnalysisAiCandidateInput): AnalysisAiRerankMetadata {
  const durationSeconds = getDurationSeconds(candidate);
  const heuristicScore = getHeuristicScore(candidate);
  const hasHighEnergy = candidate.tags.includes('HIGH ENERGY');

  if (hasHighEnergy && durationSeconds <= 18) {
    return {
      provider: 'heuristic',
      label: 'Hook Cepat',
      reason: 'Tempo tinggi dan durasi singkat, cocok untuk pembuka yang langsung menarik.',
      viralScore: clampScore(heuristicScore + 8),
      hookScore: clampScore(heuristicScore + 12),
      clarityScore: clampScore(heuristicScore - 4),
      heuristicScore,
      compositeScore: clampScore(heuristicScore + 6),
      contentModeSuggestion: candidate.scoreBreakdown.contentModeSuggestion,
      scoreBreakdown: candidate.scoreBreakdown,
    };
  }

  if (durationSeconds >= 18 && durationSeconds <= 35) {
    return {
      provider: 'heuristic',
      label: 'Paling Seimbang',
      reason: 'Durasi dan ritme paling aman untuk Shorts tanpa terasa kepanjangan.',
      viralScore: clampScore(heuristicScore + 4),
      hookScore: clampScore(heuristicScore),
      clarityScore: clampScore(heuristicScore + 6),
      heuristicScore,
      compositeScore: clampScore(heuristicScore + 4),
      contentModeSuggestion: candidate.scoreBreakdown.contentModeSuggestion,
      scoreBreakdown: candidate.scoreBreakdown,
    };
  }

  return {
    provider: 'heuristic',
    label: 'Cadangan Bagus',
    reason: 'Masih layak dipakai sebagai alternatif saat butuh angle atau pacing berbeda.',
    viralScore: clampScore(heuristicScore),
    hookScore: clampScore(heuristicScore - 4),
    clarityScore: clampScore(heuristicScore + 2),
    heuristicScore,
    compositeScore: heuristicScore,
    contentModeSuggestion: candidate.scoreBreakdown.contentModeSuggestion,
    scoreBreakdown: candidate.scoreBreakdown,
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
): AnalysisAiRerankMetadata {
  const heuristicScore = getHeuristicScore(candidate);

  if (!rating) {
    return buildHeuristicMeta(candidate);
  }

  const compositeScore = clampScore(
    heuristicScore * 0.55 +
      rating.viralScore * 0.2 +
      rating.hookScore * 0.15 +
      rating.clarityScore * 0.1,
  );

  return {
    provider: 'heuristic',
    label: rating.label.trim(),
    reason: rating.reason.trim(),
    viralScore: clampScore(rating.viralScore),
    hookScore: clampScore(rating.hookScore),
    clarityScore: clampScore(rating.clarityScore),
    heuristicScore,
    compositeScore,
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
        const metadata = applyProviderToMetadata(buildCompositeScore(candidate, rating), provider);

        return {
          ...candidate,
          score: metadata.compositeScore / 100,
          rank: candidate.rank,
          metadata: buildMetadata(metadata),
          _compositeScore: metadata.compositeScore,
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
