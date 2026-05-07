import { describe, expect, it } from 'vitest';
import { updateTranscriptSchema } from '@/modules/director/routes/transcribe.routes';

describe('updateTranscriptSchema', () => {
  it('accepts transcript speaker and word timing payloads', () => {
    const parsed = updateTranscriptSchema.parse({
      segments: [
        {
          startMs: 0,
          endMs: 1_000,
          text: 'Kenapa begitu?',
          speaker: 'Penanya',
          words: [
            { startMs: 0, endMs: 400, text: 'Kenapa', speaker: 'Penanya' },
            { startMs: 420, endMs: 900, text: 'begitu?', speaker: 'Penanya' },
          ],
        },
      ],
    });

    expect(parsed.segments[0]?.speaker).toBe('Penanya');
    expect(parsed.segments[0]?.words).toHaveLength(2);
  });

  it('rejects transcript segments with invalid timing', () => {
    expect(() =>
      updateTranscriptSchema.parse({
        segments: [{ startMs: 1_000, endMs: 900, text: 'Timing salah' }],
      }),
    ).toThrow();
  });

  it('rejects word timings outside the parent segment', () => {
    expect(() =>
      updateTranscriptSchema.parse({
        segments: [
          {
            startMs: 500,
            endMs: 1_000,
            text: 'Word keluar',
            words: [{ startMs: 300, endMs: 700, text: 'Word' }],
          },
        ],
      }),
    ).toThrow();
  });
});
