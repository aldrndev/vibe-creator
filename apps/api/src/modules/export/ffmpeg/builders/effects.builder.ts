/**
 * Video Effects FFmpeg Command Builders
 * Complex video transformations and effects
 */

import { validateInputPath, validateOutputPath } from "../ffmpeg-path-guard";
import type { FFmpegCommand } from "./basic.builder";

const STANDARD_FLAGS = [
  "-nostdin",
  "-hide_banner",
  "-loglevel",
  "error",
  "-progress",
  "pipe:1",
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const FILTER_MAP: Record<string, string> = {
  grayscale: "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3",
  sepia: "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131",
  vintage: "curves=vintage",
  cold: "colorbalance=bs=0.3",
  warm: "colorbalance=rs=0.3:gs=0.1",
  "high-contrast": "eq=contrast=1.4",
  fade: "eq=contrast=0.9:brightness=0.1:saturation=0.8",
  vivid: "eq=saturation=1.5:contrast=1.1",
};

export interface VideoEffectsOptions {
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
  outputWidth: number;
  outputHeight: number;
  durationMs: number;
}

/**
 * Build video effects command with transforms, filters, speed, and audio effects
 */
export function buildVideoEffectsCommand(
  input: string,
  output: string,
  options: VideoEffectsOptions
): FFmpegCommand {
  const validInput = validateInputPath(input);
  const validOutput = validateOutputPath(output);

  const { transforms, effects, outputWidth, outputHeight, durationMs } =
    options;

  const videoFilters: string[] = [];
  const audioFilters: string[] = [];

  // 1. Speed adjustment
  const speed = effects?.speed ?? 1;
  if (speed !== 1) {
    const clampedSpeed = clamp(speed, 0.25, 4);
    videoFilters.push(`setpts=${(1 / clampedSpeed).toFixed(4)}*PTS`);

    if (clampedSpeed >= 0.5 && clampedSpeed <= 2) {
      audioFilters.push(`atempo=${clampedSpeed}`);
    } else if (clampedSpeed < 0.5) {
      audioFilters.push("atempo=0.5", `atempo=${clampedSpeed * 2}`);
    } else {
      audioFilters.push("atempo=2.0", `atempo=${clampedSpeed / 2}`);
    }
  }

  // 2. Transform: scale + rotation + position
  const scale = transforms?.scale ?? 1;
  const rotation = transforms?.rotation ?? 0;
  const tx = transforms?.x ?? 0;
  const ty = transforms?.y ?? 0;

  if (scale !== 1 || rotation !== 0 || tx !== 0 || ty !== 0) {
    if (scale !== 1) {
      const clampedScale = clamp(scale, 0.1, 3);
      videoFilters.push(`scale=iw*${clampedScale}:ih*${clampedScale}`);
    }

    if (rotation !== 0) {
      const radians = ((rotation * Math.PI) / 180).toFixed(4);
      videoFilters.push(
        `rotate=${radians}:c=none:ow=rotw(${radians}):oh=roth(${radians})`
      );
    }

    videoFilters.push(
      `pad=${outputWidth}:${outputHeight}:(ow-iw)/2+${Math.round(
        tx
      )}:(oh-ih)/2+${Math.round(ty)}:color=black@0`
    );
  } else {
    videoFilters.push(
      `scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease`,
      `pad=${outputWidth}:${outputHeight}:(ow-iw)/2:(oh-ih)/2`
    );
  }

  // 3. Apply color filter
  const filterId = effects?.filters?.[0];
  if (filterId && FILTER_MAP[filterId]) {
    videoFilters.push(FILTER_MAP[filterId]);
  }

  // 4. Opacity
  const opacity = transforms?.opacity ?? 1;
  if (opacity < 1) {
    const clampedOpacity = clamp(opacity, 0, 1);
    videoFilters.push(`format=rgba,colorchannelmixer=aa=${clampedOpacity}`);
  }

  // 5. Video fade in/out
  const fadeIn = effects?.fadeIn ?? 0;
  const fadeOut = effects?.fadeOut ?? 0;
  const durationSec = durationMs / 1000;

  if (fadeIn > 0) {
    videoFilters.push(`fade=t=in:st=0:d=${fadeIn / 1000}`);
    audioFilters.push(`afade=t=in:st=0:d=${fadeIn / 1000}`);
  }
  if (fadeOut > 0) {
    const fadeOutStart = Math.max(0, durationSec - fadeOut / 1000);
    videoFilters.push(
      `fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeOut / 1000}`
    );
    audioFilters.push(
      `afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeOut / 1000}`
    );
  }

  // 6. Volume
  const volume = effects?.volume ?? 1;
  if (volume !== 1) {
    const clampedVolume = clamp(volume, 0, 2);
    audioFilters.push(`volume=${clampedVolume}`);
  }

  // Build args
  const args = [...STANDARD_FLAGS, "-i", validInput];

  if (videoFilters.length > 0) {
    args.push("-vf", videoFilters.join(","));
  }

  if (audioFilters.length > 0) {
    args.push("-af", audioFilters.join(","));
  }

  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    validOutput
  );

  return {
    args,
    expectedOutputs: [validOutput],
    inputs: [validInput],
  };
}
