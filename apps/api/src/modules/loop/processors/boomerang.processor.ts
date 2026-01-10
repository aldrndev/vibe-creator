import { join } from "path";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { getFFmpegPath } from "@/modules/export/ffmpeg/ffmpeg-binary";
import { logger } from "@/lib/logger";
import { LOOPS_DIR, ensureLoopsDir, getVideoDuration } from "../loop.utils";

export interface CreateBoomerangInput {
  inputPath: string;
  startMs?: number;
  endMs?: number;
  loopCount?: number;
}

export async function processBoomerang(
  input: CreateBoomerangInput
): Promise<string> {
  await ensureLoopsDir();
  const { inputPath, startMs = 0, endMs, loopCount = 1 } = input;

  // Gate 1: Check Source Duration
  const durationSec = await getVideoDuration(inputPath);
  if (durationSec > 300) {
    throw new Error("Video duration exceeds limit (Max 5 Minutes)");
  }

  // Gate 2: Check Result Duration (Max 60s)
  let segDuration = durationSec;
  if (endMs) segDuration = (endMs - startMs) / 1000;

  const totalDuration = segDuration * 2 * loopCount;
  if (totalDuration > 60) {
    throw new Error(
      `Boomerang duration (${totalDuration.toFixed(
        1
      )}s) exceeds limit (Max 60 Seconds)`
    );
  }

  const outputId = randomUUID();
  const outputPath = join(LOOPS_DIR, `${outputId}.mp4`);

  const startSec = startMs / 1000;
  let trimFilter = "";

  if (endMs) {
    const duration = (endMs - startMs) / 1000;
    trimFilter = `trim=start=${startSec}:duration=${duration},setpts=PTS-STARTPTS,`;
  } else if (startMs > 0) {
    trimFilter = `trim=start=${startSec},setpts=PTS-STARTPTS,`;
  }

  // Base Filter: Forward + Reverse Concat
  const baseFilter = `[0:v]${trimFilter}split[v1][v2];[v2]reverse[vr];[v1][vr]concat=n=2:v=1:a=0[v_base];`;
  const repeats = Math.max(0, loopCount - 1);
  const useSmartExtend = repeats > 0; // Always use for >1 plays

  if (useSmartExtend) {
    // --- PASS 1: Render Base Unit ---
    const baseId = randomUUID();
    const basePath = join(LOOPS_DIR, `${baseId}_base.mp4`);
    const pass1Filter = `${baseFilter}[v_base]copy[v]`;

    try {
      await new Promise<void>((resolve, reject) => {
        const args = [
          "-i",
          inputPath,
          "-filter_complex",
          pass1Filter,
          "-map",
          "[v]",
          "-an",
          "-c:v",
          "libx264",
          "-y",
          basePath,
        ];
        const p = spawn(getFFmpegPath(), args);
        p.on("close", (code) =>
          code === 0
            ? resolve()
            : reject(new Error(`Boomerang Pass 1 failed: ${code}`))
        );
      });

      // --- PASS 2: Stream Copy Loop ---
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
          code === 0
            ? resolve()
            : reject(new Error(`Boomerang Pass 2 failed: ${code}`))
        );
      });

      await unlink(basePath).catch(() => {});
      return outputPath;
    } catch (error) {
      if (existsSync(basePath)) await unlink(basePath).catch(() => {});
      throw error;
    }
  } else {
    // Single loop optimization
    const filterComplex = `${baseFilter}[v_base]loop=${repeats}:size=32767:start=0[v]`;

    return new Promise((resolve, reject) => {
      const args = [
        "-i",
        inputPath,
        "-filter_complex",
        filterComplex,
        "-map",
        "[v]",
        "-an",
        "-c:v",
        "libx264",
        "-y",
        outputPath,
      ];
      const process = spawn(getFFmpegPath(), args);
      let errorOutput = "";
      process.stderr.on("data", (d) => (errorOutput += d.toString()));
      process.on("close", (code) => {
        if (code === 0) {
          logger.info({ outputPath }, "Boomerang created");
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg failed: ${code}`));
        }
      });
    });
  }
}
