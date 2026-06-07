import { describe, expect, it } from 'vitest';
import {
  buildLivePreviewUrls,
  isValidLivePreviewFilename,
} from '@/modules/director/export-preview-url';
import { resolveLivePreviewByteRange } from '@/modules/director/routes/export.routes';

describe('export routes helpers', () => {
  it('validates deterministic live preview filenames', () => {
    expect(isValidLivePreviewFilename('live-preview-123.mp4')).toBe(false);
    expect(
      isValidLivePreviewFilename('live-preview-0123456789abcdef0123456789abcdef01234567.mp4'),
    ).toBe(true);
    expect(
      isValidLivePreviewFilename('live-preview-0123456789abcdef0123456789abcdef01234567.mov'),
    ).toBe(false);
  });

  it('builds preview playback and download URLs from one filename', () => {
    const sessionId = 'session-123';
    const previewFileName = 'live-preview-0123456789abcdef0123456789abcdef01234567.mp4';
    const urls = buildLivePreviewUrls(sessionId, previewFileName);

    expect(urls).toEqual({
      previewUrl: `/api/v1/director/sessions/${sessionId}/export/preview/${previewFileName}`,
      downloadUrl: `/api/v1/director/sessions/${sessionId}/export/preview/${previewFileName}/download`,
    });
  });

  it('resolves live preview byte range requests', () => {
    expect(resolveLivePreviewByteRange('bytes=10-19', 100)).toEqual({
      start: 10,
      end: 19,
      length: 10,
    });
    expect(resolveLivePreviewByteRange('bytes=95-', 100)).toEqual({
      start: 95,
      end: 99,
      length: 5,
    });
    expect(resolveLivePreviewByteRange('bytes=-12', 100)).toEqual({
      start: 88,
      end: 99,
      length: 12,
    });
  });

  it('rejects invalid live preview byte range requests', () => {
    expect(resolveLivePreviewByteRange('bytes=100-120', 100)).toBeNull();
    expect(resolveLivePreviewByteRange('bytes=20-10', 100)).toBeNull();
    expect(resolveLivePreviewByteRange('items=0-10', 100)).toBeNull();
    expect(resolveLivePreviewByteRange('bytes=0-10,20-30', 100)).toBeNull();
  });
});
