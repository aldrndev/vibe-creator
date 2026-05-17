import Redis from 'ioredis';
import { z } from 'zod';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { redisOptions } from '@/lib/redis';

const EXPORT_EVENT_HEARTBEAT_MS = 15_000;

const exportEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('snapshot'),
    jobId: z.string(),
    status: z.string(),
    progress: z.number(),
    phase: z.string(),
  }),
  z.object({
    type: z.literal('progress'),
    jobId: z.string(),
    status: z.string(),
    progress: z.number(),
    phase: z.string(),
    message: z.string(),
  }),
  z.object({
    type: z.literal('completed'),
    jobId: z.string(),
    progress: z.literal(100),
    downloadUrl: z.string(),
    filename: z.string(),
    completedAt: z.string(),
    urlExpiresAt: z.string(),
  }),
  z.object({
    type: z.literal('failed'),
    jobId: z.string(),
    errorMessage: z.string(),
  }),
  z.object({
    type: z.literal('expired'),
    jobId: z.string(),
    errorMessage: z.string(),
  }),
]);

export type ExportEvent = z.infer<typeof exportEventSchema>;

type ExportEventHandler = (event: ExportEvent) => void;

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

function getExportJobChannel(jobId: string): string {
  return `export:job:${jobId}`;
}

/**
 * Publish a realtime export event to Redis Pub/Sub.
 */
export async function publishExportEvent(event: ExportEvent): Promise<void> {
  try {
    await getPublisher().publish(getExportJobChannel(event.jobId), JSON.stringify(event));
  } catch (err) {
    logger.warn(
      { err, jobId: event.jobId, eventType: event.type },
      'Failed to publish export event',
    );
  }
}

/**
 * Subscribe to events for a single export job. Returns a cleanup function.
 */
export async function subscribeToExportEvents(
  jobId: string,
  handler: ExportEventHandler,
): Promise<() => Promise<void>> {
  const subscriber = new Redis(env.REDIS_URL, {
    ...redisOptions,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
  const channel = getExportJobChannel(jobId);

  subscriber.on('message', (_channel, payload) => {
    const parsed = parseExportEvent(payload);
    if (!parsed || parsed.jobId !== jobId) {
      return;
    }

    handler(parsed);
  });

  await subscriber.subscribe(channel);

  return async () => {
    try {
      await subscriber.unsubscribe(channel);
      subscriber.disconnect();
    } catch (err) {
      logger.debug({ err, jobId }, 'Failed to close export event subscriber cleanly');
    }
  };
}

/**
 * Format Server-Sent Events in a browser-compatible payload.
 */
export function formatSseEvent(event: ExportEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Format a lightweight SSE heartbeat comment.
 */
export function formatSseHeartbeat(): string {
  return ': heartbeat\n\n';
}

/**
 * Heartbeat interval used by the export SSE endpoint.
 */
export function getExportEventHeartbeatMs(): number {
  return EXPORT_EVENT_HEARTBEAT_MS;
}

function parseExportEvent(payload: string): ExportEvent | null {
  try {
    return exportEventSchema.parse(JSON.parse(payload));
  } catch (err) {
    logger.debug({ err }, 'Ignored invalid export event payload');
    return null;
  }
}
