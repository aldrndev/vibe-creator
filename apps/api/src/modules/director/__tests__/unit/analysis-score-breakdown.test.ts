import { describe, expect, it } from 'vitest';
import { buildHeuristicScoreBreakdown } from '@/modules/director/analysis-score-breakdown';

describe('buildHeuristicScoreBreakdown', () => {
  it('builds explicit scoring metadata and cinematic badge for balanced short candidates', () => {
    const breakdown = buildHeuristicScoreBreakdown({
      durationSeconds: 52,
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

  it('marks very short candidates as fast but not duration-fit', () => {
    const breakdown = buildHeuristicScoreBreakdown({
      durationSeconds: 18,
      energyScore: 88,
      dialogDensityScore: 80,
      visualPenalty: 0,
      tags: ['HIGH ENERGY'],
    });

    expect(breakdown.durationFit).toBe(38);
    expect(breakdown.badges).toContain('Fast');
    expect(breakdown.badges).not.toContain('Durasi Pas');
  });
});
