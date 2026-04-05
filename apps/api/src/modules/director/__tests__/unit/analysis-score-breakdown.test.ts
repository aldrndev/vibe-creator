import { describe, expect, it } from 'vitest';
import { buildHeuristicScoreBreakdown } from '@/modules/director/analysis-score-breakdown';

describe('buildHeuristicScoreBreakdown', () => {
  it('builds explicit scoring metadata and cinematic badge when pacing is gentle', () => {
    const breakdown = buildHeuristicScoreBreakdown({
      durationSeconds: 28,
      energyScore: 48,
      dialogDensityScore: 40,
      visualPenalty: 8,
      tags: ['highlight'],
    });

    expect(breakdown).toMatchObject({
      energy: 48,
      dialogDensity: 40,
      durationFit: 92,
      visualPenalty: 8,
      contentModeSuggestion: 'cinematic',
    });
    expect(breakdown.badges).toContain('Sinematik');
    expect(breakdown.topSignals).toHaveLength(3);
  });
});
