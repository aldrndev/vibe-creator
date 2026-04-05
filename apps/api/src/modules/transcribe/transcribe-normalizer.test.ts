import { describe, expect, it } from 'vitest';
import { transcribeNormalizer } from '@/modules/transcribe/transcribe-normalizer';

describe('transcribeNormalizer', () => {
  it('builds tighter caption segments from word timestamps', () => {
    const normalized = transcribeNormalizer.normalizeSegments([
      {
        start: 0,
        end: 2.2,
        text: 'Hello there everyone.',
        confidence: 0.9,
        words: [
          { start: 0.0, end: 0.3, text: 'Hello' },
          { start: 0.35, end: 0.6, text: 'there' },
          { start: 0.65, end: 1.2, text: 'everyone.' },
          { start: 1.8, end: 2.2, text: 'Welcome' },
        ],
      },
    ]);

    expect(normalized).toEqual([
      {
        startMs: 0,
        endMs: 1200,
        text: 'Hello there everyone.',
        words: [
          { startMs: 0, endMs: 300, text: 'Hello', confidence: undefined },
          { startMs: 350, endMs: 600, text: 'there', confidence: undefined },
          { startMs: 650, endMs: 1200, text: 'everyone.', confidence: undefined },
        ],
      },
      {
        startMs: 1800,
        endMs: 2400,
        text: 'Welcome',
        words: [{ startMs: 1800, endMs: 2200, text: 'Welcome', confidence: undefined }],
      },
    ]);
  });

  it('falls back to segment timing when word timestamps are unavailable', () => {
    const normalized = transcribeNormalizer.normalizeSegments([
      {
        start: 0,
        end: 0.4,
        text: 'Hi',
        confidence: 0.8,
      },
      {
        start: 0.45,
        end: 1.0,
        text: 'there',
        confidence: 0.8,
      },
    ]);

    expect(normalized).toEqual([
      {
        startMs: 0,
        endMs: 1000,
        text: 'Hi there',
      },
    ]);
  });
});
