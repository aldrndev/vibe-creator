/**
 * @module director/handlers/analysis
 * @description BullMQ job handler for AI Director video analysis.
 *
 * This handler processes uploaded videos to:
 * - Extract audio proxy for analysis
 * - Detect highlight segments using energy/beat detection
 * - Generate thumbnail previews for each candidate clip
 * - Store results in database for user selection
 *
 * Job Type: ANALYSIS
 * Idempotent: Yes (checks for existing completion)
 */

import { Job } from "bullmq";
import { join } from "path";
import { unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { env } from "@/config/env";
import { DirectorAnalysisJobData } from "../director.queue";
import { directorProcessor } from "../director.processor";

const TEMP_DIR = join(env.MEDIA_INPUT_DIR, "temp");

/**
 * Processes a video analysis job for the AI Director.
 *
 * @param job - BullMQ job containing session and asset information
 * @throws Error if session not found or FFmpeg processing fails
 *
 * @example
 * ```ts
 * // Enqueued by director.service
 * await directorQueue.add('analyze', {
 *   type: 'ANALYSIS',
 *   sessionId: 'xxx',
 *   assetId: 'yyy',
 *   filePath: '/path/to/video.mp4'
 * });
 * ```
 */

export async function processAnalysisJob(job: Job<DirectorAnalysisJobData>) {
  const { sessionId, assetId, filePath } = job.data;
  const logCtx = { jobId: job.id, sessionId, assetId };

  logger.info(logCtx, "Starting analysis job");

  const session = await prisma.directorSession.findUnique({
    where: { id: sessionId },
    include: { analysisJob: true },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const existingJob = session.analysisJob?.status === "COMPLETED";
  if (existingJob) {
    logger.info(logCtx, "Analysis already completed for session");
    return;
  }

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
    if (!existsSync(filePath)) {
      throw new Error(`Asset file missing at path: ${filePath}`);
    }

    const previewDir = join(env.MEDIA_INPUT_DIR, "director", "previews");
    if (!existsSync(previewDir)) {
      await mkdir(previewDir, { recursive: true });
    }

    audioProxyPath = await directorProcessor.extractAudioProxy(
      filePath,
      TEMP_DIR
    );

    const segments = await directorProcessor.detectSegments(audioProxyPath);

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

    await prisma.$transaction(async (tx) => {
      if (dbJob) {
        await tx.directorAnalysisJob.update({
          where: { id: dbJob.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      }

      if (candidates.length > 0 && dbJob) {
        const candidatesWithPreviews = await Promise.all(
          candidates.map(async (c, i) => {
            const midPointMs = ((c.start + c.end) / 2) * 1000;
            let previewKey: string | null = null;

            try {
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

      await tx.directorSession.update({
        where: { id: sessionId },
        data: { step: "PICKING" },
      });
    });
  } catch (err) {
    logger.error({ ...logCtx, err }, "Analysis job failed");

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
