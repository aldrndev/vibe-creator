/**
 * @module export/processors/export
 * @description Video export processing engine using FFmpeg.
 *
 * This processor handles the complete export pipeline:
 * 1. Trim clips to specified in/out points
 * 2. Apply transforms (position, scale, rotation, opacity)
 * 3. Apply effects (speed, volume, fade in/out, filters)
 * 4. Concatenate multiple clips into single output
 * 5. Render text overlays using FFmpeg drawtext filter
 * 6. Add watermark for free-tier users
 *
 * Progress is reported via database updates (0-100%).
 * Temp files are cleaned up after processing.
 */

import { join } from "path";
import { unlink, mkdir, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { env } from "@/config/env";
import { ffmpegProcessor } from "../ffmpeg.processor";

/** Directory for temporary processing files */
const TEMP_DIR = join(env.MEDIA_INPUT_DIR, "temp");

/** Directory for final export outputs */
const EXPORTS_DIR = join(env.MEDIA_INPUT_DIR, "exports");

/**
 * Timeline data structure from the video editor.
 * Contains clips, text overlays, audio tracks, and output settings.
 */
interface TimelineData {
  /** Video clips with timing and optional transforms/effects */
  clips: Array<{
    localPath: string;
    startTime: number;
    endTime: number;
    transforms?: {
      x: number;
      y: number;
      scale: number;
      rotation: number;
      opacity: number;
    };
    effects?: {
      filters: string[];
      speed: number;
      volume: number;
      fadeIn: number;
      fadeOut: number;
    };
  }>;
  /** Text overlays with positioning and styling */
  textOverlays?: Array<{
    id: string;
    content: string;
    startMs: number;
    endMs: number;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
  }>;
  /** Additional audio tracks to mix */
  audioTracks?: Array<{
    localPath: string;
    startTime: number;
    endTime: number;
    volume: number;
  }>;
  /** Output video settings */
  settings: {
    width: number;
    height: number;
    fps: number;
  };
}

/**
 * Processes a video export job.
 *
 * @param jobId - Export history record ID
 * @param addWatermark - Whether to add watermark (for free tier)
 * @throws Error if job not found or FFmpeg processing fails
 *
 * @example
 * ```ts
 * await processExportJob('job-uuid', true);
 * ```
 */

export async function processExportJob(
  jobId: string,
  addWatermark: boolean
): Promise<void> {
  // Ensure directories
  if (!existsSync(EXPORTS_DIR)) {
    await mkdir(EXPORTS_DIR, { recursive: true });
  }
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }

  // Update status to processing
  await prisma.exportHistory.update({
    where: { id: jobId },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  try {
    const job = await prisma.exportHistory.findUnique({
      where: { id: jobId },
    });

    if (!job || !job.timelineData) {
      throw new Error("Job not found or missing timeline data");
    }

    const timelineData = job.timelineData as unknown as TimelineData;
    const tempFiles: string[] = [];
    const outputId = randomUUID();

    // Step 1: Trim and apply effects to each clip
    logger.info({ jobId }, "Starting clip trimming and effects");
    for (let i = 0; i < timelineData.clips.length; i++) {
      const clip = timelineData.clips[i];
      if (!clip) continue;

      const trimmedPath = join(TEMP_DIR, `${outputId}_trimmed_${i}.mp4`);
      await ffmpegProcessor.trim({
        inputPath: clip.localPath,
        outputPath: trimmedPath,
        startTime: clip.startTime,
        endTime: clip.endTime,
      });

      const hasTransforms =
        clip.transforms &&
        (clip.transforms.x !== 0 ||
          clip.transforms.y !== 0 ||
          clip.transforms.scale !== 1 ||
          clip.transforms.rotation !== 0 ||
          clip.transforms.opacity !== 1);
      const hasEffects =
        clip.effects &&
        (clip.effects.speed !== 1 ||
          clip.effects.volume !== 1 ||
          clip.effects.fadeIn > 0 ||
          clip.effects.fadeOut > 0 ||
          (clip.effects.filters && clip.effects.filters.length > 0));

      if (hasTransforms || hasEffects) {
        const effectsPath = join(TEMP_DIR, `${outputId}_effects_${i}.mp4`);
        const clipDurationMs = (clip.endTime - clip.startTime) * 1000;

        await ffmpegProcessor.applyEffects({
          inputPath: trimmedPath,
          outputPath: effectsPath,
          transforms: clip.transforms,
          effects: clip.effects,
          outputWidth: timelineData.settings.width,
          outputHeight: timelineData.settings.height,
          durationMs: clipDurationMs,
        });

        await unlink(trimmedPath);
        tempFiles.push(effectsPath);
      } else {
        tempFiles.push(trimmedPath);
      }

      const progress = Math.round(((i + 1) / timelineData.clips.length) * 50);
      await prisma.exportHistory.update({
        where: { id: jobId },
        data: { progress },
      });
    }

    // Step 2: Concatenate clips
    logger.info({ jobId }, "Starting concatenation");
    let outputPath = join(TEMP_DIR, `${outputId}_concat.mp4`);

    if (tempFiles.length > 1) {
      await ffmpegProcessor.concat({
        inputPaths: tempFiles,
        outputPath,
      });
    } else if (tempFiles.length === 1 && tempFiles[0]) {
      outputPath = tempFiles[0];
    }

    await prisma.exportHistory.update({
      where: { id: jobId },
      data: { progress: 70 },
    });

    // Step 2.5: Apply text overlays if any
    if (timelineData.textOverlays && timelineData.textOverlays.length > 0) {
      outputPath = await applyTextOverlays(
        outputPath,
        timelineData.textOverlays,
        outputId,
        tempFiles
      );
    }

    await prisma.exportHistory.update({
      where: { id: jobId },
      data: { progress: 80 },
    });

    // Step 3: Add watermark (for free tier)
    const finalPath = join(EXPORTS_DIR, `${outputId}_final.mp4`);

    if (addWatermark) {
      logger.info({ jobId }, "Adding watermark");
      await ffmpegProcessor.addWatermark({
        inputPath: outputPath,
        outputPath: finalPath,
      });
    } else {
      await copyFile(outputPath, finalPath);
    }

    await prisma.exportHistory.update({
      where: { id: jobId },
      data: { progress: 90 },
    });

    // Step 4: Cleanup temp files
    for (const tempFile of tempFiles) {
      try {
        await unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
    if (outputPath !== tempFiles[0]) {
      try {
        await unlink(outputPath);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Mark as completed with download URL
    const downloadUrl = `/api/v1/export/${jobId}/download`;
    const urlExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.exportHistory.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        progress: 100,
        localPath: finalPath,
        downloadUrl,
        urlExpiresAt,
        completedAt: new Date(),
      },
    });

    logger.info({ jobId, outputPath: finalPath }, "Export completed");
  } catch (err) {
    logger.error({ err, jobId }, "Export processing failed");
    await prisma.exportHistory.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }
}

async function applyTextOverlays(
  inputPath: string,
  textOverlays: TimelineData["textOverlays"],
  outputId: string,
  tempFiles: string[]
): Promise<string> {
  if (!textOverlays || textOverlays.length === 0) return inputPath;

  const drawtextFilters: string[] = [];

  for (const overlay of textOverlays) {
    const escapedText = overlay.content
      .replace(/[:\\\\]/g, "\\$&")
      .replace(/'/g, "\\'");
    const color = overlay.color.replace("#", "0x");
    const startSec = overlay.startMs / 1000;
    const endSec = overlay.endMs / 1000;

    let filter = `drawtext=text='${escapedText}'`;
    filter += `:x=(w*${overlay.x}/100)-(text_w/2):y=(h*${overlay.y}/100)-(text_h/2)`;
    filter += `:fontsize=${overlay.fontSize}`;
    filter += `:fontcolor=${color}`;
    filter += `:enable='between(t\\,${startSec}\\,${endSec})'`;

    if (overlay.backgroundColor) {
      const bgColor = overlay.backgroundColor.replace("#", "0x");
      filter += `:box=1:boxcolor=${bgColor}@0.7:boxborderw=10`;
    }

    drawtextFilters.push(filter);
  }

  if (drawtextFilters.length === 0) return inputPath;

  const textOverlayPath = join(TEMP_DIR, `${outputId}_text.mp4`);
  const filterChain = drawtextFilters.join(",");

  const { runFFmpeg, validateInputPath, validateOutputPath } = await import(
    "../ffmpeg/index"
  );

  const validInput = validateInputPath(inputPath);
  const validOutput = validateOutputPath(textOverlayPath);

  await runFFmpeg({
    args: [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-progress",
      "pipe:1",
      "-i",
      validInput,
      "-vf",
      filterChain,
      "-c:v",
      "libx264",
      "-c:a",
      "copy",
      "-preset",
      "fast",
      validOutput,
    ],
    tempDir: "",
    totalDurationMs: 120000,
    timeoutMs: 180000,
  });

  tempFiles.push(textOverlayPath);
  return textOverlayPath;
}
