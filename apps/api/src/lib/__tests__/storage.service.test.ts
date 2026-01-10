/**
 * Storage Service Unit Tests
 * 
 * Note: StorageService is a singleton instantiated at import time,
 * so we can only test the public interface behavior.
 * 
 * ✅ Happy path
 * ❌ Negative/error cases
 * 🔄 Edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fs/promises before import
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined),
}));

// Stub env for local driver
vi.stubEnv('STORAGE_DRIVER', 'local');
vi.stubEnv('API_URL', 'http://localhost:3000');

// Import after mocks
import { storageService } from '../storage.service';
import { mkdir, writeFile } from 'fs/promises';

describe('storageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // uploadExport
  // ============================================================================
  describe('uploadExport', () => {
    it('should upload file and return key and url', async () => {
      // Arrange
      const buffer = Buffer.from('fake video content');

      // Act
      const result = await storageService.uploadExport(
        'user-123',
        'video.mp4',
        buffer,
        'video/mp4'
      );

      // Assert
      expect(result.key).toContain('exports/user-123/');
      expect(result.key).toContain('video.mp4');
      expect(result.url).toContain('http://localhost:3000/uploads/');
      expect(mkdir).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalled();
    });

    it('should use default content type', async () => {
      // Arrange
      const buffer = Buffer.from('content');

      // Act
      const result = await storageService.uploadExport('user-123', 'output.mp4', buffer);

      // Assert
      expect(result.url).toBeDefined();
      expect(result.key).toContain('output.mp4');
    });

    it('should include timestamp in key for organization', async () => {
      // Arrange
      const buffer = Buffer.from('content');

      // Act
      const result = await storageService.uploadExport('user-123', 'video.mp4', buffer);

      // Assert - Key should contain timestamp pattern (digits before filename)
      expect(result.key).toMatch(/exports\/user-123\/\d+-video\.mp4/);
    });
  });

  // ============================================================================
  // deleteFile
  // ============================================================================
  describe('deleteFile', () => {
    it('should not throw when deleting file', async () => {
      // Act & Assert - Should not throw
      await expect(storageService.deleteFile('exports/user-123/video.mp4')).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // getSignedUrl
  // ============================================================================
  describe('getSignedUrl', () => {
    it('should return public URL for local storage', async () => {
      // Act
      const result = await storageService.getSignedUrl('exports/user-123/video.mp4');

      // Assert
      expect(result).toBe('http://localhost:3000/uploads/exports/user-123/video.mp4');
    });

    it('should work with any key path', async () => {
      // Act
      const result = await storageService.getSignedUrl('downloads/file.mp4');

      // Assert
      expect(result).toContain('http://localhost:3000/uploads/downloads/file.mp4');
    });
  });
});
