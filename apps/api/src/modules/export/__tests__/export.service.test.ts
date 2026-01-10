/**
 * Export Service Unit Tests
 * 
 * ✅ Happy path
 * ❌ Negative/error cases
 * 🔄 Edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules with vi.hoisted
const { mockPrisma, mockLogger, mockFfmpegProcessor } = vi.hoisted(() => ({
  mockPrisma: {
    exportHistory: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
  mockLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  mockFfmpegProcessor: {
    trim: vi.fn(),
    concat: vi.fn(),
    addWatermark: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

vi.mock('./ffmpeg.processor', () => ({
  ffmpegProcessor: mockFfmpegProcessor,
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  copyFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

// Import after mocks
import { exportService } from '../export.service';

// Test data factories
function createMockExportJob(overrides = {}) {
  return {
    id: 'export-123',
    userId: 'user-123',
    projectId: 'project-123',
    format: 'MP4',
    resolution: 'HD',
    status: 'QUEUED',
    progress: 0,
    timelineData: {
      clips: [{ localPath: '/tmp/video.mp4', startTime: 0, endTime: 5 }],
      settings: { width: 1920, height: 1080, fps: 30 },
    },
    localPath: null,
    errorMessage: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('exportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // createJob
  // ============================================================================
  describe('createJob', () => {
    it('should create export job with default settings', async () => {
      // Arrange
      mockPrisma.exportHistory.count.mockResolvedValue(0); // No pending jobs
      const job = createMockExportJob();
      mockPrisma.exportHistory.create.mockResolvedValue(job);

      // Act
      const result = await exportService.createJob({
        userId: 'user-123',
        projectId: 'project-123',
        timelineData: {
          clips: [{ localPath: '/tmp/video.mp4', startTime: 0, endTime: 5 }],
          settings: { width: 1920, height: 1080, fps: 30 },
        },
      });

      // Assert
      expect(result.id).toBe('export-123');
      expect(mockPrisma.exportHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            projectId: 'project-123',
            format: 'MP4',
            resolution: 'HD',
            status: 'QUEUED',
          }),
        })
      );
    });

    it('should throw error when rate limit exceeded', async () => {
      // Arrange - 3 pending jobs (limit)
      mockPrisma.exportHistory.count.mockResolvedValue(3);

      // Act & Assert
      await expect(
        exportService.createJob({
          userId: 'user-123',
          projectId: 'project-123',
          timelineData: {
            clips: [],
            settings: { width: 1920, height: 1080, fps: 30 },
          },
        })
      ).rejects.toThrow('Too many pending export jobs');
    });

    it('should allow custom format and resolution', async () => {
      // Arrange
      mockPrisma.exportHistory.count.mockResolvedValue(0);
      const job = createMockExportJob({ format: 'WEBM', resolution: 'UHD' });
      mockPrisma.exportHistory.create.mockResolvedValue(job);

      // Act
      await exportService.createJob({
        userId: 'user-123',
        projectId: 'project-123',
        timelineData: {
          clips: [],
          settings: { width: 3840, height: 2160, fps: 60 },
        },
        format: 'WEBM',
        resolution: 'UHD',
      });

      // Assert
      expect(mockPrisma.exportHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            format: 'WEBM',
            resolution: 'UHD',
          }),
        })
      );
    });
  });

  // ============================================================================
  // getJobStatus
  // ============================================================================
  describe('getJobStatus', () => {
    it('should return job status', async () => {
      // Arrange
      const job = createMockExportJob({ status: 'COMPLETED', progress: 100 });
      mockPrisma.exportHistory.findFirst.mockResolvedValue(job);

      // Act
      const result = await exportService.getJobStatus('export-123', 'user-123');

      // Assert
      expect(result.status).toBe('COMPLETED');
      expect(result.progress).toBe(100);
    });

    it('should throw error when job not found', async () => {
      // Arrange
      mockPrisma.exportHistory.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(exportService.getJobStatus('nonexistent', 'user-123')).rejects.toThrow('Export job not found');
    });
  });

  // ============================================================================
  // getHistory
  // ============================================================================
  describe('getHistory', () => {
    it('should return export history for user', async () => {
      // Arrange
      const jobs = [
        createMockExportJob({ id: 'job-1' }),
        createMockExportJob({ id: 'job-2' }),
      ];
      mockPrisma.exportHistory.findMany.mockResolvedValue(jobs);

      // Act
      const result = await exportService.getHistory('user-123', 10);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrisma.exportHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          take: 10,
        })
      );
    });

    it('should use default limit of 10', async () => {
      // Arrange
      mockPrisma.exportHistory.findMany.mockResolvedValue([]);

      // Act
      await exportService.getHistory('user-123');

      // Assert
      expect(mockPrisma.exportHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });
  });
});
