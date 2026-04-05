import { describe, expect, it } from 'vitest';
import { deriveClipInsight } from '@/components/director/steps/editing-insights';
import type { SelectedClip } from '@/stores/director-store';

function createClip(transcriptText: string, overrides?: Partial<SelectedClip>): SelectedClip {
  return {
    id: 'clip-1',
    candidateId: 'candidate-1',
    orderIndex: 0,
    candidate: {
      id: 'candidate-1',
      startMs: 0,
      endMs: 18_000,
      score: 0.95,
      tags: ['HIGH ENERGY'],
    },
    transcript: {
      segments: [
        {
          startMs: 0,
          endMs: 18_000,
          text: transcriptText,
        },
      ],
    },
    ...overrides,
  };
}

describe('deriveClipInsight', () => {
  it('detects tutorial angle from transcript keywords', () => {
    const insight = deriveClipInsight(
      createClip('Cara bikin hook video yang langsung bikin orang berhenti scroll'),
    );

    expect(insight.angle).toContain('Tutorial cepat');
    expect(insight.reasons).toContain('Durasi aman untuk Shorts');
    expect(insight.strengthLabel).toBe('Sangat Kuat');
  });

  it('falls back gracefully when transcript is empty', () => {
    const insight = deriveClipInsight(
      createClip('', {
        candidate: {
          id: 'candidate-2',
          startMs: 0,
          endMs: 65_000,
          score: 0.6,
          tags: [],
        },
        transcript: { segments: [] },
      }),
    );

    expect(insight.hookLine).toContain('momentum visual');
    expect(insight.strengthLabel).toBe('Perlu Dipoles');
    expect(insight.suggestedOverlay).toContain('Mulai dengan kalimat');
  });
});
