/**
 * Stream Process Manager
 * Manages active FFmpeg streaming processes
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// Store active streams by streamId
const activeStreams = new Map<string, ChildProcess>();

// Store active streams by userId for concurrency control
const activeUserStreams = new Map<string, { process: ChildProcess; streamId: string }>();

/**
 * Check if user has active stream
 */
export function hasActiveStream(userId: string): boolean {
  return activeUserStreams.has(userId);
}

/**
 * Get user's active stream info
 */
export function getUserStream(userId: string) {
  return activeUserStreams.get(userId);
}

/**
 * Check if stream is active by ID
 */
export function isStreamActive(streamId: string): boolean {
  return activeStreams.has(streamId);
}

/**
 * Kill user's existing stream
 */
export async function killUserStream(userId: string): Promise<void> {
  const existing = activeUserStreams.get(userId);
  if (!existing) return;

  existing.process.kill('SIGTERM');
  activeUserStreams.delete(userId);
  activeStreams.delete(existing.streamId);

  await prisma.streamSession
    .update({
      where: { id: existing.streamId },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
        errorMessage: 'Interrupted by new session',
      },
    })
    .catch((err: Error) => logger.warn({ err }, 'Failed to update interrupted stream status'));

  // Small delay to release resources
  await new Promise((r) => setTimeout(r, 1000));
}

/**
 * Start FFmpeg streaming process
 */
export function startStreamProcess(streamId: string, userId: string, args: string[]): ChildProcess {
  const process = spawn('ffmpeg', args);

  // Store process references
  activeStreams.set(streamId, process);
  activeUserStreams.set(userId, { process, streamId });

  // Handle stderr (logging)
  process.stderr.on('data', (data) => {
    const logStr = data.toString();
    if (logStr.toLowerCase().includes('error') || logStr.toLowerCase().includes('fail')) {
      logger.debug({ streamId, data: logStr }, 'ffmpeg stream stderr');
    }
  });

  // Handle process close
  process.on('close', async (code) => {
    activeStreams.delete(streamId);
    activeUserStreams.delete(userId);

    await prisma.streamSession.update({
      where: { id: streamId },
      data: {
        status: code === 0 ? 'ENDED' : 'FAILED',
        endedAt: new Date(),
      },
    });

    logger.info({ streamId, code }, 'Stream ended');
  });

  // Handle process error
  process.on('error', async (err) => {
    activeStreams.delete(streamId);
    activeUserStreams.delete(userId);

    await prisma.streamSession.update({
      where: { id: streamId },
      data: {
        status: 'FAILED',
        endedAt: new Date(),
        errorMessage: err.message,
      },
    });

    logger.error({ streamId, error: err.message }, 'Stream error');
  });

  return process;
}

/**
 * Stop stream process
 */
export function stopStreamProcess(streamId: string, userId: string): void {
  const process = activeStreams.get(streamId);
  if (process) {
    process.kill('SIGTERM');
    activeStreams.delete(streamId);
    activeUserStreams.delete(userId);
  }
}

/**
 * Mark stream as LIVE after startup delay
 */
export function scheduleStreamLive(streamId: string, delayMs = 3000): void {
  setTimeout(async () => {
    if (activeStreams.has(streamId)) {
      await prisma.streamSession.update({
        where: { id: streamId },
        data: { status: 'LIVE' },
      });
    }
  }, delayMs);
}
