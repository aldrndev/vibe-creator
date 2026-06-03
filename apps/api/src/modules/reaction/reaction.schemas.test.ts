import { describe, expect, it } from 'vitest';
import {
  REACTION_CREATOR_PROJECT_KIND,
  reactionCreatorProjectDocumentSchema,
  reactionRenderSpecSchema,
} from './reaction.schemas';

describe('reactionCreatorProjectDocumentSchema', () => {
  it('accepts a valid reaction recorder project document', () => {
    const parsed = reactionCreatorProjectDocumentSchema.parse({
      kind: REACTION_CREATOR_PROJECT_KIND,
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      mainAssetId: 'main-asset',
      reactionAssetId: 'reaction-asset',
      reactionInputMode: 'recorded',
      layout: {
        mode: 'pip',
        pipPosition: 'top-right',
        pipScale: 0.28,
        circular: true,
        splitOrientation: 'horizontal',
        splitRatio: 0.5,
        smoothBorder: false,
      },
      output: { aspectRatio: '9:16' },
      audio: {
        mainVolume: 0.5,
        reactionVolume: 1,
        muteMain: false,
        muteReaction: false,
      },
      sync: { reactionOffsetMs: -500 },
    });

    expect(parsed.layout.mode).toBe('pip');
    expect(parsed.sync.reactionOffsetMs).toBe(-500);
  });

  it('rejects sync offsets outside the supported range', () => {
    const result = reactionCreatorProjectDocumentSchema.safeParse({
      kind: REACTION_CREATOR_PROJECT_KIND,
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      layout: {
        mode: 'side-by-side',
        pipPosition: 'top-right',
        pipScale: 0.28,
        circular: false,
        splitOrientation: 'horizontal',
        splitRatio: 0.5,
        smoothBorder: false,
      },
      output: { aspectRatio: '16:9' },
      audio: {
        mainVolume: 1,
        reactionVolume: 1,
        muteMain: false,
        muteReaction: false,
      },
      sync: { reactionOffsetMs: 5000 },
    });

    expect(result.success).toBe(false);
  });
});

describe('reactionRenderSpecSchema', () => {
  it('requires positive output duration and dimensions', () => {
    const result = reactionRenderSpecSchema.safeParse({
      kind: 'reaction-render',
      schemaVersion: 1,
      projectId: 'project-1',
      mainAssetPath: '/tmp/main.mp4',
      reactionAssetPath: '/tmp/reaction.mp4',
      mainHasAudio: true,
      reactionHasAudio: false,
      mainDurationMs: 10_000,
      reactionDurationMs: 8_000,
      layoutMode: 'vertical-short',
      aspectRatio: '9:16',
      pipPosition: 'top-right',
      pipScale: 0.28,
      circular: false,
      splitOrientation: 'vertical',
      splitRatio: 0.5,
      smoothBorder: false,
      mainVolume: 1,
      reactionVolume: 1,
      muteMain: false,
      muteReaction: true,
      reactionOffsetMs: 0,
      outputDurationMs: 0,
      outputWidth: 1080,
      outputHeight: 1920,
    });

    expect(result.success).toBe(false);
  });
});
