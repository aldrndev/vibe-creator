/**
 * Stream Service Unit Tests
 * 
 * ✅ Happy path
 * ❌ Negative/error cases
 * 🔄 Edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules with vi.hoisted
const { mockPrisma, mockLogger, mockSpawn } = vi.hoisted(() => ({
  mockPrisma: {
    streamSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
  mockLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  mockSpawn: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

vi.mock('child_process', () => ({
  spawn: mockSpawn,
}));

// Import after mocks
import { streamService } from '../stream.service';

// Helper to create mock child process
function createMockProcess() {
  const listeners: Record<string, (...args: unknown[]) => void> = {};
  
  return {
    stderr: {
      on: vi.fn((event: string, cb: (data: unknown) => void) => {
        listeners[`stderr:${event}`] = cb;
      }),
    },
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = cb;
    }),
    kill: vi.fn(),
  };
}

// Test data factories
function createMockStream(overrides = {}) {
  return {
    id: 'stream-123',
    userId: 'user-123',
    platform: 'youtube',
    status: 'LIVE',
    startedAt: new Date('2024-01-01'),
    endedAt: null,
    ...overrides,
  };
}

describe('streamService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // startStream
  // ============================================================================
  describe('startStream', () => {
    it('should start streaming and return streamId', async () => {
      // Arrange
      const stream = createMockStream({ status: 'STARTING' });
      mockPrisma.streamSession.create.mockResolvedValue(stream);
      const mockProcess = createMockProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Act
      const result = await streamService.startStream({
        userId: 'user-123',
        inputPath: '/tmp/video.mp4',
        config: {
          platform: 'youtube',
          rtmpUrl: '',
          streamKey: 'test-stream-key',
        },
      });

      // Assert
      expect(result.streamId).toBe('stream-123');
      expect(mockPrisma.streamSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            platform: 'youtube',
            status: 'STARTING',
          }),
        })
      );
    });
  });

  // ============================================================================
  // stopStream
  // ============================================================================
  describe('stopStream', () => {
    it('should stop active stream', async () => {
      // Arrange
      const stream = createMockStream({ status: 'LIVE' });
      mockPrisma.streamSession.findFirst.mockResolvedValue(stream);
      mockPrisma.streamSession.update.mockResolvedValue({ ...stream, status: 'ENDED' });

      // Act
      await streamService.stopStream('stream-123', 'user-123');

      // Assert
      expect(mockPrisma.streamSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'stream-123' },
          data: expect.objectContaining({ status: 'ENDED' }),
        })
      );
    });

    it('should throw when stream not found', async () => {
      // Arrange
      mockPrisma.streamSession.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(streamService.stopStream('nonexistent', 'user-123')).rejects.toThrow('Stream not found');
    });
  });

  // ============================================================================
  // getStreamStatus
  // ============================================================================
  describe('getStreamStatus', () => {
    it('should return stream status', async () => {
      // Arrange
      const stream = createMockStream({ status: 'LIVE' });
      mockPrisma.streamSession.findFirst.mockResolvedValue(stream);

      // Act
      const result = await streamService.getStreamStatus('stream-123', 'user-123');

      // Assert
      expect(result.status).toBe('LIVE');
    });

    it('should throw when stream not found', async () => {
      // Arrange
      mockPrisma.streamSession.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(streamService.getStreamStatus('nonexistent', 'user-123')).rejects.toThrow('Stream not found');
    });
  });

  // ============================================================================
  // getHistory
  // ============================================================================
  describe('getHistory', () => {
    it('should return stream history', async () => {
      // Arrange
      const streams = [
        createMockStream({ id: 'stream-1' }),
        createMockStream({ id: 'stream-2' }),
      ];
      mockPrisma.streamSession.findMany.mockResolvedValue(streams);

      // Act
      const result = await streamService.getHistory('user-123', 10);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  // ============================================================================
  // getActiveStreams
  // ============================================================================
  describe('getActiveStreams', () => {
    it('should return only active streams', async () => {
      // Arrange
      const activeStream = createMockStream({ status: 'LIVE' });
      mockPrisma.streamSession.findMany.mockResolvedValue([activeStream]);

      // Act
      const result = await streamService.getActiveStreams('user-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrisma.streamSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['STARTING', 'LIVE'] },
          }),
        })
      );
    });
  });
});
