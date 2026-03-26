/**
 * @module director/__tests__/unit/handlers
 * @description Unit tests for director job handlers.
 *
 * These tests verify handler behavior via direct function calls,
 * avoiding complex Worker mocking.
 *
 * Coverage:
 * - Job idempotency (already completed check)
 * - Error handling
 * - State transitions
 */

import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock prisma
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    directorSession: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    directorAnalysisJob: {
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    directorTranscribeJob: {
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    directorSelectedClip: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      count: vi.fn().mockResolvedValue(1),
    },
    directorClipTranscript: {
      count: vi.fn().mockResolvedValue(1),
    },
    userSession: {
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    },
    $transaction: vi.fn().mockImplementation((fn) =>
      fn({
        directorAnalysisJob: { update: mockUpdate },
        directorClipCandidate: { createMany: vi.fn() },
        directorSession: { update: mockUpdate },
      }),
    ),
  },
}));

// Mock file system
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock env
vi.mock('@/config/env', () => ({
  env: {
    MEDIA_INPUT_DIR: '/tmp/test',
  },
}));

// Mock director processor
vi.mock('@/modules/director/director.processor', () => ({
  directorProcessor: {
    extractAudioProxy: vi.fn().mockResolvedValue('/tmp/audio.wav'),
    detectSegments: vi.fn().mockResolvedValue([]),
    refineSegments: vi.fn().mockResolvedValue([]),
    generateClipPreview: vi.fn().mockResolvedValue('preview.jpg'),
    exportVideo: vi.fn().mockResolvedValue('output.mp4'),
  },
}));

// Mock transcribe service
vi.mock('@/modules/transcribe/transcribe.service', () => ({
  transcribeService: {
    transcribeSelectedClip: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock director queue
vi.mock('@/modules/director/director.queue', () => ({
  DIRECTOR_QUEUE_NAME: 'director-analysis',
  directorQueue: {
    addBulk: vi.fn().mockResolvedValue([]),
  },
}));

describe('director handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analysis handler idempotency', () => {
    it('should skip if analysis already completed', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'session-1',
        analysisJob: { status: 'COMPLETED' },
      });

      const { processAnalysisJob } = await import('@/modules/director/handlers/analysis.handler');

      const mockJob = {
        id: 'job-1',
        data: {
          type: 'ANALYSIS',
          sessionId: 'session-1',
          assetId: 'asset-1',
          filePath: '/path/to/file.mp4',
        },
      } as unknown as Job;

      await processAnalysisJob(mockJob);

      // Should not update status if already completed
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should throw if session not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const { processAnalysisJob } = await import('@/modules/director/handlers/analysis.handler');

      const mockJob = {
        id: 'job-1',
        data: {
          type: 'ANALYSIS',
          sessionId: 'nonexistent',
          assetId: 'asset-1',
          filePath: '/path/to/file.mp4',
        },
      } as unknown as Job;

      await expect(processAnalysisJob(mockJob)).rejects.toThrow('Session not found');
    });
  });

  describe('transcribe handler', () => {
    it('should throw if session not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const { processTranscribeSessionJob } = await import(
        '@/modules/director/handlers/transcribe.handler'
      );

      const mockJob = {
        id: 'job-1',
        data: {
          type: 'TRANSCRIBE_SESSION',
          sessionId: 'nonexistent',
          userId: 'user-1',
        },
      } as unknown as Job;

      await expect(processTranscribeSessionJob(mockJob)).rejects.toThrow(
        'Session or transcribe job not found',
      );
    });
  });

  describe('export handler', () => {
    it('should throw if session not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const { processExportJob } = await import('@/modules/director/handlers/export.handler');

      const mockJob = {
        id: 'job-1',
        data: {
          type: 'EXPORT',
          sessionId: 'nonexistent',
          userId: 'user-1',
          options: {},
        },
        updateProgress: vi.fn(),
      } as unknown as Job;

      await expect(processExportJob(mockJob)).rejects.toThrow('Session or export job not found');
    });
  });
});
