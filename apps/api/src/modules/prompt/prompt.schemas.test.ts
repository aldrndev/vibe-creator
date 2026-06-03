import { describe, expect, it } from 'vitest';
import { createPromptSchema, loopSourcePromptInputSchema } from './prompt.schemas';

const validLoopSourceInput = {
  type: 'LOOP_SOURCE',
  sceneId: 'cozy-fireplace',
  mood: 'natural-calm',
  lighting: 'night-ambient-light',
  aspectRatio: '16:9',
  durationSeconds: 8,
  visualStyle: 'photorealistic',
} as const;

describe('loop source prompt schemas', () => {
  it('accepts a valid curated scene prompt', () => {
    expect(loopSourcePromptInputSchema.safeParse(validLoopSourceInput).success).toBe(true);
    expect(
      createPromptSchema.safeParse({
        type: 'LOOP_SOURCE',
        title: 'Cozy Fireplace Loop Source',
        inputData: validLoopSourceInput,
      }).success,
    ).toBe(true);
  });

  it('requires scene details for custom prompts', () => {
    expect(
      loopSourcePromptInputSchema.safeParse({
        ...validLoopSourceInput,
        sceneId: 'custom',
      }).success,
    ).toBe(false);
  });

  it('rejects incomplete native audio for a custom scene', () => {
    expect(
      loopSourcePromptInputSchema.safeParse({
        ...validLoopSourceInput,
        sceneId: 'custom',
        customScene: {
          environment: 'a calm woodland cabin during light snowfall',
          focalPoint: 'the warm window',
          continuousMotion: 'steady snow drifting softly through frame',
          nativeAudio: '',
        },
      }).success,
    ).toBe(false);
  });
});
