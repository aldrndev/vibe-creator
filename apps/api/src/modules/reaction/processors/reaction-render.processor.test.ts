import { describe, expect, it } from 'vitest';
import type { ReactionRenderSpec } from '../reaction.schemas';
import { buildReactionFilterGraph } from './reaction-render.processor';

const baseSpec: ReactionRenderSpec = {
  kind: 'reaction-render',
  schemaVersion: 1,
  projectId: 'project-1',
  mainAssetPath: '/uploads/projects/project-1/main.mp4',
  reactionAssetPath: '/uploads/projects/project-1/reaction.mp4',
  mainHasAudio: true,
  reactionHasAudio: true,
  mainDurationMs: 30_000,
  reactionDurationMs: 20_000,
  layoutMode: 'pip',
  aspectRatio: '16:9',
  pipPosition: 'top-right',
  pipScale: 0.28,
  circular: false,
  splitOrientation: 'horizontal',
  mainPlacement: 'start',
  splitRatio: 0.5,
  smoothBorder: false,
  blurOverlay: false,
  mainFraming: {
    fit: 'cover',
    x: 50,
    y: 50,
    zoom: 1,
  },
  reactionFraming: {
    fit: 'cover',
    x: 50,
    y: 50,
    zoom: 1,
  },
  mainVolume: 0.6,
  reactionVolume: 1,
  muteMain: false,
  muteReaction: false,
  reactionOffsetMs: 0,
  outputDurationMs: 30_000,
  outputWidth: 1920,
  outputHeight: 1080,
};

describe('buildReactionFilterGraph', () => {
  it('mixes two available audio streams safely', () => {
    const graph = buildReactionFilterGraph(baseSpec);

    expect(graph).toContain('[0:a]');
    expect(graph).toContain('[1:a]');
    expect(graph).toContain('amix=inputs=2');
    expect(graph).not.toMatch(/;$/);
  });

  it('does not reference missing main audio stream', () => {
    const graph = buildReactionFilterGraph({ ...baseSpec, mainHasAudio: false });

    expect(graph).not.toContain('[0:a]');
    expect(graph).toContain('[1:a]');
    expect(graph).not.toContain('amix=inputs=2');
  });

  it('does not build audio filters when both inputs are silent or muted', () => {
    const graph = buildReactionFilterGraph({
      ...baseSpec,
      mainHasAudio: false,
      reactionHasAudio: false,
    });

    expect(graph).not.toContain('[0:a]');
    expect(graph).not.toContain('[1:a]');
    expect(graph).not.toContain('[aout]');
  });

  it('builds side-by-side layout with split ratio', () => {
    const graph = buildReactionFilterGraph({
      ...baseSpec,
      layoutMode: 'side-by-side',
      splitOrientation: 'horizontal',
      splitRatio: 0.6,
    });

    expect(graph).toContain('crop=1152:1080');
    expect(graph).toContain('crop=768:1080');
    expect(graph).toContain('hstack=inputs=2');
  });

  it('can place reaction before main in split layouts', () => {
    const graph = buildReactionFilterGraph({
      ...baseSpec,
      layoutMode: 'side-by-side',
      mainPlacement: 'end',
      splitOrientation: 'horizontal',
      splitRatio: 0.6,
    });

    expect(graph).toContain('[reactionpane][mainpane]hstack=inputs=2');
  });

  it('applies framing controls to split panes', () => {
    const graph = buildReactionFilterGraph({
      ...baseSpec,
      layoutMode: 'side-by-side',
      splitRatio: 0.6,
      mainFraming: {
        fit: 'cover',
        x: 20,
        y: 80,
        zoom: 1.4,
      },
    });

    expect(graph).toContain('scale=1612:1512:force_original_aspect_ratio=increase');
    expect(graph).toContain('crop=1152:1080:(iw-ow)*0.200:(ih-oh)*0.800');
  });

  it('keeps reaction video padded to main duration without looping it', () => {
    const graph = buildReactionFilterGraph({
      ...baseSpec,
      reactionDurationMs: 8_000,
      outputDurationMs: 30_000,
    });

    expect(graph).toContain('tpad=stop_mode=clone:stop_duration=30.000');
  });

  it('positions PiP in each supported corner', () => {
    const topLeftGraph = buildReactionFilterGraph({
      ...baseSpec,
      layoutMode: 'pip',
      pipPosition: 'top-left',
    });
    const bottomLeftGraph = buildReactionFilterGraph({
      ...baseSpec,
      layoutMode: 'pip',
      pipPosition: 'bottom-left',
    });
    const bottomRightGraph = buildReactionFilterGraph({
      ...baseSpec,
      layoutMode: 'pip',
      pipPosition: 'bottom-right',
    });

    expect(topLeftGraph).toContain('overlay=38:38');
    expect(bottomLeftGraph).toContain('overlay=38:739');
    expect(bottomRightGraph).toContain('overlay=1344:739');
  });

  it('builds vertical short with blur and faded border as overlay composition', () => {
    const graph = buildReactionFilterGraph({
      ...baseSpec,
      layoutMode: 'vertical-short',
      aspectRatio: '9:16',
      outputWidth: 1080,
      outputHeight: 1920,
      splitRatio: 0.57,
      smoothBorder: true,
      blurOverlay: true,
    });

    expect(graph).toContain('gblur=sigma=9:steps=2');
    expect(graph).toContain('crop=1080:50:0:1070');
    expect(graph).toContain("geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)'");
    expect(graph).toContain('overlay=0:1044');
    expect(graph).toContain('overlay=0:1070');
    expect(graph).not.toContain('crop=1080:1920,boxblur=22:12[base]');
  });

  it('applies positive sync offset to reaction video and audio', () => {
    const graph = buildReactionFilterGraph({ ...baseSpec, reactionOffsetMs: 800 });

    expect(graph).toContain('setpts=PTS-STARTPTS+0.800/TB');
    expect(graph).toContain('adelay=800|800');
  });
});
