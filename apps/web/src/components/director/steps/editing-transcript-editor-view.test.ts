import { describe, expect, it } from 'vitest';
import type { TranscriptSegment } from '@/components/director/steps/editing-transcript-cues';
import {
  buildStableTranscriptEditorCues,
  getSubtitlePresetBadgeLabel,
} from '@/components/director/steps/editing-transcript-editor-view';

describe('editing-transcript-editor-view', () => {
  it('keeps the editable transcript view stable per segment', () => {
    const segments: TranscriptSegment[] = [
      {
        startMs: 0,
        endMs: 1_000,
        text: 'halo dunia',
        words: [
          { startMs: 0, endMs: 400, text: 'halo' },
          { startMs: 420, endMs: 900, text: 'dunia' },
        ],
      },
      {
        startMs: 1_200,
        endMs: 2_000,
        text: 'tetap satu cue',
      },
    ];

    const cues = buildStableTranscriptEditorCues(segments);

    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({ text: 'halo dunia', source: { kind: 'segment' } });
    expect(cues[1]).toMatchObject({ text: 'tetap satu cue', source: { kind: 'segment' } });
  });

  it('returns readable subtitle preset badge labels', () => {
    expect(getSubtitlePresetBadgeLabel('viral-pop')).toBe('Gaya Viral Pop');
    expect(getSubtitlePresetBadgeLabel('meme-pop')).toBe('Gaya Meme Green');
    expect(getSubtitlePresetBadgeLabel('podcast-duo')).toBe('Gaya Podcast Duo');
    expect(getSubtitlePresetBadgeLabel('custom')).toBe('Gaya Custom');
  });
});
