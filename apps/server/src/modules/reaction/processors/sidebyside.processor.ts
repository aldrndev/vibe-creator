import { join } from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { getFFmpegPath } from "@/modules/export/ffmpeg/ffmpeg-binary";
import { getVideoDuration } from "@/utils/video-info";
import { logger } from "@/lib/logger";
import {
  REACTIONS_DIR,
  RESOLUTIONS,
  ensureReactionsDir,
} from "../reaction.utils";

export interface CreateSideBySideInput {
  leftVideoPath: string;
  rightVideoPath: string;
  layout: "horizontal" | "vertical";
  aspectRatio?: string;
  reactionVolume?: number;
  mainVolume?: number;
  splitRatio?: number;
  smoothBorder?: boolean;
  overlayMode?: boolean;
}

export async function processSideBySide(
  input: CreateSideBySideInput
): Promise<string> {
  await ensureReactionsDir();

  const {
    leftVideoPath,
    rightVideoPath,
    layout,
    aspectRatio = "16:9",
    mainVolume = 1.0,
    reactionVolume = 0.8,
    splitRatio = 0.5,
  } = input;
  const { w: targetW, h: targetH } = RESOLUTIONS[aspectRatio] || {
    w: 1920,
    h: 1080,
  };

  // Security Gate: Check Durations
  const [leftDuration, rightDuration] = await Promise.all([
    getVideoDuration(leftVideoPath),
    getVideoDuration(rightVideoPath),
  ]);

  if (leftDuration > 300 * 1000 || rightDuration > 300 * 1000) {
    throw new Error("Video duration exceeds 5 minutes limit");
  }

  const outputId = randomUUID();
  const outputPath = join(REACTIONS_DIR, `${outputId}.mp4`);

  // Helper to round to nearest even number
  const toEven = (n: number) => Math.floor(n / 2) * 2;

  let leftW: number, rightW: number, leftH: number, rightH: number;

  if (layout === "horizontal") {
    leftW = toEven(targetW * splitRatio);
    rightW = targetW - leftW;
    if (rightW % 2 !== 0) {
      leftW -= 2;
      rightW = toEven(targetW - leftW);
    }
    leftH = targetH;
    rightH = targetH;
  } else {
    leftH = toEven(targetH * splitRatio);
    rightH = targetH - leftH;
    if (rightH % 2 !== 0) {
      leftH -= 2;
      rightH = toEven(targetH - leftH);
    }
    leftW = targetW;
    rightW = targetW;
  }

  const isOverlayMode = input.overlayMode ?? false;
  const isSmoothBorder = input.smoothBorder ?? false;

  let mainW = leftW;
  let mainH = leftH;

  if (isOverlayMode) {
    mainW = targetW;
    mainH = targetH;
  }

  logger.debug(
    {
      layout,
      splitRatio: input.splitRatio,
      targetW,
      targetH,
      leftW,
      leftH,
      rightW,
      rightH,
      mainW,
      mainH,
      isOverlayMode,
      isSmoothBorder,
    },
    "Reaction Debug"
  );

  const getFillFilter = (
    idx: number,
    w: number,
    h: number,
    outLabel: string
  ) => {
    return `[${idx}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}[${outLabel}]`;
  };

  const leftFilter = getFillFilter(0, mainW, mainH, "left");
  const rightFilter = getFillFilter(1, rightW, rightH, "right");

  const featherSize = 150;
  let reactionFeatherFilter = "";

  if (isSmoothBorder) {
    if (layout === "horizontal") {
      reactionFeatherFilter = `[right]format=yuva420p,geq=lum='p(X,Y)':a='if(lt(X,${featherSize}),(X/${featherSize})*255,255)'[right_processed]`;
    } else {
      reactionFeatherFilter = `[right]format=yuva420p,geq=lum='p(X,Y)':a='if(lt(Y,${featherSize}),(Y/${featherSize})*255,255)'[right_processed]`;
    }
  } else {
    reactionFeatherFilter = `[right]copy[right_processed]`;
  }

  const baseFilter = `color=c=black:s=${targetW}x${targetH}[base]`;

  let stackFilter = "";
  if (layout === "horizontal") {
    stackFilter = `[base][left]overlay=0:0:shortest=1[tmp1];[tmp1][right_processed]overlay=${leftW}:0:shortest=1[v]`;
  } else {
    stackFilter = `[base][left]overlay=0:0:shortest=1[tmp1];[tmp1][right_processed]overlay=0:${leftH}:shortest=1[v]`;
  }

  const audioFilter = `[0:a]volume=${mainVolume}[a0];[1:a]volume=${reactionVolume}[a1];[a0][a1]amix=inputs=2:duration=shortest[a]`;

  const filterComplex = `${leftFilter};${rightFilter};${reactionFeatherFilter};${baseFilter};${stackFilter};${audioFilter}`;

  return new Promise((resolve, reject) => {
    const args = [
      "-i",
      leftVideoPath,
      "-i",
      rightVideoPath,
      "-filter_complex",
      filterComplex,
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-y",
      outputPath,
    ];

    const process = spawn(getFFmpegPath(), args);
    let errorOutput = "";

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        logger.info({ outputPath }, "Side-by-side video created");
        resolve(outputPath);
      } else {
        logger.error({ code, errorOutput }, "Side-by-side creation failed");
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });

    process.on("error", (err) => {
      reject(new Error(`FFmpeg not found: ${err.message}`));
    });
  });
}
