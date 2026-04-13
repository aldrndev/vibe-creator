import { describe, expect, it } from 'vitest';
import {
  applyTranscriptCueEdit,
  buildTranscriptCues,
  formatSrtRange,
  formatSrtTimestamp,
  getTranscriptLayoutLabel,
  type TranscriptSegment,
} from '@/components/director/steps/editing-transcript-cues';

describe('editing-transcript-cues', () => {
  it('formats SRT timestamp and range', () => {
    expect(formatSrtTimestamp(1_234)).toBe('00:00:01,234');
    expect(formatSrtRange(1_234, 4_567)).toBe('00:00:01,234 --> 00:00:04,567');
  });

  it('builds word cues for karaoke/typewriter mode', () => {
    const segments: TranscriptSegment[] = [
      {
        startMs: 0,
        endMs: 1_000,
        text: 'halo dunia',
      },
    ];

    const cues = buildTranscriptCues(segments, 'typewriter');
    expect(cues).toHaveLength(2);
    expect(cues[0]?.text).toBe('halo');
    expect(cues[1]?.text).toBe('dunia');
    expect(cues[0]?.source.kind).toBe('word');
  });

  it('builds grouped cues for phrase mode', () => {
    const segments: TranscriptSegment[] = [
      { startMs: 0, endMs: 900, text: 'Kita mulai', speaker: 'A' },
      { startMs: 1_000, endMs: 1_900, text: 'dari dasar dulu', speaker: 'A' },
      { startMs: 4_000, endMs: 4_800, text: 'Lanjut topik baru', speaker: 'A' },
    ];

    const cues = buildTranscriptCues(segments, 'phrase');
    expect(cues).toHaveLength(2);
    expect(cues[0]?.text).toBe('Kita mulai dari dasar dulu');
    expect(cues[0]?.source.kind).toBe('group');
  });

  it('applies single-word edit back to parent segment', () => {
    const segments: TranscriptSegment[] = [{ startMs: 0, endMs: 1_000, text: 'halo dunia' }];
    const cue = buildTranscriptCues(segments, 'typewriter')[1];
    if (!cue) {
      throw new Error('cue missing');
    }

    const updated = applyTranscriptCueEdit({
      segments,
      cue,
      nextText: 'semesta',
    });
    expect(updated[0]?.text).toBe('halo semesta');
  });

  it('applies grouped edit by redistributing words to original segments', () => {
    const segments: TranscriptSegment[] = [
      { startMs: 0, endMs: 900, text: 'kita mulai' },
      { startMs: 1_000, endMs: 1_900, text: 'dari dasar' },
    ];
    const cue = buildTranscriptCues(segments, 'phrase')[0];
    if (!cue) {
      throw new Error('cue missing');
    }

    const updated = applyTranscriptCueEdit({
      segments,
      cue,
      nextText: 'ayo fokus ke poin inti sekarang',
    });
    expect(updated[0]?.text.length).toBeGreaterThan(0);
    expect(updated[1]?.text.length).toBeGreaterThan(0);
    expect(`${updated[0]?.text} ${updated[1]?.text}`.trim()).toBe(
      'ayo fokus ke poin inti sekarang',
    );
  });

  it('returns readable layout labels per subtitle animation', () => {
    expect(getTranscriptLayoutLabel('typewriter')).toContain('karaoke');
    expect(getTranscriptLayoutLabel('phrase')).toContain('cinema');
    expect(getTranscriptLayoutLabel('none')).toContain('standar');
  });
});
