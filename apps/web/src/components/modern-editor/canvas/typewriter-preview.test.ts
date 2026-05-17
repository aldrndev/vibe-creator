import { describe, expect, it } from 'vitest';
import { getTypewriterPreviewDurationMs } from './typewriter-preview';

describe('typewriter preview timing', () => {
  it('uses a short minimum duration for short text', () => {
    expect(getTypewriterPreviewDurationMs('Hi', 5000)).toBe(450);
  });

  it('scales duration by character count up to the maximum', () => {
    expect(getTypewriterPreviewDurationMs('A'.repeat(20), 5000)).toBe(700);
    expect(getTypewriterPreviewDurationMs('A'.repeat(120), 5000)).toBe(1600);
  });

  it('does not run longer than the layer duration', () => {
    expect(getTypewriterPreviewDurationMs('A'.repeat(120), 800)).toBe(800);
  });
});
