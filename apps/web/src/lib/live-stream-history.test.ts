import { describe, expect, it } from 'vitest';
import {
  formatLiveStreamElapsed,
  getStreamQuotaUsageLabel,
  getStreamStatusPresentation,
  getStreamStopReasonLabel,
} from './live-stream-history';

describe('live stream history helpers', () => {
  it('maps failed-before-live streams to a safe gagal mulai label', () => {
    expect(
      getStreamStatusPresentation({
        status: 'FAILED',
        durationMinutesBilled: 0,
      }).label,
    ).toBe('Gagal mulai');
    expect(
      getStreamQuotaUsageLabel({
        status: 'FAILED',
        durationMinutesBilled: 0,
      }),
    ).toBe('Tidak mengurangi quota');
  });

  it('maps failed-after-live streams to terputus with quota usage', () => {
    expect(
      getStreamStatusPresentation({
        status: 'FAILED',
        durationMinutesBilled: 1,
      }).label,
    ).toBe('Terputus');
    expect(
      getStreamQuotaUsageLabel({
        status: 'FAILED',
        durationMinutesBilled: 1,
      }),
    ).toBe('Quota terpakai: 1 menit');
  });

  it('does not expose raw stop reason values', () => {
    expect(getStreamStopReasonLabel('ERROR')).toBe('Stream terputus');
    expect(getStreamStopReasonLabel('PROCESS_LOST')).toBe('Stream terputus');
    expect(getStreamStopReasonLabel(undefined)).toBe('Tidak diketahui');
  });

  it('formats live elapsed minutes', () => {
    expect(
      formatLiveStreamElapsed(
        new Date('2026-06-03T12:00:00.000Z'),
        new Date('2026-06-03T12:02:01.000Z'),
      ),
    ).toBe('2 menit berjalan');
  });
});
