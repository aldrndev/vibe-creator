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
          { start: 0, end: 0.3, text: 'Hello' },
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
        speaker: undefined,
        words: [
          { startMs: 0, endMs: 300, text: 'Hello', confidence: undefined, speaker: undefined },
          { startMs: 350, endMs: 600, text: 'there', confidence: undefined, speaker: undefined },
          {
            startMs: 650,
            endMs: 1200,
            text: 'everyone.',
            confidence: undefined,
            speaker: undefined,
          },
        ],
      },
      {
        startMs: 1800,
        endMs: 2300,
        text: 'Welcome',
        speaker: undefined,
        confidence: undefined,
        words: [
          {
            startMs: 1800,
            endMs: 2200,
            text: 'Welcome',
            confidence: undefined,
            speaker: undefined,
          },
        ],
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
        end: 1,
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

  it('preserves full segment text when word timestamps miss a spoken word', () => {
    const normalized = transcribeNormalizer.normalizeSegments([
      {
        start: 0,
        end: 1.5,
        text: 'Hello missing there',
        confidence: 0.82,
        words: [
          { start: 0, end: 0.35, text: 'Hello' },
          { start: 1, end: 1.4, text: 'there' },
        ],
      },
    ]);

    expect(normalized).toEqual([
      {
        startMs: 0,
        endMs: 1500,
        text: 'Hello missing there',
        speaker: undefined,
      },
    ]);
  });

  it('keeps same-speaker sentence as one fuller subtitle utterance', () => {
    const normalized = transcribeNormalizer.normalizeSegments([
      {
        start: 0,
        end: 4.6,
        text: 'Kita bahas cara upload produk, optimasi hook, dan closing CTA.',
        confidence: 0.91,
        words: [
          { start: 0, end: 0.25, text: 'Kita' },
          { start: 0.3, end: 0.55, text: 'bahas' },
          { start: 0.58, end: 0.85, text: 'cara' },
          { start: 0.9, end: 1.2, text: 'upload' },
          { start: 1.25, end: 1.55, text: 'produk,' },
          { start: 1.65, end: 1.95, text: 'optimasi' },
          { start: 2, end: 2.25, text: 'hook,' },
          { start: 2.3, end: 2.55, text: 'dan' },
          { start: 2.6, end: 2.9, text: 'closing' },
          { start: 2.95, end: 3.35, text: 'CTA.' },
        ],
      },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.text).toContain('optimasi hook');
    expect(normalized[0]?.startMs).toBe(0);
    expect(normalized[0]?.endMs).toBe(3350);
  });

  it('splits utterance when detected speaker changes', () => {
    const normalized = transcribeNormalizer.normalizeSegments([
      {
        start: 0,
        end: 2.2,
        text: 'Speaker one and speaker two',
        confidence: 0.9,
        words: [
          { start: 0, end: 0.4, text: 'Speaker', speaker: 'SPEAKER_00' },
          { start: 0.45, end: 0.8, text: 'one', speaker: 'SPEAKER_00' },
          { start: 0.9, end: 1.2, text: 'and', speaker: 'SPEAKER_01' },
          { start: 1.25, end: 1.6, text: 'speaker', speaker: 'SPEAKER_01' },
          { start: 1.65, end: 2, text: 'two', speaker: 'SPEAKER_01' },
        ],
      },
    ]);

    expect(normalized).toHaveLength(2);
    expect(normalized[0]?.speaker).toBe('SPEAKER_00');
    expect(normalized[1]?.speaker).toBe('SPEAKER_01');
    expect(normalized[0]?.text).toBe('Speaker one');
    expect(normalized[1]?.text).toBe('and speaker two');
  });
});
