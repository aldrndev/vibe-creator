import crypto from 'node:crypto';
import { redis } from '@/lib/redis';

// Allow a 5-minute clock skew for webhook delivery.
const WEBHOOK_TOLERANCE_SECONDS = 300;
// Keep replay cache for 10 minutes to cover delayed deliveries.
const WEBHOOK_REPLAY_TTL_SECONDS = 600;

interface VerifyWebhookParams {
  secret: string;
  signature: string;
  timestamp: string;
  payload: string;
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function isTimestampFresh(timestamp: string): boolean {
  const numeric = Number.parseInt(timestamp, 10);
  if (Number.isNaN(numeric)) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const delta = Math.abs(nowSeconds - numeric);
  return delta <= WEBHOOK_TOLERANCE_SECONDS;
}

function buildSignature(secret: string, timestamp: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
}

async function ensureNotReplayed(signature: string, timestamp: string): Promise<void> {
  if (redis.status !== 'ready') {
    throw new Error('Replay protection unavailable');
  }

  const replayKey = crypto.createHash('sha256').update(`${signature}:${timestamp}`).digest('hex');

  const result = await redis.set(
    `webhook:replay:${replayKey}`,
    '1',
    'EX',
    WEBHOOK_REPLAY_TTL_SECONDS,
    'NX',
  );

  if (result !== 'OK') {
    throw new Error('Replay detected');
  }
}

/**
 * Verify webhook signature, timestamp, and replay protection.
 */
export async function assertValidWebhook(params: VerifyWebhookParams): Promise<void> {
  if (!isTimestampFresh(params.timestamp)) {
    throw new Error('Webhook timestamp out of bounds');
  }

  const expected = buildSignature(params.secret, params.timestamp, params.payload);

  if (!safeEqual(expected, params.signature)) {
    throw new Error('Invalid webhook signature');
  }

  await ensureNotReplayed(params.signature, params.timestamp);
}
