import { describe, expect, it } from 'vitest';
import { getRecommendedCandidates } from '@/components/director/steps/picking-recommendations';
import type { Candidate } from '@/stores/director-store';

function createCandidate(
  id: string,
  score: number,
  durationSeconds: number,
  tags?: string[],
): Candidate {
  return {
    id,
    startMs: 0,
    endMs: durationSeconds * 1000,
    score,
    tags,
    rank: 1,
  };
}

describe('getRecommendedCandidates', () => {
  it('prioritizes balanced high-energy clips', () => {
    const recommendations = getRecommendedCandidates([
      createCandidate('slow-long', 0.98, 52, []),
      createCandidate('fast-strong', 0.9, 16, ['HIGH ENERGY']),
      createCandidate('balanced', 0.88, 24, ['HIGH ENERGY']),
    ]);

    expect(recommendations[0]?.candidateId).toBe('balanced');
    expect(recommendations[0]?.label).toBe('Paling Seimbang');
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

  it('prefers AI rerank metadata when available', () => {
    const recommendations = getRecommendedCandidates([
      {
        ...createCandidate('heuristic', 0.48, 42, ['HIGH ENERGY']),
      },
      {
        ...createCandidate('ai-ranked', 0.78, 19, ['highlight']),
        metadata: {
          aiRerank: {
            provider: 'ollama',
            label: 'Hook Paling Kuat',
            reason: 'Pembuka lebih tajam dan lebih cocok untuk Shorts yang cepat.',
            viralScore: 94,
            hookScore: 97,
            clarityScore: 88,
            heuristicScore: 78,
            compositeScore: 90,
            contentModeSuggestion: 'general',
          },
        },
      },
    ]);

    expect(recommendations[0]?.candidateId).toBe('ai-ranked');
    expect(recommendations[0]?.label).toBe('Hook Paling Kuat');
    expect(recommendations[0]?.reason).toContain('Pembuka');
  });
});
