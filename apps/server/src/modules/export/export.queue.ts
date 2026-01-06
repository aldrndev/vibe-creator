import { Queue, Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ffmpegProcessor } from "./ffmpeg.processor";
import {
  ExportJobData,
  ExportPhase,
  EXPORT_PHASES,
  getPhaseProgress,
} from "./export.types";
import { join } from "path";
import { mkdir, unlink, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { env } from "@/config/env";

const QUEUE_NAME = "export-jobs";
const EXPORTS_DIR = join(env.MEDIA_INPUT_DIR, "exports");
const TEMP_DIR = join(env.MEDIA_INPUT_DIR, "temp");

// Ensure directories exist
async function ensureDirectories() {
  if (!existsSync(EXPORTS_DIR)) {
    await mkdir(EXPORTS_DIR, { recursive: true });
  }
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

/**
 * Export job queue
 */
export const exportQueue = new Queue<ExportJobData>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // 5s, 25s, 125s
    },
    removeOnComplete: {
      age: 24 * 60 * 60, // 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // 7 days
    },
  },
});

/**
 * Update job phase in database
 */
async function updateJobPhase(
  jobId: string,
  phase: ExportPhase,
  phaseProgress: number = 0
) {
  const overallProgress = getPhaseProgress(phase, phaseProgress);

  await prisma.exportHistory.update({
    where: { id: jobId },
    data: {
      phase,
      phaseProgress,
      progress: overallProgress,
    },
  });

  logger.debug(
    { jobId, phase, phaseProgress, overallProgress },
    "Phase updated"
  );
}

/**
 * Process export job
 */
