/**
 * Reaction Service Unit Tests
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
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
}));

// Import after mocks
import { reactionService } from '../reaction.service';

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
      if (event === 'close') {
        setTimeout(() => cb(exitCode), 10);
      }
    }),
    kill: vi.fn(),
  };
}

describe('reactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
  });

  // ============================================================================
  // createReaction
  // ============================================================================
  describe('createReaction', () => {
    it('should create reaction video with PiP overlay', async () => {
      // Arrange
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess);

      // Act
      const result = await reactionService.createReaction({
        mainVideoPath: '/tmp/main.mp4',
        reactionVideoPath: '/tmp/reaction.mp4',
        position: 'bottom-right',
        scale: 0.25,
        margin: 20,
      });

      // Assert
      expect(result).toContain('.mp4');
      expect(mockSpawn).toHaveBeenCalledWith(
        'ffmpeg',
        expect.arrayContaining(['-filter_complex', expect.stringContaining('overlay=')])
      );
    });

    it('should handle top-left position', async () => {
      // Arrange
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess);

      // Act
      await reactionService.createReaction({
        mainVideoPath: '/tmp/main.mp4',
        reactionVideoPath: '/tmp/reaction.mp4',
        position: 'top-left',
        scale: 0.3,
        margin: 10,
      });

      // Assert
      expect(mockSpawn).toHaveBeenCalled();
    });

    it('should handle FFmpeg failure', async () => {
      // Arrange
      const mockProcess = createMockProcess(1);
      mockSpawn.mockReturnValue(mockProcess);

      // Act & Assert
      await expect(
        reactionService.createReaction({
          mainVideoPath: '/tmp/main.mp4',
          reactionVideoPath: '/tmp/reaction.mp4',
          position: 'bottom-right',
          scale: 0.25,
          margin: 20,
        })
      ).rejects.toThrow('FFmpeg failed');
    });
  });

  // ============================================================================
  // createSideBySide
  // ============================================================================
  describe('createSideBySide', () => {
    it('should create horizontal side-by-side video', async () => {
      // Arrange
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess);

      // Act
      const result = await reactionService.createSideBySide({
        leftVideoPath: '/tmp/left.mp4',
        rightVideoPath: '/tmp/right.mp4',
        layout: 'horizontal',
      });

      // Assert
      expect(result).toContain('.mp4');
      expect(mockSpawn).toHaveBeenCalledWith(
        'ffmpeg',
        expect.arrayContaining(['-filter_complex', expect.stringContaining('hstack')])
      );
    });

    it('should create vertical stacked video', async () => {
      // Arrange
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess);

      // Act
      await reactionService.createSideBySide({
        leftVideoPath: '/tmp/top.mp4',
        rightVideoPath: '/tmp/bottom.mp4',
        layout: 'vertical',
      });

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'ffmpeg',
        expect.arrayContaining(['-filter_complex', expect.stringContaining('vstack')])
      );
    });
  });

  // ============================================================================
  // createReactionMixedAudio
  // ============================================================================
  describe('createReactionMixedAudio', () => {
    it('should create reaction with mixed audio', async () => {
      // Arrange
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess);

      // Act
      const result = await reactionService.createReactionMixedAudio({
        mainVideoPath: '/tmp/main.mp4',
        reactionVideoPath: '/tmp/reaction.mp4',
        position: 'bottom-right',
        scale: 0.25,
        margin: 20,
        reactionVolume: 0.5,
      });

      // Assert
      expect(result).toContain('.mp4');
      expect(mockSpawn).toHaveBeenCalledWith(
        'ffmpeg',
        expect.arrayContaining(['-filter_complex', expect.stringContaining('amix')])
      );
    });
  });
});
