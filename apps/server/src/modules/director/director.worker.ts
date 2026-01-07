import { Worker, Job } from "bullmq";
import { join } from "path";
import { unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { env } from "@/config/env";
import {
  DIRECTOR_QUEUE_NAME,
  DirectorAnalysisJobData,
  DirectorJobData,
  DirectorTranscribeSessionJobData,
  DirectorTranscribeClipJobData,
  DirectorExportJobData,
  directorQueue,
} from "./director.queue";
import { directorProcessor } from "./director.processor";
import { transcribeService } from "../transcribe/transcribe.service";

const TEMP_DIR = join(env.MEDIA_INPUT_DIR, "temp");

/**
 * Process Analysis Job
 */
async function processAnalysisJob(job: Job<DirectorAnalysisJobData>) {
  const { sessionId, assetId, filePath } = job.data;
  const logCtx = { jobId: job.id, sessionId, assetId };

  logger.info(logCtx, "Starting analysis job");

  // 1. Validation & Idempotency Check
  const session = await prisma.directorSession.findUnique({
    where: { id: sessionId },
    include: { analysisJob: true },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Check if already completed
  const existingJob = session.analysisJob?.status === "COMPLETED";
  if (existingJob) {
    logger.info(logCtx, "Analysis already completed for session");
    return;
  }

  // 2. Mark DB Job as PROCESSING
  const dbJob = session.analysisJob;

  if (dbJob) {
    await prisma.directorAnalysisJob.update({
      where: { id: dbJob.id },
      data: { status: "PROCESSING" },
    });
  } else {
    logger.warn(logCtx, "No analysis job record found in session");
  }

  let audioProxyPath: string | null = null;

  try {
    // 3. Extract Audio Proxy
    if (!existsSync(filePath)) {
      throw new Error(`Asset file missing at path: ${filePath}`);
    }

    // Create temp dir if missing
    // (In a real app, should use ensureDir - assuming uploads/temp exists or handled by startup)

    // Ensure preview dir
    const previewDir = join(env.MEDIA_INPUT_DIR, "director", "previews");
    if (!existsSync(previewDir)) {
      await mkdir(previewDir, { recursive: true });
    }

    audioProxyPath = await directorProcessor.extractAudioProxy(
      filePath,
      TEMP_DIR
    );

    // 4. Detect Segments
    const segments = await directorProcessor.detectSegments(audioProxyPath);

    // 5. Post-Process (Async with Energy Analysis)
    const candidates = await directorProcessor.refineSegments(
      segments,
      audioProxyPath,
      {},
      filePath
    );

    logger.info(
      { ...logCtx, candidatesCount: candidates.length },
      "Analysis complete"
    );

    // 6. DB Updates (Transaction)
    await prisma.$transaction(async (tx) => {
      // Update Job
      if (dbJob) {
        await tx.directorAnalysisJob.update({
          where: { id: dbJob.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      }

      // Create Candidates
      if (candidates.length > 0 && dbJob) {
        // Generate previews concurrently
        const candidatesWithPreviews = await Promise.all(
          candidates.map(async (c, i) => {
            const midPointMs = ((c.start + c.end) / 2) * 1000;
            let previewKey: string | null = null;

            try {
              // Generate thumbnail preview
              const previewFile = await directorProcessor.generateClipPreview(
                filePath,
                join(env.MEDIA_INPUT_DIR, "director", "previews"),
                midPointMs
              );

              if (previewFile) {
                previewKey = `director/previews/${previewFile}`;
              }
            } catch (err) {
              logger.warn(
                { err, candidateIndex: i },
                "Failed to generate thumbnail preview"
              );
            }

            return {
              analysisJobId: dbJob!.id,
              startMs: Math.round(c.start * 1000),
              endMs: Math.round(c.end * 1000),
              score: c.score,
              rank: i + 1,
              tags: c.tags && c.tags.length > 0 ? c.tags : ["highlight"],
              previewStorageKey: previewKey,
            };
          })
        );

        await tx.directorClipCandidate.createMany({
          data: candidatesWithPreviews,
        });
      }

      // Advance Session
      await tx.directorSession.update({
        where: { id: sessionId },
        data: { step: "PICKING" },
      });
    });
  } catch (err) {
    logger.error({ ...logCtx, err }, "Analysis job failed");

    // Mark DB Job as FAILED
    if (dbJob) {
      await prisma.directorAnalysisJob.update({
        where: { id: dbJob.id },
        data: {
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        },
      });
    }
    throw err;
  } finally {
    // 7. Cleanup Proxy
    if (audioProxyPath && existsSync(audioProxyPath)) {
      try {
        await unlink(audioProxyPath);
        logger.debug(logCtx, "Cleaned up audio proxy");
      } catch (cleanupErr) {
        logger.error({ ...logCtx, cleanupErr }, "Failed to cleanup proxy");
      }
    }
  }
}

/**
 * Process Transcribe Session Job
 * Triggers clip transcription jobs
 */
async function processTranscribeSessionJob(
  job: Job<DirectorTranscribeSessionJobData>
) {
  const { sessionId } = job.data;
  logger.info({ sessionId }, "Processing transcribe session job");

  const session = await prisma.directorSession.findUnique({
    where: { id: sessionId },
    include: { selectedClips: true, transcribeJob: true },
  });

  if (!session || !session.transcribeJob) {
    throw new Error("Session or transcribe job not found");
  }

  // Update status to PROCESSING
  await prisma.directorTranscribeJob.update({
    where: { id: session.transcribeJob.id },
    data: { status: "PROCESSING" },
  });

  // Queue jobs for each clip
  const clipJobs = session.selectedClips.map((clip) => ({
    name: "transcribe_clip",
    data: {
      type: "TRANSCRIBE_CLIP" as const,
      sessionId,
      selectedClipId: clip.id,
      userId: job.data.userId,
    },
    opts: {
      removeOnComplete: true,
      jobId: `director:transcribe:clip:${clip.id}`,
    },
  }));

  // Add all clip jobs to Queue
  await directorQueue.addBulk(clipJobs);

  logger.info(
    { sessionId, count: clipJobs.length },
    "Queued clip transcription jobs"
  );
}

/**
 * Process Transcribe Clip Job
 */
async function processTranscribeClipJob(
  job: Job<DirectorTranscribeClipJobData>
) {
  const { selectedClipId } = job.data;
  logger.info({ selectedClipId }, "Processing transcribe clip job");

  await transcribeService.transcribeSelectedClip(selectedClipId);

  // Check if all clips for this session are done
  const clip = await prisma.directorSelectedClip.findUnique({
    where: { id: selectedClipId },
    select: { sessionId: true },
  });

  if (clip) {
    const { sessionId } = clip;
    const totalClips = await prisma.directorSelectedClip.count({
      where: { sessionId },
    });
    const completedTranscripts = await prisma.directorClipTranscript.count({
      where: {
        sessionId,
        status: { in: ["COMPLETED", "FAILED"] },
      },
    });

    if (completedTranscripts >= totalClips) {
      const session = await prisma.directorSession.findUnique({
        where: { id: sessionId },
        include: { transcribeJob: true },
      });

      if (session?.transcribeJob) {
        await prisma.directorTranscribeJob.update({
          where: { id: session.transcribeJob.id },
          data: { status: "COMPLETED" },
        });
        logger.info(
          { sessionId },
          "All clips transcribed - marked job COMPLETED"
        );
      }
    }
  }
}

/**
 * Process Export Job
 */
async function processExportJob(job: Job<DirectorExportJobData>) {
  const { sessionId, options } = job.data;
  const logCtx = { jobId: job.id, sessionId, type: "EXPORT" };
  logger.info(logCtx, "Processing export job");

  await job.updateProgress(10);

  // Get Prisma record to update
  const session = await prisma.directorSession.findUnique({
    where: { id: sessionId },
    include: {
      selectedClips: {
        include: {
          candidate: true,
          transcript: true,
        } as any,
        orderBy: { orderIndex: "asc" },
      },
      exportJob: true,
    },
  });

  if (!session || !session.exportJob) {
    throw new Error("Session or export job not found");
  }

  const exportJobId = session.exportJob.id;

  try {
    // 1. Mark PROCESSING
    await prisma.directorExportJob.update({
      where: { id: exportJobId },
      data: { status: "PROCESSING" },
    });

    // Fetch assets to get file paths
    const asset = await prisma.directorAsset.findUnique({
      where: { sessionId },
    });

    if (!asset) {
      throw new Error("Session asset not found");
    }

    const fileName = asset.storageKey.split("/").pop()!;
    const sourcePath = join(env.MEDIA_INPUT_DIR, "director", fileName);

    if (!existsSync(sourcePath)) {
      throw new Error(`Asset file missing: ${sourcePath}`);
    }

    const clipsToExport = [];
    const startExportClips = (session as any).selectedClips;

    for (const clip of startExportClips) {
      // Determine actual start/end based on candidate + trim settings
      // If user didn't trim, trimStartMs/trimEndMs are 0
      const startMs = clip.candidate.startMs + (clip.trimStartMs || 0);
      const endMs = clip.candidate.endMs - (clip.trimEndMs || 0);

      clipsToExport.push({
        sourcePath,
        start: startMs / 1000,
        end: endMs / 1000,
        transcript: clip.transcript,
      });
    }

    await job.updateProgress(30);

    const outputDir = join(env.MEDIA_INPUT_DIR, "director", "exports");
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Run Export Processor
    const finalFile = await directorProcessor.exportVideo(
      clipsToExport,
      outputDir,
      options
    );

    await job.updateProgress(100);

    // 2. Mark COMPLETED
    const outputStorageKey = `director/exports/${finalFile}`;
    await prisma.directorExportJob.update({
      where: { id: exportJobId },
      data: {
        status: "COMPLETED",
        outputStorageKey,
      },
    });

    logger.info({ ...logCtx, finalFile }, "Export job completed");
    return { output: finalFile };
  } catch (err) {
    logger.error({ ...logCtx, err }, "Export job failed");

    // 3. Mark FAILED
    await prisma.directorExportJob.update({
      where: { id: exportJobId },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
    throw err;
  }
}

/**
 * Main Job Dispatcher
 */
async function jobProcessor(job: Job<DirectorJobData>) {
  switch (job.data.type) {
    case "ANALYSIS":
      return processAnalysisJob(job as Job<DirectorAnalysisJobData>);
    case "TRANSCRIBE_SESSION":
      return processTranscribeSessionJob(
        job as Job<DirectorTranscribeSessionJobData>
      );
    case "TRANSCRIBE_CLIP":
      return processTranscribeClipJob(
        job as Job<DirectorTranscribeClipJobData>
      );
    case "EXPORT":
      return processExportJob(job as Job<DirectorExportJobData>);
    default:
      // Fallback for legacy jobs if any (assuming all have type now)
      // Check job name as fallback
      if (job.name === "analyze") {
        return processAnalysisJob(job as Job<DirectorAnalysisJobData>);
      }
      throw new Error(`Unknown job type: ${(job.data as any).type}`);
  }
}

/**
 * Director Worker Instance
 * To be started by entrypoint
 */
export const directorWorker = new Worker<DirectorJobData>(
  DIRECTOR_QUEUE_NAME,
  jobProcessor,
  {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

directorWorker.on("completed", (job) => {
  logger.info(
    { jobId: job.id, type: job.data.type },
    "Job completed successfully"
  );
});

directorWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, type: job?.data.type, err }, "Job failed");
});
