import Redis from 'ioredis';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { redisOptions } from '@/lib/redis';
import { type LoopPreviewEvent, loopPreviewEventSchema } from './loop.schemas';

const PREVIEW_EVENT_HEARTBEAT_MS = 15_000;
type PreviewEventHandler = (event: LoopPreviewEvent) => void;

let publisher: Redis | null = null;

function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(env.REDIS_URL, {
      ...redisOptions,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }
  return publisher;
}

function channelForPreview(previewId: string): string {
  return `loop:preview:${previewId}`;
}

export async function publishLoopPreviewEvent(event: LoopPreviewEvent): Promise<void> {
  try {
    await getPublisher().publish(channelForPreview(event.previewId), JSON.stringify(event));
  } catch (error) {
    logger.warn({ error, previewId: event.previewId }, 'Failed to publish loop preview event');
  }
}

export async function subscribeToLoopPreviewEvents(
  previewId: string,
  handler: PreviewEventHandler,
): Promise<() => Promise<void>> {
  const subscriber = new Redis(env.REDIS_URL, {
    ...redisOptions,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
  subscriber.on('message', (_channel, payload) => {
    try {
      const parsed = loopPreviewEventSchema.safeParse(JSON.parse(payload));
      if (parsed.success && parsed.data.previewId === previewId) {
        handler(parsed.data);
      }
    } catch (error) {
      logger.debug({ error, previewId }, 'Ignored invalid loop preview event payload');
    }
  });
  await subscriber.subscribe(channelForPreview(previewId));
  return async () => {
    await subscriber.unsubscribe(channelForPreview(previewId)).catch(() => undefined);
    subscriber.disconnect();
  };
}

export function formatLoopPreviewSseEvent(event: LoopPreviewEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function getLoopPreviewHeartbeatMs(): number {
  return PREVIEW_EVENT_HEARTBEAT_MS;
}
