import { beforeEach, describe, expect, it, vi } from 'vitest';

const { directorRepoMock, directorQueueMock } = vi.hoisted(() => ({
  directorRepoMock: {
    findSession: vi.fn(),
    createExportJob: vi.fn(),
    updateStep: vi.fn(),
  },
  directorQueueMock: {
    add: vi.fn(),
    getJob: vi.fn(),
  },
}));

vi.mock('@/modules/director/director.repo', () => ({
  directorRepo: directorRepoMock,
}));

vi.mock('@/modules/director/director.queue', () => ({
  directorQueue: directorQueueMock,
  buildDirectorQueueJobId: vi.fn(() => 'director-export-job-1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { directorExportService } from '@/modules/director/services/export.service';

describe('directorExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startExport', () => {
    it('rejects export when session still has multiple selected clips', async () => {
      directorRepoMock.findSession.mockResolvedValueOnce({
        id: 'session-1',
        selectedClips: [{ id: 'clip-1' }, { id: 'clip-2' }],
        exportJob: null,
      });

      await expect(
        directorExportService.startExport('session-1', 'user-1', {
          includeSubtitles: true,
        }),
      ).rejects.toThrow('Ekspor hanya mendukung 1 klip untuk 1 short');
    });

    it('queues export when exactly one clip is selected', async () => {
      directorRepoMock.findSession.mockResolvedValueOnce({
        id: 'session-1',
        selectedClips: [{ id: 'clip-1' }],
        exportJob: null,
      });
      directorRepoMock.createExportJob.mockResolvedValueOnce({
        id: 'export-job-1',
        includeSubtitles: true,
        aspectRatio: '9:16',
        quality: '1080p',
        status: 'PENDING',
      });

      const job = await directorExportService.startExport('session-1', 'user-1', {
        includeSubtitles: true,
        normalizeAudio: true,
      });

      expect(directorRepoMock.createExportJob).toHaveBeenCalledTimes(1);
      expect(directorRepoMock.updateStep).toHaveBeenCalledWith('session-1', 'user-1', 'EXPORTING');
      expect(directorQueueMock.add).toHaveBeenCalledTimes(1);
      expect(job).toEqual(
        expect.objectContaining({
          id: 'export-job-1',
          status: 'PENDING',
        }),
      );
    });
  });

  describe('getExportResult', () => {
    it('returns queue progress when available', async () => {
      directorRepoMock.findSession.mockResolvedValueOnce({
        id: 'session-1',
        selectedClips: [{ id: 'clip-1' }],
        exportJob: {
          id: 'export-job-1',
          status: 'PROCESSING',
          outputStorageKey: null,
        },
      });
      directorQueueMock.getJob.mockResolvedValueOnce({
        progress: 68,
      });

      const result = await directorExportService.getExportResult('session-1', 'user-1');

      expect(directorQueueMock.getJob).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        expect.objectContaining({
          id: 'export-job-1',
          progress: 68,
        }),
      );
    });

    it('falls back to status-based progress when queue progress is missing', async () => {
      directorRepoMock.findSession.mockResolvedValueOnce({
        id: 'session-1',
        selectedClips: [{ id: 'clip-1' }],
        exportJob: {
          id: 'export-job-2',
          status: 'COMPLETED',
          outputStorageKey: 'director/exports/file.mp4',
        },
      });
      directorQueueMock.getJob.mockResolvedValueOnce(null);

      const result = await directorExportService.getExportResult('session-1', 'user-1');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'export-job-2',
          progress: 100,
        }),
      );
    });
  });
});
