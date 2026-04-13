import { describe, expect, it } from 'vitest';
import {
  buildLivePreviewUrls,
  isValidLivePreviewFilename,
} from '@/modules/director/export-preview-url';

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
});
