import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockLogger, mockProcessManager, mockReaper } = vi.hoisted(() => ({
  mockPrisma: {
    streamSession: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  mockProcessManager: {
    isStreamActive: vi.fn(() => false),
    requestStreamProcessStop: vi.fn(),
    requestUserStreamStop: vi.fn(),
    scheduleStreamLive: vi.fn(),
    startStreamProcess: vi.fn(),
  },
  mockReaper: {
    setStopStreamHandler: vi.fn(),
    startStreamReaper: vi.fn(),
  },
}));

vi.mock('@/config/env', () => ({
  env: {
    MEDIA_INPUT_DIR: '/tmp/vibe-test-media',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/modules/workspace/workspace-lifecycle', () => ({
  assertWorkspaceActive: vi.fn(),
}));

vi.mock('@/utils/video-info', () => ({
  getVideoDuration: vi.fn(),
  getVideoResolution: vi.fn(),
  hasVideoAudioStream: vi.fn(),
}));

vi.mock('../billing/billing.service', () => ({
  billingService: {
    getQuota: vi.fn(),
    incrementUsage: vi.fn(),
  },
}));

vi.mock('./services/process.manager', () => mockProcessManager);

vi.mock('./services/reaper', () => mockReaper);

vi.mock('./services/rtmp.utils', () => ({
  buildStreamArgs: vi.fn(),
  getRtmpUrl: vi.fn(),
}));

import { streamService } from './stream.service';

describe('streamService.getHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.streamSession.findMany.mockResolvedValue([]);
  });

  it('uses a compact default page size and excludes failed streams that never billed quota', async () => {
    await streamService.getHistory('user-123');

    expect(mockPrisma.streamSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-123',
          AND: [
            {
              OR: [{ status: { not: 'FAILED' } }, { durationMinutesBilled: { gt: 0 } }],
            },
          ],
        },
        take: 11,
      }),
    );
  });

  it('keeps cursor pagination inside the user-visible history filter', async () => {
    const cursor = Buffer.from(
      JSON.stringify({ startedAt: '2026-06-03T12:00:00.000Z', id: 'stream-cursor' }),
      'utf8',
    ).toString('base64url');

    await streamService.getHistory('user-123', { cursor, limit: 5 });

    expect(mockPrisma.streamSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-123',
          AND: [
            {
              OR: [{ status: { not: 'FAILED' } }, { durationMinutesBilled: { gt: 0 } }],
            },
            {
              OR: [
                { startedAt: { lt: new Date('2026-06-03T12:00:00.000Z') } },
                { startedAt: new Date('2026-06-03T12:00:00.000Z'), id: { lt: 'stream-cursor' } },
              ],
            },
          ],
        },
        take: 6,
      }),
    );
  });
});
