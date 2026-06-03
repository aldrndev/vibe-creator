import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_MEDIA_ROOT = '/tmp/workspace-thumbnail-service-tests';
const prismaMock = vi.hoisted(() => ({
  project: { findFirst: vi.fn() },
  directorSession: { findFirst: vi.fn() },
  exportHistory: { findFirst: vi.fn() },
  directorExportJob: { findFirst: vi.fn() },
}));
const runFfmpegMock = vi.hoisted(() => vi.fn());

vi.mock('@/config/env', () => ({
  env: { MEDIA_INPUT_DIR: '/tmp/workspace-thumbnail-service-tests' },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/modules/export/ffmpeg', () => ({
  runFFmpeg: runFfmpegMock,
}));

import { getWorkspaceThumbnailFile } from './workspace-thumbnail.service';

interface ThumbnailRunOptions {
  readonly args: string[];
}

describe('getWorkspaceThumbnailFile', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await rm(TEST_MEDIA_ROOT, { recursive: true, force: true });
    await mkdir(join(TEST_MEDIA_ROOT, 'projects', 'loop-1'), { recursive: true });
    await writeFile(join(TEST_MEDIA_ROOT, 'projects', 'loop-1', 'source.mp4'), 'video');
    runFfmpegMock.mockImplementation(async (options: ThumbnailRunOptions) => {
      const outputPath = options.args.at(-1);
      if (!outputPath) {
        throw new Error('Thumbnail output path missing');
      }
      await writeFile(outputPath, 'jpeg');
    });
    prismaMock.exportHistory.findFirst.mockResolvedValue(null);
    prismaMock.directorExportJob.findFirst.mockResolvedValue(null);
  });

  it('creates and reuses a cached preview for an owned Loop Creator source', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'loop-1',
      lifecycleStatus: 'ACTIVE',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      storyData: { kind: 'loop-creator-project', sourceAssetId: 'source-1' },
      assets: [{ id: 'source-1', type: 'VIDEO', r2Key: 'source.mp4' }],
    });

    const firstPath = await getWorkspaceThumbnailFile('user-1', 'loop-creator', 'loop-1');
    const secondPath = await getWorkspaceThumbnailFile('user-1', 'loop-creator', 'loop-1');

    expect(firstPath).toBe(secondPath);
    expect(await readFile(firstPath, 'utf8')).toBe('jpeg');
    expect(runFfmpegMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'loop-1', userId: 'user-1', deletedAt: null } }),
    );
  });

  it('does not expose or render an expired export thumbnail', async () => {
    prismaMock.exportHistory.findFirst.mockResolvedValue({
      id: 'export-1',
      userId: 'user-1',
      status: 'COMPLETED',
      localPath: '/tmp/result.mp4',
      urlExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
      completedAt: new Date('2020-01-01T00:00:00.000Z'),
    });

    await expect(getWorkspaceThumbnailFile('user-1', 'export', 'export-1')).rejects.toMatchObject({
      code: 'DOWNLOAD_EXPIRED',
    });
    expect(runFfmpegMock).not.toHaveBeenCalled();
  });
});
