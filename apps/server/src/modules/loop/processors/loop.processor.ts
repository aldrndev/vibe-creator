/**
 * @module loop/processors/loop
 * @description Processor for creating looping videos with optional crossfade.
 *
 * Supports:
 * - Standard looping with configurable repeat count
 * - Seamless crossfade looping for perfect transitions
 * - Aspect ratio scaling with blurred background fill
 * - Two-pass encoding for high loop counts (>5)
 */

import { join } from "path";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { getFFmpegPath } from "@/modules/export/ffmpeg/ffmpeg-binary";
import { logger } from "@/lib/logger";
import {
  LOOPS_DIR,
  RESOLUTIONS,
  ensureLoopsDir,
  getVideoDuration,
} from "../loop.utils";

/**
 * Input parameters for creating a looping video.
 */
export interface CreateLoopInput {
  /** Absolute path to the source video file */
  inputPath: string;
  /** Start time in milliseconds for trimming */
  startMs?: number;
  /** End time in milliseconds for trimming */
  endMs?: number;
  /** Number of times to loop the video (minimum 1) */
  loopCount: number;
  /** Target aspect ratio for output. Leave empty to preserve original. */
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:5" | "";
  /** Enable seamless crossfade for perfect loop transitions */
  crossfade?: boolean;
}

/**
 * Creates a looping video from the input source.
 *
 * @param input - Configuration for the loop creation
 * @returns Path to the generated looping video file
 * @throws Error if video duration exceeds 5 minutes
 * @throws Error if FFmpeg processing fails
 *
 * @example
 * ```ts
 * const outputPath = await processLoop({
 *   inputPath: '/path/to/video.mp4',
 *   loopCount: 3,
 *   crossfade: true,
 *   aspectRatio: '9:16'
 * });
 * ```
 */

