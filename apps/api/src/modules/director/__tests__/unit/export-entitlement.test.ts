import { beforeEach, describe, expect, it, vi } from 'vitest';

const { paymentServiceMock } = vi.hoisted(() => ({
  paymentServiceMock: {
    getSubscription: vi.fn(),
  },
}));

vi.mock('@/modules/payment/payment.service', () => ({
  paymentService: paymentServiceMock,
}));

import {
  normalizeDirectorExportOptions,
  resolveEffectiveDirectorExportQuality,
} from '../../export-entitlement';

describe('AI Director export entitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentServiceMock.getSubscription.mockResolvedValue({ tier: 'CREATOR' });
  });

  it('uses Free quality for regular Free users', async () => {
    paymentServiceMock.getSubscription.mockResolvedValue({ tier: 'FREE' });

    await expect(
      resolveEffectiveDirectorExportQuality({ id: 'user-1', role: 'USER' }),
    ).resolves.toBe('720p');
  });

  it('uses premium quality for Creator and Pro users', async () => {
    await expect(
      resolveEffectiveDirectorExportQuality({ id: 'creator-1', role: 'USER' }),
    ).resolves.toBe('1080p');

    paymentServiceMock.getSubscription.mockResolvedValue({ tier: 'PRO' });

    await expect(
      resolveEffectiveDirectorExportQuality({ id: 'pro-1', role: 'USER' }),
    ).resolves.toBe('1080p');
  });

  it('uses premium quality for admins without reading subscription', async () => {
    await expect(
      resolveEffectiveDirectorExportQuality({ id: 'admin-1', role: 'ADMIN' }),
    ).resolves.toBe('1080p');

    expect(paymentServiceMock.getSubscription).not.toHaveBeenCalled();
  });

  it('forces portrait output and server-side quality over client options', async () => {
    paymentServiceMock.getSubscription.mockResolvedValue({ tier: 'FREE' });

    const options = await normalizeDirectorExportOptions(
      { id: 'free-1', role: 'USER' },
      {
        aspectRatio: '16:9' as const,
        quality: '1080p' as const,
        includeSubtitles: true,
      },
    );

    expect(options).toEqual({
      aspectRatio: '9:16',
      quality: '720p',
      includeSubtitles: true,
    });
  });
});
