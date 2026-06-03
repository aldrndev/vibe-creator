/**
 * Stream Process Manager
 * Manages active FFmpeg streaming processes
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface StreamProcessExit {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly errorMessage?: string;
}

type StreamProcessExitHandler = (exit: StreamProcessExit) => Promise<void>;

const STREAM_STOP_GRACE_MS = 5000;

// Store active streams by streamId
const activeStreams = new Map<string, ChildProcess>();

// Store active streams by userId for concurrency control
const activeUserStreams = new Map<string, { process: ChildProcess; streamId: string }>();
const activeExitHandlers = new Map<string, StreamProcessExitHandler>();
const forceKillTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
 * Request graceful termination for a user's existing runtime stream.
 */
export function requestUserStreamStop(userId: string): string | null {
  const existing = activeUserStreams.get(userId);
  if (!existing) return null;

  requestStreamProcessStop(existing.streamId, userId);
  return existing.streamId;
}

/**
 * Start FFmpeg streaming process
 */
export function startStreamProcess(
  streamId: string,
  userId: string,
  args: string[],
  onExit: StreamProcessExitHandler,
): ChildProcess {
  const process = spawn('ffmpeg', args);

  // Store process references
  activeStreams.set(streamId, process);
  activeUserStreams.set(userId, { process, streamId });
  activeExitHandlers.set(streamId, onExit);

  // Handle stderr (logging)
  process.stderr.on('data', (data) => {
    const logStr = data.toString();
    if (logStr.toLowerCase().includes('error') || logStr.toLowerCase().includes('fail')) {
      logger.debug({ streamId, data: logStr }, 'ffmpeg stream stderr');
    }
  });

  // Handle process close
  process.on('close', async (code) => {
    const timer = forceKillTimers.get(streamId);
    if (timer) {
      clearTimeout(timer);
      forceKillTimers.delete(streamId);
    }
    activeStreams.delete(streamId);
    if (activeUserStreams.get(userId)?.streamId === streamId) {
      activeUserStreams.delete(userId);
    }
    const exitHandler = activeExitHandlers.get(streamId);
    activeExitHandlers.delete(streamId);

    if (exitHandler) {
      await exitHandler({ code, signal: null }).catch((error: Error) =>
        logger.error({ streamId, error: error.message }, 'Stream exit handler failed'),
      );
    }

    logger.info({ streamId, code }, 'Stream ended');
  });

  // Handle process error
  process.on('error', async (err) => {
    activeStreams.delete(streamId);
    if (activeUserStreams.get(userId)?.streamId === streamId) {
      activeUserStreams.delete(userId);
    }
    const exitHandler = activeExitHandlers.get(streamId);
    activeExitHandlers.delete(streamId);

    if (exitHandler) {
      await exitHandler({ code: null, signal: null, errorMessage: err.message }).catch(
        (error: Error) =>
          logger.error({ streamId, error: error.message }, 'Stream error handler failed'),
      );
    }

    logger.error({ streamId, error: err.message }, 'Stream error');
  });

  return process;
}

/**
 * Stop stream process
 */
export function requestStreamProcessStop(streamId: string, userId: string): boolean {
  const process = activeStreams.get(streamId);
  if (!process) {
    if (activeUserStreams.get(userId)?.streamId === streamId) {
      activeUserStreams.delete(userId);
    }
    return false;
  }

  process.kill('SIGTERM');

  const existingTimer = forceKillTimers.get(streamId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    const activeProcess = activeStreams.get(streamId);
    if (activeProcess) {
      logger.warn({ streamId }, 'Force killing stream process after grace period');
      activeProcess.kill('SIGKILL');
    }
  }, STREAM_STOP_GRACE_MS);

  forceKillTimers.set(streamId, timer);
  return true;
}

/**
 * Mark stream as LIVE after startup delay
 */
export function scheduleStreamLive(streamId: string, delayMs = 3000): void {
  setTimeout(async () => {
    if (activeStreams.has(streamId)) {
      await prisma.streamSession.updateMany({
        where: {
          id: streamId,
          status: 'STARTING',
          durationMinutesBilled: null,
        },
        data: { status: 'LIVE' },
      });
    }
  }, delayMs);
}
