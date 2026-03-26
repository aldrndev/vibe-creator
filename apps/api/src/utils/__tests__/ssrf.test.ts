import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(),
}));

import { lookup } from 'node:dns/promises';
import { assertSafeUrl } from '@/utils/ssrf';

describe('assertSafeUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should block localhost and private IPs', async () => {
    await expect(assertSafeUrl('http://127.0.0.1')).rejects.toThrow('Unsafe URL');
    await expect(assertSafeUrl('http://localhost')).rejects.toThrow('Unsafe URL');
  });

  it('should allow public hostnames', async () => {
    (lookup as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ]);

    await expect(assertSafeUrl('https://example.com/video.mp4')).resolves.toBeUndefined();
  });

  it('should block DNS rebinding to private IP', async () => {
    (lookup as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { address: '10.0.0.5', family: 4 },
    ]);

    await expect(assertSafeUrl('https://evil.test')).rejects.toThrow('Unsafe URL');
  });
});
