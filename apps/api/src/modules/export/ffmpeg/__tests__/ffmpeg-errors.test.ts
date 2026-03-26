/**
 * FFmpeg Errors - Unit Tests
 * Tests for error detection and mapping
 */

import { describe, expect, it } from 'vitest';
import { detectError, FFmpegErrorCode, getUserMessage } from '../ffmpeg-errors';

describe('ffmpeg-errors', () => {
  describe('detectError', () => {
    it('should detect input not found', () => {
      const error = detectError(1, null, 'No such file or directory');
      expect(error.code).toBe(FFmpegErrorCode.INPUT_NOT_FOUND);
    });

    it('should detect unsupported codec', () => {
      const error = detectError(1, null, 'Unknown encoder libx999');
      expect(error.code).toBe(FFmpegErrorCode.UNSUPPORTED_CODEC);
    });

    it('should detect decode failure', () => {
      const error = detectError(1, null, 'Error while decoding stream');
      expect(error.code).toBe(FFmpegErrorCode.DECODE_FAILED);
    });

    it('should detect encode failure', () => {
      const error = detectError(1, null, 'Error while encoding');
      expect(error.code).toBe(FFmpegErrorCode.ENCODE_FAILED);
    });

    it('should detect out of memory', () => {
      const error = detectError(1, null, 'Cannot allocate memory');
      expect(error.code).toBe(FFmpegErrorCode.OUT_OF_MEMORY);
    });

    it('should detect cancellation via SIGTERM', () => {
      const error = detectError(null, 'SIGTERM', '');
      expect(error.code).toBe(FFmpegErrorCode.CANCELLED);
    });

    it('should detect cancellation via SIGKILL', () => {
      const error = detectError(null, 'SIGKILL', '');
      expect(error.code).toBe(FFmpegErrorCode.CANCELLED);
    });

    it('should return UNKNOWN for unrecognized errors', () => {
      const error = detectError(1, null, 'Some random error message');
      expect(error.code).toBe(FFmpegErrorCode.UNKNOWN);
    });

    it('should truncate stderr to details', () => {
      const longStderr = 'x'.repeat(500);
      const error = detectError(1, null, longStderr);

      if (error.details) {
        expect(error.details.length).toBeLessThanOrEqual(200);
      }
    });
  });

  describe('getUserMessage', () => {
    it('should return user-friendly message for INPUT_NOT_FOUND', () => {
      const message = getUserMessage({
        code: FFmpegErrorCode.INPUT_NOT_FOUND,
        message: 'No such file',
      });

      expect(message).toContain('input');
      expect(message).not.toContain('No such file'); // Should not expose internal
    });

    it('should return user-friendly message for TIMEOUT', () => {
      const message = getUserMessage({
        code: FFmpegErrorCode.TIMEOUT,
        message: 'Process timed out',
      });

      expect(message.toLowerCase()).toContain('timed out');
    });

    it('should return generic message for UNKNOWN', () => {
      const message = getUserMessage({
        code: FFmpegErrorCode.UNKNOWN,
        message: 'Internal error details',
      });

      expect(message).not.toContain('Internal error details');
      expect(message.toLowerCase()).toContain('unexpected');
    });

    it('should never expose internal paths or details', () => {
      const message = getUserMessage({
        code: FFmpegErrorCode.INPUT_NOT_FOUND,
        message: 'No such file',
        details: '/var/app/uploads/secret-path/video.mp4',
      });

      expect(message).not.toContain('/var/app');
      expect(message).not.toContain('secret-path');
    });
  });

  describe('FFmpegErrorCode enum', () => {
    it('should have all required error codes', () => {
      expect(FFmpegErrorCode.INPUT_NOT_FOUND).toBeDefined();
      expect(FFmpegErrorCode.UNSUPPORTED_CODEC).toBeDefined();
      expect(FFmpegErrorCode.DECODE_FAILED).toBeDefined();
      expect(FFmpegErrorCode.ENCODE_FAILED).toBeDefined();
      expect(FFmpegErrorCode.OUT_OF_MEMORY).toBeDefined();
      expect(FFmpegErrorCode.TIMEOUT).toBeDefined();
      expect(FFmpegErrorCode.CANCELLED).toBeDefined();
      expect(FFmpegErrorCode.UNKNOWN).toBeDefined();
    });
  });
});
