import { describe, expect, it } from 'vitest';
import { getRecommendedCandidates } from '@/components/director/steps/picking-recommendations';
import type { Candidate } from '@/stores/director-store';

function createCandidate(
  id: string,
  score: number,
  durationSeconds: number,
  options?: {
    tags?: string[];
    rank?: number;
    metadata?: Candidate['metadata'];
  },
): Candidate {
  return {
    id,
    startMs: 0,
    endMs: durationSeconds * 1000,
    score,
    tags: options?.tags,
    rank: options?.rank ?? 1,
    metadata: options?.metadata,
  };
}

describe('getRecommendedCandidates', () => {
  it('prioritizes complete 40-60s shorts for single-short mode', () => {
    const recommendations = getRecommendedCandidates([
      createCandidate('short-complete', 0.82, 52, {
        metadata: {
          scoreBreakdown: {
            energy: 73,
            dialogDensity: 78,
            durationFit: 92,
            visualPenalty: 4,
            topSignals: ['Durasi 92', 'Dialog 78'],
            badges: ['Durasi Pas', 'Dialog Padat'],
            contentModeSuggestion: 'general',
          },
        },
      }),
      createCandidate('fast-hook', 0.9, 18, {
        tags: ['HIGH ENERGY'],
      }),
      createCandidate('mid', 0.88, 34, {
        tags: ['HIGH ENERGY'],
      }),
    ]);

    expect(recommendations[0]?.candidateId).toBe('short-complete');
    expect(recommendations[0]?.label).toBe('Short Utuh');
  });

  it('limits the number of results', () => {
    const recommendations = getRecommendedCandidates(
      [
        createCandidate('a', 0.7, 10),
        createCandidate('b', 0.8, 14),
        createCandidate('c', 0.9, 18),
        createCandidate('d', 0.95, 22),
      ],
      2,
    );

    expect(recommendations).toHaveLength(2);
  });

  it('keeps strong dialog 60-80s candidate as viable recommendation', () => {
    const recommendations = getRecommendedCandidates([
      createCandidate('dialog-safe', 0.78, 72, {
        metadata: {
          scoreBreakdown: {
            energy: 65,
            dialogDensity: 80,
            durationFit: 84,
            visualPenalty: 5,
            topSignals: ['Dialog 80', 'Durasi 84'],
            badges: ['Dialog Padat', 'Durasi Pas'],
            contentModeSuggestion: 'talking-head',
          },
        },
      }),
      createCandidate('non-dialog-long', 0.84, 74, {
        metadata: {
          scoreBreakdown: {
            energy: 84,
            dialogDensity: 55,
            durationFit: 84,
            visualPenalty: 6,
            topSignals: ['Energy 84', 'Durasi 84'],
            badges: ['High Energy'],
            contentModeSuggestion: 'general',
          },
        },
      }),
    ]);

    const dialogSafe = recommendations.find((item) => item.candidateId === 'dialog-safe');
    const nonDialogLong = recommendations.find((item) => item.candidateId === 'non-dialog-long');

    expect(dialogSafe?.label).toBe('Dialog Aman');
    expect(dialogSafe?.score).toBeGreaterThan(nonDialogLong?.score ?? 0);
  });

  it('applies short-readiness penalties even when AI rerank metadata exists', () => {
    const recommendations = getRecommendedCandidates([
      {
        ...createCandidate('healthy-ai', 0.74, 52, {
          metadata: {
            scoreBreakdown: {
              energy: 78,
              dialogDensity: 76,
              durationFit: 92,
              visualPenalty: 6,
              topSignals: ['Durasi 92', 'Dialog 76'],
              badges: ['High Energy', 'Durasi Pas', 'Dialog Padat'],
              contentModeSuggestion: 'general',
            },
            aiRerank: {
              provider: 'ollama',
              label: 'Paling Aman',
              reason: 'Klip ini kuat untuk short utuh.',
              viralScore: 90,
              hookScore: 89,
              clarityScore: 88,
              heuristicScore: 82,
              compositeScore: 90,
              contentModeSuggestion: 'general',
            },
          },
        }),
      },
      {
        ...createCandidate('risky-ai', 0.79, 95, {
          metadata: {
            scoreBreakdown: {
              energy: 84,
              dialogDensity: 58,
              durationFit: 60,
              visualPenalty: 30,
              topSignals: ['Energy 84', 'Penalty visual 30'],
              badges: ['High Energy', 'Butuh Review'],
              contentModeSuggestion: 'cinematic',
            },
            aiRerank: {
              provider: 'ollama',
              label: 'Paling Viral',
              reason: 'Secara raw engagement tinggi.',
              viralScore: 96,
              hookScore: 95,
              clarityScore: 80,
              heuristicScore: 79,
              compositeScore: 92,
              contentModeSuggestion: 'general',
            },
          },
        }),
      },
    ]);

    expect(recommendations[0]?.candidateId).toBe('healthy-ai');
    expect(recommendations[0]?.label).toBe('Paling Aman');
    expect(recommendations[0]?.reason).toContain('short utuh');
  });
});
