/**
 * Download Service Unit Tests
 * 
 * ✅ Happy path
 * ❌ Negative/error cases
 * 🔄 Edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules with vi.hoisted
const { mockPrisma, mockLogger } = vi.hoisted(() => ({
  mockPrisma: {
    downloadJob: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

vi.mock('@/config/env', () => ({
  env: {
    COBALT_API_URL: 'http://localhost:9000',
    NODE_ENV: 'test',
  },
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ size: 1024 }),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocks
import { downloadService } from '../download.service';

// Test data factories
function createMockJob(overrides = {}) {
  return {
    id: 'job-123',
    userId: 'user-123',
    sourceUrl: 'https://youtube.com/watch?v=abc',
    platform: 'youtube',
    status: 'PENDING',
    title: null,
    localPath: null,
    errorMessage: null,
    completedAt: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('downloadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // createJob
  // ============================================================================
  describe('createJob', () => {
    it('should create download job for YouTube URL', async () => {
      // Arrange
      mockPrisma.downloadJob.count.mockResolvedValue(0); // No pending jobs
      const job = createMockJob();
      mockPrisma.downloadJob.create.mockResolvedValue(job);

      // Act
      const result = await downloadService.createJob({
        userId: 'user-123',
        sourceUrl: 'https://youtube.com/watch?v=abc123',
      });

      // Assert
      expect(result.id).toBe('job-123');
      expect(mockPrisma.downloadJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            platform: 'youtube',
          }),
        })
      );
    });

    it('should detect TikTok platform', async () => {
      // Arrange
      mockPrisma.downloadJob.count.mockResolvedValue(0);
      const job = createMockJob({ platform: 'tiktok' });
      mockPrisma.downloadJob.create.mockResolvedValue(job);

      // Act
      await downloadService.createJob({
        userId: 'user-123',
        sourceUrl: 'https://tiktok.com/@user/video/123',
      });

      // Assert
      expect(mockPrisma.downloadJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ platform: 'tiktok' }),
        })
      );
    });

    it('should throw error when rate limit exceeded', async () => {
      // Arrange - 5 pending jobs (limit)
      mockPrisma.downloadJob.count.mockResolvedValue(5);

      // Act & Assert
      await expect(
        downloadService.createJob({
          userId: 'user-123',
          sourceUrl: 'https://youtube.com/watch?v=abc',
        })
      ).rejects.toThrow('Too many pending downloads');
    });
  });

  // ============================================================================
  // getJobStatus
  // ============================================================================
  describe('getJobStatus', () => {
    it('should return job status for valid job', async () => {
      // Arrange
      const job = createMockJob({ status: 'COMPLETED', title: 'Test Video' });
      mockPrisma.downloadJob.findFirst.mockResolvedValue(job);

      // Act
      const result = await downloadService.getJobStatus('job-123', 'user-123');

      // Assert
      expect(result).toBeDefined();
      expect(result?.status).toBe('COMPLETED');
      expect(result?.title).toBe('Test Video');
    });

    it('should throw error for non-existent job', async () => {
      // Arrange
      mockPrisma.downloadJob.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(downloadService.getJobStatus('nonexistent', 'user-123')).rejects.toThrow('Download job not found');
    });

    it('should verify user ownership in query', async () => {
      // Arrange
      const job = createMockJob();
      mockPrisma.downloadJob.findFirst.mockResolvedValue(job);

      // Act
      await downloadService.getJobStatus('job-123', 'different-user');

      // Assert
      expect(mockPrisma.downloadJob.findFirst).toHaveBeenCalledWith({
        where: { id: 'job-123', userId: 'different-user' },
      });
    });
  });

  // ============================================================================
  // deleteJob
  // ============================================================================
  describe('deleteJob', () => {
    it('should delete job and return deleted status', async () => {
      // Arrange
      const job = createMockJob();
      mockPrisma.downloadJob.findFirst.mockResolvedValue(job);
      mockPrisma.downloadJob.delete.mockResolvedValue(job);

      // Act
      const result = await downloadService.deleteJob('job-123', 'user-123');

      // Assert
      expect(result.deleted).toBe(true);
      expect(mockPrisma.downloadJob.delete).toHaveBeenCalled();
    });

    it('should throw error for non-existent job', async () => {
      // Arrange
      mockPrisma.downloadJob.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(downloadService.deleteJob('nonexistent', 'user-123')).rejects.toThrow('Download job not found');
      expect(mockPrisma.downloadJob.delete).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // getHistory
  // ============================================================================
  describe('getHistory', () => {
    it('should return download history for user', async () => {
      // Arrange
      const jobs = [
        createMockJob({ id: 'job-1' }),
        createMockJob({ id: 'job-2' }),
      ];
      mockPrisma.downloadJob.findMany.mockResolvedValue(jobs);

      // Act
      const result = await downloadService.getHistory('user-123', 10);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrisma.downloadJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          take: 10,
        })
      );
    });

    it('should return empty array when no history', async () => {
      // Arrange
      mockPrisma.downloadJob.findMany.mockResolvedValue([]);

      // Act
      const result = await downloadService.getHistory('new-user');

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});
