import { describe, expect, it } from 'vitest';
import { buildExportClipFromSelectedClip } from '@/modules/director/export-clip-builder';

describe('buildExportClipFromSelectedClip', () => {
  it('uses suggested interview mode to keep face tracking off by default', () => {
    const clip = buildExportClipFromSelectedClip({
      sourcePath: '/tmp/input.mp4',
      clip: {
        id: 'clip-1',
        trimStartMs: null,
        trimEndMs: null,
        candidate: {
          startMs: 1_000,
          endMs: 61_000,
          metadata: {
            scoreBreakdown: {
              contentModeSuggestion: 'interview',
            },
          },
        },
      },
      settings: {
        contentMode: 'auto',
      },
    });

    expect(clip.start).toBe(1);
    expect(clip.end).toBe(61);
    expect(clip.faceTracking).toBe(false);
    expect(clip.focusProfile).toBe('auto');
  });

  it('maps product-review mode to object-center focus profile', () => {
    const clip = buildExportClipFromSelectedClip({
      sourcePath: '/tmp/input.mp4',
      clip: {
        id: 'clip-2',
        trimStartMs: null,
        trimEndMs: null,
        candidate: {
          startMs: 5_000,
          endMs: 45_000,
        },
      },
      settings: {
        contentMode: 'product-review',
      },
    });

    expect(clip.focusProfile).toBe('object-center');
    expect(clip.faceTracking).toBe(true);
    expect(clip.stabilize).toBe(true);
  });

  it('normalizes legacy talking-head suggestion into podcast focus profile', () => {
    const clip = buildExportClipFromSelectedClip({
      sourcePath: '/tmp/input.mp4',
      clip: {
        id: 'clip-3',
        trimStartMs: null,
        trimEndMs: null,
        candidate: {
          startMs: 5_000,
          endMs: 45_000,
          metadata: {
            scoreBreakdown: {
              contentModeSuggestion: 'talking-head',
            },
          },
        },
      },
      settings: {
        contentMode: 'auto',
      },
    });

    expect(clip.resolvedContentMode).toBe('podcast');
    expect(clip.focusProfile).toBe('subject-center');
  });

  it('normalizes legacy explicit general mode into podcast mode', () => {
    const clip = buildExportClipFromSelectedClip({
      sourcePath: '/tmp/input.mp4',
      clip: {
        id: 'clip-4',
        trimStartMs: null,
        trimEndMs: null,
        candidate: {
          startMs: 5_000,
          endMs: 45_000,
        },
      },
      settings: {
        contentMode: 'general',
      },
    });

    expect(clip.resolvedContentMode).toBe('podcast');
    expect(clip.focusProfile).toBe('subject-center');
  });
});
