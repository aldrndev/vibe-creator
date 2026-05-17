import {
  createImageLayer,
  createVideoLayer,
  MODERN_SCHEMA_VERSION,
  type ModernProject,
} from '@vibe-creator/shared';
import { describe, expect, it } from 'vitest';
import { compileModernProject } from '@/lib/modern-compiler';
import type { EditorAsset } from '@/stores/editor-store';

const videoAsset: EditorAsset = {
  id: 'asset-video',
  name: 'clip.mp4',
  type: 'VIDEO',
  url: '/uploads/temp/clip.mp4',
  durationMs: 6_000,
};

const imageAsset: EditorAsset = {
  id: 'asset-image',
  name: 'cover.png',
  type: 'IMAGE',
  url: '/uploads/temp/cover.png',
  durationMs: 5_000,
};

function createProject(layers: ModernProject['layers']): ModernProject {
  return {
    schemaVersion: MODERN_SCHEMA_VERSION,
    id: 'project-effects',
    title: 'Project Effects',
    settings: {
      width: 1920,
      height: 1080,
      fps: 30,
      durationMs: 6_000,
      backgroundColor: '#000000',
      backgroundMode: 'blur',
    },
    layers,
  };
}

describe('modern compiler', () => {
  it('compiles visual effects and transitions into export clip effects', () => {
    const videoLayer = createVideoLayer('layer-video', videoAsset.id, 0, 0, 6_000);
    videoLayer.data.volume = 0.45;
    videoLayer.data.effects = {
      filter: 'warm',
      fadeInMs: 0,
      fadeOutMs: 1_200,
      transitionIn: 'slide-left',
      transitionOut: 'fade',
      motion: 'zoom-in',
    };

    const imageLayer = createImageLayer('layer-image', imageAsset.id, 1, 1_000, 5_000);
    imageLayer.data.effects = {
      filter: 'grayscale',
      fadeInMs: 300,
      fadeOutMs: 0,
      transitionIn: 'none',
      transitionOut: 'none',
      motion: 'none',
    };

    const result = compileModernProject(createProject([videoLayer, imageLayer]), [
      videoAsset,
      imageAsset,
    ]);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected compiler success');
    }

    const videoClip = result.timeline.tracks[0]?.clips[0];
    const imageClip = result.timeline.tracks[1]?.clips[0];

    expect(videoClip?.effects).toEqual({
      filters: ['warm'],
      speed: 1,
      volume: 0.45,
      fadeIn: 500,
      fadeOut: 1_200,
      transitionIn: 'slide-left',
      transitionOut: 'fade',
      motion: 'zoom-in',
    });
    expect(imageClip?.effects.filters).toEqual(['grayscale']);
    expect(imageClip?.effects.fadeIn).toBe(300);
  });
});
