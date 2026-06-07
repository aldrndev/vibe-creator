import { describe, expect, it } from 'vitest';
import { scoreCandidateWithRules } from '@/modules/director/services/analysis-rule-scorer';
import type { HeuristicScoreBreakdown } from '../../analysis-score-breakdown';

function buildScoreBreakdown(
  overrides: Partial<HeuristicScoreBreakdown> = {},
): HeuristicScoreBreakdown {
  return {
    energy: 72,
    dialogDensity: 74,
    durationFit: 86,
    visualPenalty: 4,
    topSignals: ['Energy 72', 'Dialog 74', 'Durasi 86'],
    badges: ['Highlight', 'Dialog Padat'],
    contentModeSuggestion: 'general',
    ...overrides,
  };
}

describe('scoreCandidateWithRules', () => {
  it('penalizes candidates that are likely to end mid-speech or need review', () => {
    const score = scoreCandidateWithRules({
      startMs: 0,
      endMs: 96_000,
      score: 0.91,
      rank: 1,
      tags: ['HIGH ENERGY'],
      scoreBreakdown: buildScoreBreakdown({
        dialogDensity: 34,
        durationFit: 42,
        visualPenalty: 32,
        badges: ['Highlight', 'Butuh Review'],
      }),
    });

    expect(score.compositeScore).toBeLessThanOrEqual(58);
    expect(score.riskFlags).toEqual(expect.arrayContaining(['ending-cut-risk', 'visual-risk']));
  });

  it('rewards candidates with a strong hook, complete moment, and comfortable duration', () => {
    const score = scoreCandidateWithRules({
      startMs: 12_000,
      endMs: 72_000,
      score: 0.82,
      rank: 1,
      tags: ['HIGH ENERGY'],
      scoreBreakdown: buildScoreBreakdown({
        energy: 96,
        dialogDensity: 82,
        durationFit: 92,
        visualPenalty: 2,
      }),
    });

    expect(score.compositeScore).toBeGreaterThanOrEqual(80);
    expect(score.reasonLabels).toEqual(
      expect.arrayContaining(['Hook kuat', 'Kalimat selesai', 'Durasi pas']),
    );
    expect(score.riskFlags).toHaveLength(0);
  });

  it('keeps very short candidates below strong recommendation even with high energy', () => {
    const score = scoreCandidateWithRules({
      startMs: 0,
      endMs: 14_000,
      score: 0.95,
      rank: 1,
      tags: ['HIGH ENERGY'],
      scoreBreakdown: buildScoreBreakdown({
        energy: 96,
        dialogDensity: 80,
        durationFit: 58,
        visualPenalty: 0,
      }),
    });

    expect(score.compositeScore).toBeLessThanOrEqual(54);
    expect(score.riskFlags).toContain('too-short');
  });
});
