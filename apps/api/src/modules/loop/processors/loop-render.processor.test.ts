import { describe, expect, it } from 'vitest';
import type { LoopRenderSpec } from '../loop.schemas';
import { buildCycleArgs, buildExtensionArgs } from './loop-render.processor';

const baseSpec: LoopRenderSpec = {
  kind: 'loop-creator-render',
  schemaVersion: 1,
  projectId: 'project-1',
  sourceAssetPath: '/uploads/projects/project-1/video.mp4',
  sourceDurationMs: 10_000,
  sourceHasAudio: true,
  trimStartMs: 0,
  trimEndMs: 10_000,
  selectedSegmentDurationMs: 10_000,
  audioMuted: false,
  transitionMode: 'repeat',
  transitionDurationMs: 0,
  cycleDurationMs: 10_000,
  cycleCount: 30,
  targetDurationMs: 300_000,
  actualDurationMs: 300_000,
  aspectRatio: 'original',
  outputWidth: 1920,
  outputHeight: 1080,
};

describe('buildCycleArgs', () => {
  it('does not reference audio filters when a source is silent', () => {
    const command = buildCycleArgs(
      { ...baseSpec, sourceHasAudio: false },
      '/uploads/source.mp4',
      '/uploads/temp/cycle.mp4',
      false,
    ).join(' ');

    expect(command).toContain('-an');
    expect(command).not.toContain('[0:a]');
    expect(command).not.toContain('acrossfade');
  });

  it('builds shift-and-dissolve audio and video filters for smooth loops', () => {
    const args = buildCycleArgs(
      {
        ...baseSpec,
        transitionMode: 'smooth',
        transitionDurationMs: 1000,
        cycleDurationMs: 9000,
      },
      '/uploads/source.mp4',
      '/uploads/temp/cycle.mp4',
      true,
    );
    const command = args.join(' ');
    const filterGraph = args[args.indexOf('-filter_complex') + 1];

    expect(command).toContain('xfade=transition=fade:duration=1.000');
    expect(command).toContain('acrossfade=d=1.000');
    expect(filterGraph).not.toMatch(/;$/);
  });

  it('builds blur background composition for fixed ratios', () => {
    const args = buildCycleArgs(
      {
        ...baseSpec,
        aspectRatio: '9:16',
        outputWidth: 1080,
        outputHeight: 1920,
        transitionMode: 'smooth',
        transitionDurationMs: 1000,
        cycleDurationMs: 9000,
      },
      '/uploads/source.mp4',
      '/uploads/temp/cycle.mp4',
      true,
    );
    const command = args.join(' ');
    const filterGraph = args[args.indexOf('-filter_complex') + 1];

    expect(command).toContain('boxblur=20:10');
    expect(command).toContain('overlay=(W-w)/2:(H-h)/2');
    expect(filterGraph).not.toMatch(/;$/);
  });

  it('keeps intermediate cycle audio lossless and encodes AAC only on final extension', () => {
    const cycleArgs = buildCycleArgs(
      baseSpec,
      '/uploads/source.mp4',
      '/uploads/temp/cycle.mkv',
      true,
      'pcm',
    );
    const extensionArgs = buildExtensionArgs(
      baseSpec,
      '/uploads/temp/cycle.mkv',
      '/uploads/temp/output.mp4',
    );

    expect(cycleArgs.join(' ')).toContain('-c:a pcm_s16le');
    expect(extensionArgs.join(' ')).toContain('-c:v copy');
    expect(extensionArgs.join(' ')).toContain('-c:a aac');
  });
});
