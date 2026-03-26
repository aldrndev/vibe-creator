/**
 * FFmpeg Runner
 * Execute FFmpeg with process groups, cancellation, and cleanup
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { logger } from '@/lib/logger';
import { getFFmpegPath } from './ffmpeg-binary';
import { detectError, type FFmpegError } from './ffmpeg-errors';
import { createProgressParser, type ProgressUpdate } from './ffmpeg-progress';

export interface RunOptions {
  args: string[];
  tempDir: string;
  totalDurationMs: number;
  timeoutMs: number;
  signal?: AbortSignal;
  onProgress?: (update: ProgressUpdate) => void;
}

/**
 * Active process registry for cancellation
 */
const activeProcesses = new Map<string, ChildProcess>();

/**
 * Run FFmpeg command
 */
export async function runFFmpeg(options: RunOptions): Promise<void> {
  const { args, tempDir: _tempDir, totalDurationMs, timeoutMs, signal, onProgress } = options;

  const ffmpegPath = getFFmpegPath();
  const processId = `ffmpeg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  logger.info({ processId, args: args.join(' ') }, 'Starting FFmpeg process');

  return new Promise((resolve, reject) => {
    // Spawn with process group (detached for kill group)
    const process = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });

    // Register process
    activeProcesses.set(processId, process);

    // Setup timeout
    let timeoutHandle: NodeJS.Timeout | null = null;
    if (timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        logger.warn({ processId, timeoutMs }, 'FFmpeg process timed out');
        killProcess(process, processId, 'timeout');
      }, timeoutMs);
    }

    // Setup abort signal handler
    const abortHandler = () => {
      logger.info({ processId }, 'FFmpeg process cancelled via AbortSignal');
      killProcess(process, processId, 'cancelled');
    };

    if (signal) {
      signal.addEventListener('abort', abortHandler);
    }

    // Progress parser
    const parser = createProgressParser(totalDurationMs);
    const stderrChunks: string[] = [];

    // Handle stdout (progress)
    process.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      const updates = parser.parse(text);

      updates.forEach((update) => {
        onProgress?.(update);
      });
    });

    // Handle stderr (errors)
    process.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderrChunks.push(text);

      // Log only warnings/errors (not all stderr output)
      if (text.toLowerCase().includes('error') || text.toLowerCase().includes('warning')) {
        logger.warn({ processId, stderr: text.slice(0, 200) }, 'FFmpeg stderr');
      }
    });

    // Handle exit
    process.on('exit', (code, signalName) => {
      // Cleanup
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (signal) signal.removeEventListener('abort', abortHandler);
      activeProcesses.delete(processId);

      const stderr = stderrChunks.join('');
      const error = detectError(code, signalName, stderr);

      logger.info(
        { processId, code, signal: signalName, errorCode: error.code },
        'FFmpeg process exited',
      );

      // Success
      if (code === 0) {
        resolve();
        return;
      }

      // Failure
      const errorWithContext: FFmpegError & { processId: string } = {
        ...error,
        processId,
      };

      reject(errorWithContext);
    });

    // Handle spawn errors
    process.on('error', (err) => {
      logger.error({ processId, error: err }, 'FFmpeg spawn error');
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (signal) signal.removeEventListener('abort', abortHandler);
      activeProcesses.delete(processId);
      reject(err);
    });
  });
}

/**
 * Kill FFmpeg process gracefully
 * Two-stage: SIGTERM → wait 2s → SIGKILL
 * Kills process GROUP (not just pid) to avoid orphans
 */
function killProcess(process: ChildProcess, processId: string, reason: string): void {
  if (!process.pid) return;

  const pid = process.pid;

  try {
    // Try SIGTERM first (graceful) - kill process group with negative PID
    try {
      global.process.kill(-pid, 'SIGTERM');
    } catch {
      // Fallback to killing just the process if group kill fails
      process.kill('SIGTERM');
    }
    logger.info({ processId, pid, reason }, 'Sent SIGTERM to FFmpeg process group');

    // Wait 2s then force kill
    setTimeout(() => {
      try {
        // Kill process group (negative PID) with SIGKILL
        try {
          global.process.kill(-pid, 'SIGKILL');
        } catch {
          process.kill('SIGKILL');
        }
        logger.warn({ processId, pid, reason }, 'Sent SIGKILL to FFmpeg process group');
      } catch {
        // Process already exited
      }
    }, 2000);
  } catch (error) {
    logger.error({ processId, pid, error }, 'Failed to kill FFmpeg process');
  }
}

/**
 * Cancel FFmpeg process by ID
 * Idempotent - safe to call multiple times
 */
export async function cancelFFmpeg(processId: string): Promise<void> {
  const process = activeProcesses.get(processId);

  if (!process) {
    logger.debug({ processId }, 'Process not found (already completed or invalid ID)');
    return;
  }

  killProcess(process, processId, 'user-cancel');
  activeProcesses.delete(processId);
}

/**
 * Cleanup temp directory
 * Safe to call even if dir doesn't exist
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await rm(tempDir, { recursive: true, force: true });
    logger.info({ tempDir }, 'Cleaned up temp directory');
  } catch (error) {
    logger.warn({ tempDir, error }, 'Failed to cleanup temp directory');
  }
}

/**
 * Get count of active FFmpeg processes
 */
export function getActiveProcessCount(): number {
  return activeProcesses.size;
}
