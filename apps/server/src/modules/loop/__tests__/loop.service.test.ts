/**
 * Loop Service Unit Tests
 * 
 * Note: These services spawn FFmpeg processes, so tests focus on:
 * - Input validation
 * - Directory creation
 * - Correct FFmpeg args construction
 * 
 * ✅ Happy path
 * ❌ Negative/error cases
 * 🔄 Edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules with vi.hoisted
const { mockLogger, mockSpawn, mockMkdir, mockExistsSync } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  mockSpawn: vi.fn(),
  mockMkdir: vi.fn().mockResolvedValue(undefined),
  mockExistsSync: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

vi.mock('child_process', () => ({
  spawn: mockSpawn,
}));

vi.mock('fs/promises', () => ({
  mkdir: mockMkdir,
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
}));

// Import after mocks
import { loopService } from '../loop.service';

// Helper to create mock child process
function createMockProcess(exitCode = 0) {
  const listeners: Record<string, (...args: unknown[]) => void> = {};
  
  return {
    stderr: {
      on: vi.fn((event: string, cb: (data: unknown) => void) => {
        listeners[`stderr:${event}`] = cb;
      }),
    },
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = cb;
      // Auto trigger close after small delay for tests
      if (event === 'close') {
        setTimeout(() => cb(exitCode), 10);
      }
    }),
    kill: vi.fn(),
  };
}

describe('loopService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
  });

  // ============================================================================
  // createLoop
  // ============================================================================
  describe('createLoop', () => {
    it('should create looped video successfully', async () => {
      // Arrange
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess);

      // Act
      const result = await loopService.createLoop({
        inputPath: '/tmp/video.mp4',
        loopCount: 3,
      });

      // Assert
      expect(result).toContain('.mp4');
      expect(mockSpawn).toHaveBeenCalledWith('ffmpeg', expect.any(Array));
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should create loops directory if not exists', async () => {
      // Arrange
      mockExistsSync.mockReturnValue(false);
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess);

      // Act
      await loopService.createLoop({
        inputPath: '/tmp/video.mp4',
        loopCount: 2,
      });

      // Assert
      expect(mockMkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should handle FFmpeg failure', async () => {
      // Arrange
      const mockProcess = createMockProcess(1); // Non-zero exit
      mockSpawn.mockReturnValue(mockProcess);

      // Act & Assert
      await expect(
        loopService.createLoop({
          inputPath: '/tmp/video.mp4',
          loopCount: 2,
        })
      ).rejects.toThrow('FFmpeg failed');
    });

    it('should apply trimming when startMs and endMs provided', async () => {
      // Arrange
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess);

      // Act
      await loopService.createLoop({
        inputPath: '/tmp/video.mp4',
        startMs: 1000,
        endMs: 5000,
        loopCount: 2,
      });

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'ffmpeg',
        expect.arrayContaining(['-filter_complex', expect.stringContaining('trim=')])
      );
    });
  });

  // ============================================================================
  // createBoomerang
  // ============================================================================
  describe('createBoomerang', () => {
    it('should create boomerang video', async () => {
      // Arrange
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess);

      // Act
      const result = await loopService.createBoomerang({
        inputPath: '/tmp/video.mp4',
      });

      // Assert
      expect(result).toContain('.mp4');
      expect(mockSpawn).toHaveBeenCalledWith(
        'ffmpeg',
        expect.arrayContaining(['-filter_complex', expect.stringContaining('reverse')])
      );
    });
  });

  // ============================================================================
  // createGif
  // ============================================================================
  describe('createGif', () => {
    it('should create GIF from video', async () => {
      // Arrange - Two processes for palette + gif
      const mockProcess1 = createMockProcess(0);
      const mockProcess2 = createMockProcess(0);
      mockSpawn
        .mockReturnValueOnce(mockProcess1)
        .mockReturnValueOnce(mockProcess2);

      // Act
      const result = await loopService.createGif({
        inputPath: '/tmp/video.mp4',
        fps: 15,
        width: 480,
      });

      // Assert
      expect(result).toContain('.gif');
    });
  });
});
