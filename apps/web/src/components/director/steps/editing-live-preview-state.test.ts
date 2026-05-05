import { describe, expect, it } from 'vitest';
import {
  canPlayFinalPreview,
  estimatePreviewProgressPercent,
  resolvePreviewStatus,
} from '@/components/director/steps/editing-live-preview-state';

describe('resolvePreviewStatus', () => {
  it('returns ready when payload matches the latest generated preview', () => {
    const status = resolvePreviewStatus({
      previewPayloadJson: '{"key":"value"}',
      previewStatus: 'dirty',
      renderPreviewPath: '/preview.mp4',
      previewDownloadPath: '/download.mp4',
      lastGeneratedPayloadKey: '{"key":"value"}',
      lastAttemptPayloadKey: '{"key":"value"}',
    });

    expect(status).toBe('ready');
  });

  it('returns dirty when an older preview exists for a new payload', () => {
    const status = resolvePreviewStatus({
      previewPayloadJson: '{"key":"new"}',
      previewStatus: 'ready',
      renderPreviewPath: '/preview-old.mp4',
      previewDownloadPath: '/download-old.mp4',
      lastGeneratedPayloadKey: '{"key":"old"}',
      lastAttemptPayloadKey: '{"key":"old"}',
    });

    expect(status).toBe('dirty');
  });

  it('keeps failed state for the same payload after generation fails', () => {
    const status = resolvePreviewStatus({
      previewPayloadJson: '{"key":"value"}',
      previewStatus: 'failed',
      renderPreviewPath: null,
      previewDownloadPath: null,
      lastGeneratedPayloadKey: null,
      lastAttemptPayloadKey: '{"key":"value"}',
    });

    expect(status).toBe('failed');
  });
});

describe('estimatePreviewProgressPercent', () => {
  it('returns a monotonic estimate within 0..94', () => {
    const samples = [0, 500, 1_000, 2_000, 4_000, 8_000].map(estimatePreviewProgressPercent);

    for (let index = 1; index < samples.length; index++) {
      expect(samples[index]).toBeGreaterThanOrEqual(samples[index - 1] ?? 0);
    }

    expect(samples[0]).toBe(0);
    expect(samples.at(-1)).toBeLessThanOrEqual(94);
  });
});

describe('canPlayFinalPreview', () => {
  it('allows playback only for the current generated preview', () => {
    expect(canPlayFinalPreview('ready', 'blob:preview')).toBe(true);
    expect(canPlayFinalPreview('dirty', 'blob:preview')).toBe(false);
    expect(canPlayFinalPreview('idle', null)).toBe(false);
    expect(canPlayFinalPreview('generating', 'blob:preview')).toBe(false);
  });
});
