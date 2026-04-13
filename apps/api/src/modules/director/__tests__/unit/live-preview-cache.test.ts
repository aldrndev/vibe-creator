import { describe, expect, it } from 'vitest';
import { buildLivePreviewCacheFileName } from '@/modules/director/live-preview-cache';

describe('buildLivePreviewCacheFileName', () => {
  const baseInput = {
    sessionId: 'session-1',
    sourceFileName: 'input.mp4',
    clipPayload: {
      start: 1.25,
      end: 55.8,
      faceTracking: false,
      focusProfile: 'auto',
      transcript: {
        segments: [{ startMs: 0, endMs: 1600, text: 'hello world' }],
      },
    },
    options: {
      includeSubtitles: true,
      normalizeAudio: true,
      aspectRatio: '9:16' as const,
      quality: '1080p' as const,
      subtitleStyle: {
        fontToken: 'F_INTER',
        textColorToken: 'C_WHITE',
        bgColorToken: 'C_BLACK',
        fontSize: 28,
        position: 'bottom',
        animation: 'none',
      },
    },
  };

  it('returns deterministic file name for identical payload', () => {
    const first = buildLivePreviewCacheFileName(baseInput);
    const second = buildLivePreviewCacheFileName(baseInput);

    expect(first).toBe(second);
    expect(first).toMatch(/^live-preview-[a-f0-9]{40}\.mp4$/);
  });

  it('changes file name when export options differ', () => {
    const first = buildLivePreviewCacheFileName(baseInput);
    const changed = buildLivePreviewCacheFileName({
      ...baseInput,
      options: {
        ...baseInput.options,
        quality: '720p',
      },
    });

    expect(changed).not.toBe(first);
  });

  it('changes file name when transcript payload changes', () => {
    const first = buildLivePreviewCacheFileName(baseInput);
    const changed = buildLivePreviewCacheFileName({
      ...baseInput,
      clipPayload: {
        ...baseInput.clipPayload,
        transcript: {
          segments: [{ startMs: 0, endMs: 1600, text: 'hello updated world' }],
        },
      },
    });

    expect(changed).not.toBe(first);
  });
});
