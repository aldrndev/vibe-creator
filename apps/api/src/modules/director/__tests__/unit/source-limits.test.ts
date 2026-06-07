import { ERROR_CODES } from '@vibe-creator/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { paymentServiceMock } = vi.hoisted(() => ({
  paymentServiceMock: {
    getSubscription: vi.fn(),
  },
}));

vi.mock('@/config/env', () => ({
  env: {
    MAX_UPLOAD_SIZE_MB: 2048,
    MAX_VIDEO_DURATION_MS: 180 * 60_000,
  },
}));

vi.mock('@/modules/payment/payment.service', () => ({
  paymentService: paymentServiceMock,
}));

import {
  DirectorSourceLimitError,
  getDirectorSourceLimits,
  resolveDirectorSourceLimitsForActor,
  validateDirectorSourceVideo,
} from '../../source-limits';

describe('AI Director source limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentServiceMock.getSubscription.mockResolvedValue({ tier: 'CREATOR' });
  });

  it('uses tier limits for regular users', () => {
    const limits = getDirectorSourceLimits({ tier: 'FREE', role: 'USER' });

    expect(limits.maxSizeLabel).toBe('200MB');
    expect(limits.maxDurationLabel).toBe('30 menit');
  });

  it('uses server hard caps for admins', () => {
    const limits = getDirectorSourceLimits({ tier: 'FREE', role: 'ADMIN' });

    expect(limits.maxSizeLabel).toBe('2GB');
    expect(limits.maxDurationLabel).toBe('180 menit');
  });

  it('resolves the current subscription tier for users', async () => {
    const limits = await resolveDirectorSourceLimitsForActor({ id: 'user-1', role: 'USER' });

    expect(paymentServiceMock.getSubscription).toHaveBeenCalledWith('user-1');
    expect(limits.maxSizeLabel).toBe('750MB');
  });

  it('rejects oversize uploads with the file-specific code', () => {
    const limits = getDirectorSourceLimits({ tier: 'FREE', role: 'USER' });

    expect(() =>
      validateDirectorSourceVideo({
        durationSeconds: 10 * 60,
        sizeBytes: limits.maxSizeBytes + 1,
        limits,
        origin: 'upload',
      }),
    ).toThrow(DirectorSourceLimitError);

    try {
      validateDirectorSourceVideo({
        durationSeconds: 10 * 60,
        sizeBytes: limits.maxSizeBytes + 1,
        limits,
        origin: 'upload',
      });
    } catch (error) {
      expect(error).toMatchObject({ code: ERROR_CODES.DIRECTOR_FILE_TOO_LARGE });
    }
  });

  it('rejects URL imports over the same size policy with URL copy', () => {
    const limits = getDirectorSourceLimits({ tier: 'FREE', role: 'USER' });

    expect(() =>
      validateDirectorSourceVideo({
        durationSeconds: 10 * 60,
        sizeBytes: limits.maxSizeBytes + 1,
        limits,
        origin: 'url',
      }),
    ).toThrow(DirectorSourceLimitError);

    try {
      validateDirectorSourceVideo({
        durationSeconds: 10 * 60,
        sizeBytes: limits.maxSizeBytes + 1,
        limits,
        origin: 'url',
      });
    } catch (error) {
      expect(error).toMatchObject({
        code: ERROR_CODES.DIRECTOR_URL_TOO_LARGE,
        message:
          'Video dari URL melebihi batas paket kamu. Pilih video yang lebih kecil, video yang lebih pendek, atau upgrade paket.',
      });
    }
  });

  it('rejects videos shorter than five minutes', () => {
    const limits = getDirectorSourceLimits({ tier: 'PRO', role: 'USER' });

    expect(() =>
      validateDirectorSourceVideo({
        durationSeconds: 60,
        sizeBytes: 1024,
        limits,
        origin: 'upload',
      }),
    ).toThrow('Video terlalu pendek');
  });

  it('rejects videos longer than the tier duration', () => {
    const limits = getDirectorSourceLimits({ tier: 'FREE', role: 'USER' });

    expect(() =>
      validateDirectorSourceVideo({
        durationSeconds: 31 * 60,
        sizeBytes: 1024,
        limits,
        origin: 'upload',
      }),
    ).toThrow('Durasi video melebihi batas paket kamu');
  });
});
