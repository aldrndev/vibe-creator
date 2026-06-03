import {
  createDefaultLoopSourcePromptInput,
  generateLoopSourcePrompt,
  LOOP_SCENE_DEFINITIONS,
} from '@vibe-creator/shared';
import { describe, expect, it } from 'vitest';
import { LOOP_SOURCE_REVIEW_ACTION_LABELS } from './LoopSourcePromptDialog';
import { loopSourcePromptInputSchema } from './loop-source-prompt.schema';

describe('loop source prompt composer', () => {
  it('ships complete unique scene recipes with matching thumbnail assets', () => {
    const ids = LOOP_SCENE_DEFINITIONS.map((scene) => scene.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(9);
    for (const scene of LOOP_SCENE_DEFINITIONS) {
      expect(scene.thumbnailUrl).toMatch(/^\/images\/loop-scenes\/.+\.jpg$/);
      expect(scene.visualComposition.length).toBeGreaterThan(30);
      expect(scene.continuousMotion.length).toBeGreaterThan(20);
      expect(scene.nativeAudio.length).toBeGreaterThan(20);
    }
  });

  it('generates a fixed-camera, native-audio, seamless prompt without conditional audio', () => {
    const prompt = generateLoopSourcePrompt(createDefaultLoopSourcePromptInput());

    expect(prompt).toContain('single uninterrupted 8-second photorealistic ambient video');
    expect(prompt).toContain('locked-off tripod shot');
    expect(prompt).toContain('Native audio: generate synchronized natural ambient audio');
    expect(prompt).toContain('Seamless-loop requirement');
    expect(prompt).toContain('landscape 16:9');
    expect(prompt.toLowerCase()).not.toContain('if audio is supported');
  });

  it('keeps the selected scene and audio linked', () => {
    const oceanPrompt = generateLoopSourcePrompt({
      ...createDefaultLoopSourcePromptInput(),
      sceneId: 'ocean-shore',
    });

    expect(oceanPrompt).toContain('ocean surf');
    expect(oceanPrompt).not.toContain('fireplace crackling');
  });

  it('rejects an incomplete custom scene', () => {
    const result = loopSourcePromptInputSchema.safeParse({
      ...createDefaultLoopSourcePromptInput(),
      sceneId: 'custom',
    });

    expect(result.success).toBe(false);
  });

  it('includes a valid custom scene in the generated prompt', () => {
    const parsed = loopSourcePromptInputSchema.parse({
      ...createDefaultLoopSourcePromptInput(),
      sceneId: 'custom',
      customScene: {
        environment: 'a quiet wooden cabin facing a snow-covered pine forest',
        focalPoint: 'the softly glowing cabin window',
        continuousMotion: 'gentle snowfall drifting continuously at a stable pace',
        nativeAudio: 'soft winter wind with a subtle consistent cabin room tone',
      },
    });

    expect(generateLoopSourcePrompt(parsed)).toContain('snow-covered pine forest');
    expect(generateLoopSourcePrompt(parsed)).toContain('soft winter wind');
  });

  it('keeps generated prompts transient until the user uploads a result video', () => {
    expect(Object.values(LOOP_SOURCE_REVIEW_ACTION_LABELS)).toEqual([
      'Copy Prompt',
      'Upload Hasil Video',
    ]);
    expect(Object.values(LOOP_SOURCE_REVIEW_ACTION_LABELS)).not.toContain('Simpan Prompt');
  });
});
