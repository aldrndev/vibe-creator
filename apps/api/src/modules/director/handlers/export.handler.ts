/**
 * @module director/handlers/export
 * @description BullMQ job handler for AI Director video export.
 *
 * This handler:
 * - Collects selected clips with trim settings
 * - Concatenates clips using FFmpeg
 * - Optionally burns in subtitles from transcripts
 * - Generates final export file
 *
 * Job Type: EXPORT
 */

import { Job } from "bullmq";
import { join } from "path";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { env } from "@/config/env";
import { DirectorExportJobData } from "../director.queue";
import { directorProcessor } from "../director.processor";

/**
 * Processes a video export job for the AI Director.
 *
 * @param job - BullMQ job containing session and export options
 * @returns Object containing the output filename
 * @throws Error if session/asset not found or FFmpeg fails
 */

export async function processExportJob(job: Job<DirectorExportJobData>) {
  const { sessionId, options } = job.data;
  const logCtx = { jobId: job.id, sessionId, type: "EXPORT" };
  logger.info(logCtx, "Processing export job");

  await job.updateProgress(10);

  const session = await prisma.directorSession.findUnique({
    where: { id: sessionId },
    include: {
      selectedClips: {
        include: {
          candidate: true,
          transcript: true,
        },
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
    await prisma.directorExportJob.update({
      where: { id: exportJobId },
      data: { status: "PROCESSING" },
    });

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

    const clipsToExport: Array<{
      sourcePath: string;
      start: number;
      end: number;
      transcript?: {
        segments?: Array<{ startMs: number; endMs: number; text: string }>;
      };
    }> = [];
    const startExportClips = session.selectedClips;

    for (const clip of startExportClips) {
      const startMs = clip.candidate.startMs + (clip.trimStartMs || 0);
      const endMs = clip.candidate.endMs - (clip.trimEndMs || 0);

      const transcriptData = clip.transcript?.segments
        ? {
            segments: clip.transcript.segments as Array<{
              startMs: number;
              endMs: number;
              text: string;
            }>,
          }
        : undefined;

      clipsToExport.push({
        sourcePath,
        start: startMs / 1000,
        end: endMs / 1000,
        transcript: transcriptData,
      });
    }

    await job.updateProgress(30);

    const outputDir = join(env.MEDIA_INPUT_DIR, "director", "exports");
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const finalFile = await directorProcessor.exportVideo(
      clipsToExport,
      outputDir,
      options
    );

    await job.updateProgress(100);

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