export async function processLoop(input: CreateLoopInput): Promise<string> {
  await ensureLoopsDir();
  const { inputPath, startMs = 0, endMs, loopCount } = input;

  // Gate 1: Check Duration
  const durationSec = await getVideoDuration(inputPath);
  if (durationSec > 300) {
    throw new Error("Video duration exceeds limit (Max 5 Minutes)");
  }

  const outputId = randomUUID();
  const outputPath = join(LOOPS_DIR, `${outputId}.mp4`);

  // Build filter for trimming and looping
  const startSec = (startMs || 0) / 1000;
  let segDuration = 0;
  if (endMs) segDuration = (endMs - (startMs || 0)) / 1000;

  let baseFilter = "";
  let vLabel = "[v_base]";
  let aLabel = "[a_base]";

  const isSeamless =
    input.crossfade && endMs && startMs !== undefined && segDuration > 0;

  if (isSeamless) {
    // Shift & Dissolve Logic (Perfect Loop)
    const overlap = Math.min(2.0, segDuration * 0.3); // Max 2s overlap
    const midPoint = segDuration / 2;
    const xfadeOffset = segDuration - midPoint - overlap;

    baseFilter += `[0:v]split[vA_raw][vB_raw];`;
    baseFilter += `[vA_raw]trim=start=${startSec}:duration=${midPoint},setpts=PTS-STARTPTS[vPartA];`;
    baseFilter += `[vB_raw]trim=start=${startSec + midPoint}:duration=${
      segDuration - midPoint
    },setpts=PTS-STARTPTS[vPartB];`;
    baseFilter += `[vPartB][vPartA]xfade=transition=fade:duration=${overlap}:offset=${xfadeOffset}${vLabel};`;

    baseFilter += `[0:a]asplit[aA_raw][aB_raw];`;
    baseFilter += `[aA_raw]atrim=start=${startSec}:duration=${midPoint},asetpts=PTS-STARTPTS[aPartA];`;
    baseFilter += `[aB_raw]atrim=start=${startSec + midPoint}:duration=${
      segDuration - midPoint
    },asetpts=PTS-STARTPTS[aPartB];`;
    baseFilter += `[aPartB][aPartA]acrossfade=d=${overlap}:c1=tri:c2=tri${aLabel};`;
  } else {
    // Standard Trim Logic
    if (segDuration > 0) {
      baseFilter += `[0:v]trim=start=${startSec}:duration=${segDuration},setpts=PTS-STARTPTS${vLabel};`;
      baseFilter += `[0:a]atrim=start=${startSec}:duration=${segDuration},asetpts=PTS-STARTPTS${aLabel};`;
    } else {
      baseFilter += `[0:v]trim=start=${startSec},setpts=PTS-STARTPTS${vLabel};`;
      baseFilter += `[0:a]atrim=start=${startSec},asetpts=PTS-STARTPTS${aLabel};`;
    }
  }

  // Aspect Ratio Scaling
  let scaleFilter = "";
  if (input.aspectRatio && RESOLUTIONS[input.aspectRatio]) {
    const { w, h } = RESOLUTIONS[input.aspectRatio]!;
    const vScaled = "[v_scaled]";
    scaleFilter =
      `${vLabel}split[bg][fg];` +
      `[bg]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=20:10[bg_blurred];` +
      `[fg]scale=${w}:${h}:force_original_aspect_ratio=decrease[fg_scaled];` +
      `[bg_blurred][fg_scaled]overlay=(W-w)/2:(H-h)/2${vScaled};`;

    vLabel = vScaled; // Update pointer
  }

  const repeats = Math.max(0, loopCount - 1);
  const useSmartExtend = repeats > 5;

  if (useSmartExtend) {
    // --- PASS 1: Base Unit ---
    const baseId = randomUUID();
    const basePath = join(LOOPS_DIR, `${baseId}_base.mp4`);

    const finalMap = `${vLabel}copy[v];${aLabel}copy[a]`;
    const pass1Filter = `${baseFilter}${scaleFilter}${finalMap}`;

    try {
      await new Promise<void>((resolve, reject) => {
        const args = [
          "-i",
          inputPath,
          "-filter_complex",
          pass1Filter,
          "-map",
          "[v]",
          "-map",
          "[a]",
          "-c:v",
          "libx264",
          "-c:a",
          "aac",
          "-y",
          basePath,
        ];
        const p = spawn(getFFmpegPath(), args);
        p.on("close", (code) =>
          code === 0 ? resolve() : reject(new Error(`Pass 1 failed: ${code}`))
        );
        p.stderr.on("data", (d) =>
          logger.debug({ data: d.toString() }, "Pass 1 stderr")
        );
      });

      // --- PASS 2: Stream Copy Extend ---
      await new Promise<void>((resolve, reject) => {
        const args = [
          "-stream_loop",
          repeats.toString(),
          "-i",
          basePath,
          "-c",
          "copy",
          "-y",
          outputPath,
        ];
        const p = spawn(getFFmpegPath(), args);
        p.on("close", (code) =>
          code === 0 ? resolve() : reject(new Error(`Pass 2 failed: ${code}`))
        );
        p.stderr.on("data", (d) =>
          logger.debug({ data: d.toString() }, "Pass 2 stderr")
        );
      });

      await unlink(basePath).catch((e) =>
        logger.warn({ err: e }, "Failed to cleanup base loop")
      );

      return outputPath;
    } catch (error) {
      if (existsSync(basePath)) await unlink(basePath).catch(() => {});
      throw error;
    }
  } else {
    // --- STANDARD SINGLE PASS ---
    const loopFilter = `${vLabel}loop=${repeats}:size=32767:start=0[v];${aLabel}aloop=${repeats}:size=2e+09:start=0[a]`;
    const filterComplex = `${baseFilter}${scaleFilter}${loopFilter}`;

    return new Promise((resolve, reject) => {
      const args = [
        "-i",
        inputPath,
        "-filter_complex",
        filterComplex,
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-y",
        outputPath,
      ];

      const process = spawn(getFFmpegPath(), args);
      let errorOutput = "";

      process.stderr.on("data", (data) => {
        errorOutput += data.toString();
        logger.debug({ data: data.toString() }, "ffmpeg loop stderr");
      });

      process.on("close", (code) => {
        if (code === 0) {
          logger.info({ outputPath }, "Loop video created");
          resolve(outputPath);
        } else {
          logger.error({ code, errorOutput }, "Loop creation failed");
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });

      process.on("error", (err) => {
        reject(new Error(`FFmpeg not found: ${err.message}`));
      });
    });
  }
}
