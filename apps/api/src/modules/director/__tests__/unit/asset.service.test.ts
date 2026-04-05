import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  directorRepoMock,
  downloadServiceMock,
  videoMetadataServiceMock,
  resolveTempUploadReferenceMock,
  copyFileMock,
  mkdirMock,
  statMock,
  unlinkMock,
  existsSyncMock,
} = vi.hoisted(() => ({
  directorRepoMock: {
    findSession: vi.fn(),
    findAssetBySession: vi.fn(),
    findLatestReusableUrlAsset: vi.fn(),
    findLatestReusableContentAsset: vi.fn(),
    findReusableContentAssetCandidates: vi.fn(),
    createAsset: vi.fn(),
    updateAsset: vi.fn(),
    deleteAsset: vi.fn(),
  },
  downloadServiceMock: {
    getVideoMetadata: vi.fn(),
  },
  videoMetadataServiceMock: {
    getVideoMetadata: vi.fn(),
  },
  resolveTempUploadReferenceMock: vi.fn(),
  copyFileMock: vi.fn(),
  mkdirMock: vi.fn(),
  statMock: vi.fn(),
  unlinkMock: vi.fn(),
  existsSyncMock: vi.fn(),
}));

vi.mock('@/modules/director/director.repo', () => ({
  directorRepo: directorRepoMock,
}));

vi.mock('@/modules/download/download.service', () => ({
  downloadService: downloadServiceMock,
}));

vi.mock('@/modules/director/processing/video-metadata.service', () => ({
  videoMetadataService: videoMetadataServiceMock,
}));

vi.mock('@/utils/temp-upload', () => ({
  resolveTempUploadReference: resolveTempUploadReferenceMock,
}));

vi.mock('node:fs/promises', () => ({
  copyFile: copyFileMock,
  mkdir: mkdirMock,
  stat: statMock,
  unlink: unlinkMock,
}));

vi.mock('node:fs', () => ({
  createReadStream: vi.fn(),
  existsSync: existsSyncMock,
}));

vi.mock('@/config/env', () => ({
  env: {
    MEDIA_INPUT_DIR: '/tmp/uploads',
    MAX_VIDEO_DURATION_MS: 60 * 60 * 1000,
    MAX_UPLOAD_SIZE_MB: 2048,
    TEMP_DIR: '/tmp',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { directorAssetService } from '@/modules/director/services/asset.service';

describe('directorAssetService.importAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    directorRepoMock.findSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
    });
    directorRepoMock.findAssetBySession.mockResolvedValue(null);
    directorRepoMock.findReusableContentAssetCandidates.mockResolvedValue([]);
    directorRepoMock.createAsset.mockImplementation(async (data: { id: string }) => ({
      id: data.id,
      ingestStatus: 'READY',
    }));
    downloadServiceMock.getVideoMetadata.mockResolvedValue({
      duration: 120,
      title: 'Reusable video',
      size: 4096,
    });
    existsSyncMock.mockReturnValue(true);
    statMock.mockResolvedValue({
      size: 4096,
    });
    unlinkMock.mockResolvedValue(undefined);
    copyFileMock.mockResolvedValue(undefined);
    mkdirMock.mockResolvedValue(undefined);
    videoMetadataServiceMock.getVideoMetadata.mockResolvedValue({
      duration: 120,
    });
    resolveTempUploadReferenceMock.mockReturnValue('/tmp/uploads/temp/source.mp4');
  });

  it('reuses an existing ready asset for the same normalized URL', async () => {
    directorRepoMock.findLatestReusableUrlAsset.mockResolvedValue({
      id: 'asset-existing',
      storageKey: 'uploads/director/existing.mp4',
      contentHash: 'hash-1',
      mimeType: 'video/mp4',
      sizeBytes: BigInt(4096),
      durationMs: 120000,
      thumbnailStorageKey: null,
      metadata: { title: 'Reusable video' },
    });

    const triggerSpy = vi
      .spyOn(directorAssetService, 'triggerUrlDownload')
      .mockResolvedValue(undefined);

    await directorAssetService.importAsset('session-1', 'user-1', {
      type: 'url',
      url: 'https://www.youtube.com/watch?v=abc123',
    });

    expect(directorRepoMock.createAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        storageKey: 'uploads/director/existing.mp4',
        ingestStatus: 'READY',
      }),
    );
    expect(triggerSpy).not.toHaveBeenCalled();
  });

  it('reuses a legacy file asset by matching computed hash from candidate storage', async () => {
    directorRepoMock.findLatestReusableContentAsset.mockResolvedValue(null);
    directorRepoMock.findReusableContentAssetCandidates.mockResolvedValue([
      {
        id: 'asset-legacy',
        storageKey: 'uploads/director/legacy.mp4',
        contentHash: null,
        mimeType: 'video/mp4',
        sizeBytes: BigInt(4096),
        durationMs: 120000,
        thumbnailStorageKey: null,
        metadata: {},
      },
    ]);

    const computeFileHashSpy = vi
      .spyOn(directorAssetService, 'computeFileHash')
      .mockResolvedValue('legacy-hash');

    await directorAssetService.importAsset('session-1', 'user-1', {
      type: 'file',
      filePath: 'source.mp4',
    });

    expect(directorRepoMock.updateAsset).toHaveBeenCalledWith('asset-legacy', {
      contentHash: expect.any(String),
    });
    expect(copyFileMock).not.toHaveBeenCalled();
    expect(computeFileHashSpy).toHaveBeenCalledTimes(2);
  });
});
