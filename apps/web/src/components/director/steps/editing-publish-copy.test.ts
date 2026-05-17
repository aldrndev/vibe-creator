import { describe, expect, it } from 'vitest';
import { derivePublishPack } from '@/components/director/steps/editing-publish-copy';
import type { SelectedClip } from '@/stores/director-store';

function createClip(id: string, score: number, text: string): SelectedClip {
  return {
    id,
    candidateId: `candidate-${id}`,
    orderIndex: 0,
    candidate: {
      id: `candidate-${id}`,
      startMs: 0,
      endMs: 18_000,
      score,
      tags: ['HIGH ENERGY'],
    },
    transcript: {
      segments: [{ startMs: 0, endMs: 18_000, text }],
    },
  };
}

describe('derivePublishPack', () => {
  it('uses the strongest clip as the publish source', () => {
    const pack = derivePublishPack([
      createClip('clip-a', 0.72, 'Halo semuanya, hari ini kita bahas satu trik editing.'),
      createClip('clip-b', 0.95, 'Cara bikin hook video yang bikin orang berhenti scroll.'),
    ]);

    expect(pack.bestClipId).toBe('clip-b');
    expect(pack.title).toContain('Cara bikin hook video');
    expect(pack.hashtags).toContain('#tutorial');
  });

  it('returns helpful fallback copy when clips are empty', () => {
    const pack = derivePublishPack([]);

    expect(pack.bestClipId).toBeNull();
    expect(pack.caption).toContain('Pilih 1 short final dulu');
  });
});