async function processExportJob(job: Job<ExportJobData>): Promise<void> {
  const { jobId, userId, settings, timeline } = job.data;

  logger.info(
    { jobId, userId, clipCount: timeline.clips.length },
    "Processing export job"
  );

  await ensureDirectories();

  // Check for cancellation before each phase
  const checkCancellation = async () => {
    const currentJob = await prisma.exportHistory.findUnique({
      where: { id: jobId },
      select: { phase: true },
    });
    if (
      currentJob?.phase === "CANCELLED" ||
      currentJob?.phase === "CANCEL_REQUESTED"
    ) {
      throw new Error("Job cancelled");
    }
  };

  const tempFiles: string[] = [];
  const outputId = randomUUID();

  try {
    // Phase: VALIDATING
    await updateJobPhase(jobId, EXPORT_PHASES.VALIDATING, 0);
    await checkCancellation();

    // Validate all assets exist
    for (const clip of timeline.clips) {
      if (!existsSync(clip.storageKey)) {
        throw new Error(`Asset not found: ${clip.assetId}`);
      }
    }
    await updateJobPhase(jobId, EXPORT_PHASES.VALIDATING, 100);

    // Phase: TRIM
    await updateJobPhase(jobId, EXPORT_PHASES.TRIM, 0);
    await checkCancellation();

    for (let i = 0; i < timeline.clips.length; i++) {
      const clip = timeline.clips[i];
      if (!clip) continue;

      const trimmedPath = join(TEMP_DIR, `${outputId}_trimmed_${i}.mp4`);

      // Calculate actual start/end times considering trim
      const startTime = clip.trimStartMs / 1000;
      const endTime = (clip.trimStartMs + (clip.endMs - clip.startMs)) / 1000;

      await ffmpegProcessor.trim({
        inputPath: clip.storageKey,
        outputPath: trimmedPath,
        startTime,
        endTime,
      });

      tempFiles.push(trimmedPath);

      const progress = Math.round(((i + 1) / timeline.clips.length) * 100);
      await updateJobPhase(jobId, EXPORT_PHASES.TRIM, progress);
    }

    // Phase: MIX_AUDIO
    await updateJobPhase(jobId, EXPORT_PHASES.MIX_AUDIO, 0);
    await checkCancellation();

    // TODO: Process audio clips and mix with video
    // For now, skip audio mixing
    await updateJobPhase(jobId, EXPORT_PHASES.MIX_AUDIO, 100);

    // Phase: ENCODE_VIDEO
    await updateJobPhase(jobId, EXPORT_PHASES.ENCODE_VIDEO, 0);
    await checkCancellation();

    let outputPath = join(TEMP_DIR, `${outputId}_concat.mp4`);

    if (tempFiles.length > 1) {
      await ffmpegProcessor.concat({
        inputPaths: tempFiles,
        outputPath,
      });
    } else if (tempFiles.length === 1 && tempFiles[0]) {
      outputPath = tempFiles[0];
    }

    await updateJobPhase(jobId, EXPORT_PHASES.ENCODE_VIDEO, 100);

    // Phase: MUX
    await updateJobPhase(jobId, EXPORT_PHASES.MUX, 0);
    await checkCancellation();

    let finalPath = join(EXPORTS_DIR, `${outputId}_final.mp4`);

    if (settings.addWatermark) {
      await ffmpegProcessor.addWatermark({
        inputPath: outputPath,
        outputPath: finalPath,
      });
    } else {
      await copyFile(outputPath, finalPath);
    }

    await updateJobPhase(jobId, EXPORT_PHASES.MUX, 100);

    // Phase: UPLOAD (for now, we store locally)
    await updateJobPhase(jobId, EXPORT_PHASES.UPLOAD, 0);
    // TODO: Upload to R2 and generate signed URL
    await updateJobPhase(jobId, EXPORT_PHASES.UPLOAD, 100);

    // Cleanup temp files
    for (const tempFile of tempFiles) {
      try {
        if (tempFile !== outputPath) {
          await unlink(tempFile);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    if (outputPath !== finalPath && outputPath !== tempFiles[0]) {
      try {
        await unlink(outputPath);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Mark as completed
    await prisma.exportHistory.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        phase: EXPORT_PHASES.COMPLETED,
        progress: 100,
        phaseProgress: 100,
        localPath: finalPath,
        completedAt: new Date(),
      },
    });

    logger.info({ jobId, outputPath: finalPath }, "Export completed");
  } catch (error) {
    // Cleanup temp files on error
    for (const tempFile of tempFiles) {
      try {
        await unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check if cancelled
    if (errorMessage === "Job cancelled") {
      logger.info({ jobId }, "Export job was cancelled");
      return;
    }

    logger.error({ jobId, error: errorMessage }, "Export job failed");

    await prisma.exportHistory.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        phase: EXPORT_PHASES.FAILED,
        errorMessage,
      },
    });

    throw error;
  }
}

/**
 * Export worker
 */
export const exportWorker = new Worker<ExportJobData>(
  QUEUE_NAME,
  processExportJob,
  {
    connection: redis,
    concurrency: 2, // Process 2 jobs at a time per worker
    limiter: {
      max: 10,
      duration: 60000, // Max 10 jobs per minute globally
    },
  }
);

// Worker event handlers
exportWorker.on("completed", (job) => {
  logger.info(
    { jobId: job.id, exportId: job.data.jobId },
    "Export job completed"
  );
});

exportWorker.on("failed", (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      exportId: job?.data.jobId,
      error: err.message,
      attempts: job?.attemptsMade,
    },
    "Export job failed"
  );
});

exportWorker.on("stalled", (jobId) => {
  logger.warn({ jobId }, "Export job stalled");
});

/**
 * Add export job to queue
 */
export async function addExportJob(data: ExportJobData): Promise<string> {
  const job = await exportQueue.add(`export-${data.jobId}`, data, {
    jobId: data.idempotencyKey, // Use idempotency key for deduplication
    priority: data.settings.addWatermark ? 10 : 5, // Paid users get higher priority
  });

  logger.info(
    {
      jobId: data.jobId,
      queueJobId: job.id,
      userId: data.userId,
    },
    "Export job added to queue"
  );

  return job.id ?? data.jobId;
}

/**
 * Get queue stats
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    exportQueue.getWaitingCount(),
    exportQueue.getActiveCount(),
    exportQueue.getCompletedCount(),
    exportQueue.getFailedCount(),
    exportQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Graceful shutdown
 */
export async function shutdownExportQueue() {
  await exportWorker.close();
  await exportQueue.close();
  logger.info("Export queue shut down gracefully");
}
