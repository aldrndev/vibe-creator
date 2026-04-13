import type { Candidate } from '@/stores/director-store';

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

function hasBadge(candidate: Candidate, badge: string): boolean {
  return candidate.metadata?.scoreBreakdown?.badges?.includes(badge) ?? false;
}

function isDialogCompleteProxy(candidate: Candidate): boolean {
  const breakdown = candidate.metadata?.scoreBreakdown;
  if (!breakdown) {
    return false;
  }

  return (
    breakdown.dialogDensity >= STRONG_DIALOG_SCORE &&
    breakdown.durationFit >= DIALOG_COMPLETION_DURATION_FIT
  );
}

function getShortReadinessAdjustment(candidate: Candidate): number {
  const durationSeconds = getDurationSeconds(candidate);
  const breakdown = candidate.metadata?.scoreBreakdown;
  const dialogDensity = breakdown?.dialogDensity;
  const durationFit = breakdown?.durationFit;
  const visualPenalty = breakdown?.visualPenalty ?? 0;
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

  if (typeof dialogDensity === 'number') {
    if (dialogDensity >= STRONG_DIALOG_SCORE) {
      adjustment += 7;
    } else if (dialogDensity >= MEDIUM_DIALOG_SCORE) {
      adjustment += 3;
    } else {
      adjustment -= 4;
    }
  }

  if (typeof durationFit === 'number') {
    if (durationFit >= 88) {
      adjustment += 5;
    } else if (durationFit >= 78) {
      adjustment += 2;
    }
  }

  if (candidate.tags?.includes('HIGH ENERGY') || hasBadge(candidate, 'Hook Kuat')) {
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

  if (candidate.rank && candidate.rank <= 3) {
    adjustment += 2;
  }

  return adjustment;
}

function getRecommendationScore(candidate: Candidate): number {
  const baseHeuristicScore = candidate.score * 100;
  const shortReadinessScore = baseHeuristicScore + getShortReadinessAdjustment(candidate);
  const aiRerank = getAiRerankMeta(candidate);

  if (aiRerank) {
    return aiRerank.compositeScore * 0.7 + shortReadinessScore * 0.3;
  }
  return shortReadinessScore;
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
      reason: 'Tempo tinggi dan singkat, cocok jika kamu ingin short dengan pembuka super cepat.',
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
    reason: 'Masih layak dipakai sebagai alternatif, tapi bukan prioritas utama untuk short final.',
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
