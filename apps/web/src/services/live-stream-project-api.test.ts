import { describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  api: apiMock,
  authFetch: vi.fn(),
}));

vi.mock('@/services/export-api', () => ({
  exportApi: {
    uploadMedia: vi.fn(),
  },
}));

import { getStreamHistory, getStreamQuota } from './live-stream-project-api';

describe('live stream project api', () => {
  it('parses unlimited admin quota responses', async () => {
    apiMock.get.mockResolvedValueOnce({
      success: true,
      data: {
        remaining: null,
        total: null,
        used: 0,
        isUnlimited: true,
        cycleEnd: null,
      },
    });

    await expect(getStreamQuota()).resolves.toEqual({
      remaining: null,
      total: null,
      used: 0,
      isUnlimited: true,
      cycleEnd: null,
    });
  });

  it('requests compact stream history pages by default', async () => {
    apiMock.get.mockResolvedValueOnce({
      success: true,
      data: {
        streams: [],
        nextCursor: null,
      },
    });

    await getStreamHistory();

    expect(apiMock.get).toHaveBeenCalledWith('/stream/history?limit=10');
  });
});
