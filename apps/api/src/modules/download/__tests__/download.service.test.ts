import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockLogger } = vi.hoisted(() => ({
  mockPrisma: {
    downloadJob: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
  mockLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/config/env', () => ({
  env: {
    MEDIA_INPUT_DIR: '/tmp',
    COBALT_API_URL: '',
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

vi.mock('./../download.utils', () => ({
  detectPlatform: vi.fn(),
  isDirectVideoUrl: vi.fn(),
  isSoraUrl: vi.fn(),
}));

vi.mock('./../services/download.cobalt.service', () => ({
  downloadCobaltService: {
    runCobalt: vi.fn(),
  },
}));

vi.mock('./../services/download.direct.service', () => ({
  downloadDirectService: {
    downloadDirectUrl: vi.fn(),
  },
}));

vi.mock('./../services/download.metadata.service', () => ({
  downloadMetadataService: {
    getVideoMetadata: vi.fn(),
  },
}));

vi.mock('./../services/download.sora.service', () => ({
  downloadSoraService: {
    downloadSoraVideo: vi.fn(),
  },
}));

vi.mock('./../services/download.ytdlp.service', () => ({
  downloadYtDlpService: {
    runYtDlp: vi.fn(),
  },
}));

import { downloadService } from '../download.service';

function createMockDownloadJob(overrides = {}) {
  return {
    id: 'download-123',
    userId: 'user-123',
    sourceUrl: 'https://example.com/video',
    platform: 'YOUTUBE',
    status: 'COMPLETED',
    title: 'Video Example',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    completedAt: new Date('2024-01-01T00:05:00.000Z'),
    ...overrides,
  };
}

describe('downloadService.getHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns download history with total count', async () => {
    const jobs = [
      createMockDownloadJob({ id: 'download-1' }),
      createMockDownloadJob({ id: 'download-2' }),
    ];

    mockPrisma.downloadJob.findMany.mockResolvedValue(jobs);
    mockPrisma.downloadJob.count.mockResolvedValue(9);

    const result = await downloadService.getHistory('user-123', 20);

    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBe(null);
    expect(result.total).toBe(9);
    expect(mockPrisma.downloadJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-123' }),
        take: 21,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(mockPrisma.downloadJob.count).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
    });
  });
});
