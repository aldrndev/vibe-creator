import { describe, expect, it } from 'vitest';
import { isTempUploadToken } from '@/utils/temp-upload';

describe('temp upload token validation', () => {
  it('accepts export media tokens for video, image, and audio assets', () => {
    expect(isTempUploadToken('550e8400-e29b-41d4-a716-446655440000.mp4')).toBe(true);
    expect(isTempUploadToken('550e8400-e29b-41d4-a716-446655440000.png')).toBe(true);
    expect(isTempUploadToken('550e8400-e29b-41d4-a716-446655440000.mp3')).toBe(true);
  });

  it('rejects paths, urls, and unsupported extensions', () => {
    expect(isTempUploadToken('../550e8400-e29b-41d4-a716-446655440000.mp4')).toBe(false);
    expect(isTempUploadToken('https://example.com/550e8400-e29b-41d4-a716-446655440000.mp4')).toBe(
      false,
    );
    expect(isTempUploadToken('550e8400-e29b-41d4-a716-446655440000.svg')).toBe(false);
  });
});
