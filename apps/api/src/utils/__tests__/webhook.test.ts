import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted to ensure mock is defined before vi.mock factory executes
const { redisMock } = vi.hoisted(() => ({
  redisMock: {
    status: 'ready',
    set: vi.fn(),
  },
}));

vi.mock('@/lib/redis', () => ({
  redis: redisMock,
}));

import { assertValidWebhook } from '@/utils/webhook';

describe('assertValidWebhook', () => {
  const secret = 'secret-key';
  const payload = '{"id":"evt_1"}';

  beforeEach(() => {
    redisMock.status = 'ready';
    redisMock.set.mockReset().mockResolvedValue('OK');
  });

  it('should reject stale timestamps', async () => {
    const timestamp = '100';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    await expect(assertValidWebhook({ secret, signature, timestamp, payload })).rejects.toThrow();
  });

  it('should reject invalid signatures', async () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = 'invalid';

    await expect(assertValidWebhook({ secret, signature, timestamp, payload })).rejects.toThrow(
      'Invalid webhook signature',
    );
  });

  it('should reject replayed payloads', async () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    redisMock.set.mockResolvedValue(null);

    await expect(assertValidWebhook({ secret, signature, timestamp, payload })).rejects.toThrow(
      'Replay detected',
    );
  });

  it('should accept valid signatures and fresh timestamps', async () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    await expect(
      assertValidWebhook({ secret, signature, timestamp, payload }),
    ).resolves.toBeUndefined();
  });
});
