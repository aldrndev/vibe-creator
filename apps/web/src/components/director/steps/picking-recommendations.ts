import type { Candidate } from '@/stores/director-store';

const IDEAL_SHORT_MIN_SECONDS = 18;
const IDEAL_SHORT_MAX_SECONDS = 35;
const FAST_CLIP_MAX_SECONDS = 18;

export interface PickingRecommendation {
  readonly candidateId: string;
  readonly label: string;
  readonly reason: string;
  readonly score: number;
}

function getAiRerankMeta(candidate: Candidate) {
  const aiRerank = candidate.metadata?.aiRerank;

  if (
    !aiRerank ||
    typeof aiRerank.label !== 'string' ||
    typeof aiRerank.reason !== 'string' ||
    typeof aiRerank.compositeScore !== 'number'
  ) {
    return null;
  }

  return aiRerank;
}

function getDurationSeconds(candidate: Candidate): number {
  return Math.max(1, Math.round((candidate.endMs - candidate.startMs) / 1000));
}

function getRecommendationScore(candidate: Candidate): number {
  const aiRerank = getAiRerankMeta(candidate);
  if (aiRerank) {
    return aiRerank.compositeScore;
  }

  const durationSeconds = getDurationSeconds(candidate);
  let total = candidate.score * 100;

  if (candidate.tags?.includes('HIGH ENERGY')) {
    total += 10;
  }

  if (durationSeconds >= IDEAL_SHORT_MIN_SECONDS && durationSeconds <= IDEAL_SHORT_MAX_SECONDS) {
    total += 12;
  } else if (durationSeconds <= FAST_CLIP_MAX_SECONDS) {
    total += 2;
  } else {
    total -= Math.min(10, durationSeconds - IDEAL_SHORT_MAX_SECONDS);
  }

  if (candidate.rank && candidate.rank <= 3) {
    total += 3;
  }

  return total;
}

function buildRecommendationMeta(
  candidate: Candidate,
): Omit<PickingRecommendation, 'candidateId' | 'score'> {
  const aiRerank = getAiRerankMeta(candidate);
  if (aiRerank) {
    return {
      label: aiRerank.label,
      reason: aiRerank.reason,
    };
  }

  const durationSeconds = getDurationSeconds(candidate);
  const hasHighEnergy = candidate.tags?.includes('HIGH ENERGY') ?? false;

  if (hasHighEnergy && durationSeconds <= FAST_CLIP_MAX_SECONDS) {
    return {
      label: 'Hook Cepat',
      reason: 'Tempo tinggi dan durasi singkat, cocok untuk pembuka yang langsung menarik.',
    };
  }

  if (durationSeconds >= IDEAL_SHORT_MIN_SECONDS && durationSeconds <= IDEAL_SHORT_MAX_SECONDS) {
    return {
      label: 'Paling Seimbang',
      reason: 'Durasi dan ritme paling aman untuk Shorts tanpa terasa kepanjangan.',
    };
  }

  return {
    label: 'Cadangan Bagus',
    reason: 'Masih layak dipakai sebagai alternatif jika butuh angle berbeda.',
  };
}

/**
 * Score and rank clip candidates for the picking step.
 * This keeps recommendations deterministic and fast without extra backend calls.
 */
export function getRecommendedCandidates(
  candidates: Candidate[],
  limit = 3,
): PickingRecommendation[] {
  return candidates
    .map((candidate) => {
      const recommendationScore = getRecommendationScore(candidate);
      const meta = buildRecommendationMeta(candidate);

      return {
        candidateId: candidate.id,
        score: recommendationScore,
        ...meta,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
