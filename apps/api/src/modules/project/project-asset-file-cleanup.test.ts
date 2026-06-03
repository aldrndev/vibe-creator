import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const TEST_MEDIA_ROOT = '/tmp/vibe-project-asset-cleanup-tests';

vi.mock('@/config/env', () => ({
  env: {
    MEDIA_INPUT_DIR: '/tmp/vibe-project-asset-cleanup-tests',
  },
}));

const loggerMock = vi.hoisted(() => ({
  warn: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: loggerMock,
}));

import { cleanupProjectAssetFiles } from './project-asset-file-cleanup';

describe('cleanupProjectAssetFiles', () => {
  afterEach(async () => {
    await rm(TEST_MEDIA_ROOT, { recursive: true, force: true });
  });

  it('removes all local asset files for an expired project and reports released bytes', async () => {
    const projectDirectory = join(TEST_MEDIA_ROOT, 'projects', 'project-1');
    await mkdir(join(projectDirectory, 'nested'), { recursive: true });
    await writeFile(join(projectDirectory, 'image.png'), 'image');
    await writeFile(join(projectDirectory, 'nested', 'video.mp4'), 'video-data');

    await expect(cleanupProjectAssetFiles('project-1')).resolves.toEqual({
      succeeded: true,
      deletedFiles: 2,
      freedBytes: 15,
    });
    await expect(stat(projectDirectory)).rejects.toThrow();
  });

  it('is idempotent when a project directory was already removed', async () => {
    await expect(cleanupProjectAssetFiles('missing-project')).resolves.toEqual({
      succeeded: true,
      deletedFiles: 0,
      freedBytes: 0,
    });
  });

  it('rejects a project id that would escape the project storage root', async () => {
    const outsideDirectory = join(TEST_MEDIA_ROOT, 'outside');
    const outsideFile = join(outsideDirectory, 'must-stay.txt');
    await mkdir(outsideDirectory, { recursive: true });
    await writeFile(outsideFile, 'keep');

    await expect(cleanupProjectAssetFiles('../outside')).resolves.toEqual({
      succeeded: false,
      deletedFiles: 0,
      freedBytes: 0,
    });
    await expect(stat(outsideFile)).resolves.toBeDefined();
    expect(loggerMock.warn).toHaveBeenCalled();
  });
});
