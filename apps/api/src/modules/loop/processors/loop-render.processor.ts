import { unlink } from 'node:fs/promises';
import { runFFmpeg, validateInputPath, validateOutputPath } from '@/modules/export/ffmpeg';
import { getVideoDuration, getVideoResolution, hasVideoAudioStream } from '@/utils/video-info';
import type { LoopRenderSpec } from '../loop.schemas';

const PROCESS_TIMEOUT_MS = 3 * 60 * 60 * 1000;
const OUTPUT_DURATION_TOLERANCE_MS = 350;
type CycleAudioCodec = 'none' | 'aac' | 'pcm';

interface LoopRenderInput {
  readonly spec: LoopRenderSpec;
  readonly outputPath: string;
  readonly onProgress?: (percent: number) => void;
}

interface LoopCycleInput {
  readonly spec: LoopRenderSpec;
  readonly outputPath: string;
  readonly audioCodec?: CycleAudioCodec;
  readonly onProgress?: (percent: number) => void;
}

/**
 * Renders one safe loop cycle first, then repeats it to the requested complete-cycle duration.
 */
export async function renderLoopVideo(input: LoopRenderInput): Promise<string> {
  const outputPath = validateOutputPath(input.outputPath);
  const includeAudio = input.spec.sourceHasAudio && !input.spec.audioMuted;
  const cyclePath = validateOutputPath(
    outputPath.replace(/\.mp4$/i, includeAudio ? '-cycle.mkv' : '-cycle.mp4'),
  );

  try {
    await renderLoopCycle({
      spec: input.spec,
      outputPath: cyclePath,
      audioCodec: includeAudio ? 'pcm' : 'none',
      onProgress: (percent) => input.onProgress?.(percent * 0.4),
    });
    await extendLoopCycle({
      spec: input.spec,
      cyclePath,
      outputPath,
      onProgress: (percent) => input.onProgress?.(40 + percent * 0.6),
    });
    await verifyLoopOutput(input.spec, outputPath);
    return outputPath;
  } finally {
    await unlink(cyclePath).catch(() => undefined);
  }
}

/**
 * Creates the exact one-cycle media used by both inline preview and final export.
 */
export async function renderLoopCycle(input: LoopCycleInput): Promise<string> {
  const sourcePath = validateInputPath(input.spec.sourceAssetPath);
  const outputPath = validateOutputPath(input.outputPath);
  const includeAudio = input.spec.sourceHasAudio && !input.spec.audioMuted;
  const audioCodec = includeAudio ? (input.audioCodec ?? 'aac') : 'none';
  await runFFmpeg({
    args: buildCycleArgs(input.spec, sourcePath, outputPath, includeAudio, audioCodec),
    tempDir: '',
    totalDurationMs: input.spec.cycleDurationMs,
    timeoutMs: PROCESS_TIMEOUT_MS,
    onProgress: (progress) => input.onProgress?.(progress.percent ?? 0),
  });
  return outputPath;
}

export async function extendLoopCycle(input: {
  readonly spec: LoopRenderSpec;
  readonly cyclePath: string;
  readonly outputPath: string;
  readonly onProgress?: (percent: number) => void;
}): Promise<string> {
  const outputPath = validateOutputPath(input.outputPath);
  await runFFmpeg({
    args: buildExtensionArgs(input.spec, validateInputPath(input.cyclePath), outputPath),
    tempDir: '',
    totalDurationMs: input.spec.actualDurationMs,
    timeoutMs: PROCESS_TIMEOUT_MS,
    onProgress: (progress) => input.onProgress?.(progress.percent ?? 0),
  });
  return outputPath;
}

export function buildCycleArgs(
  spec: LoopRenderSpec,
  sourcePath: string,
  outputPath: string,
  includeAudio: boolean,
  audioCodec: CycleAudioCodec = includeAudio ? 'aac' : 'none',
): string[] {
  const filters = buildCycleFilters(spec, includeAudio);
  const args = [
    '-nostdin',
    '-hide_banner',
    '-progress',
    'pipe:1',
    '-i',
    sourcePath,
    '-filter_complex',
    filters,
    '-map',
    '[vout]',
  ];

  if (includeAudio) {
    args.push('-map', '[aout]');
    if (audioCodec === 'pcm') {
      args.push('-c:a', 'pcm_s16le');
    } else {
      args.push('-c:a', 'aac', '-b:a', '192k');
    }
  } else {
    args.push('-an');
  }

  args.push('-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p');
  if (audioCodec !== 'pcm') {
    args.push('-movflags', '+faststart');
  }
  args.push('-y', outputPath);
  return args;
}

export function buildExtensionArgs(
  spec: LoopRenderSpec,
  cyclePath: string,
  outputPath: string,
): string[] {
  const includeAudio = spec.sourceHasAudio && !spec.audioMuted;
  const args = [
    '-nostdin',
    '-hide_banner',
    '-progress',
    'pipe:1',
    '-stream_loop',
    String(Math.max(0, spec.cycleCount - 1)),
    '-i',
    cyclePath,
    '-t',
    toSeconds(spec.actualDurationMs),
  ];
  if (includeAudio) {
    args.push('-map', '0:v:0', '-c:v', 'copy', '-map', '0:a:0', '-c:a', 'aac', '-b:a', '192k');
  } else {
    args.push('-c:v', 'copy', '-an');
  }
  args.push('-movflags', '+faststart', '-y', outputPath);
  return args;
}

function buildCycleFilters(spec: LoopRenderSpec, includeAudio: boolean): string {
  const start = toSeconds(spec.trimStartMs);
  const segment = toSeconds(spec.selectedSegmentDurationMs);
  const videoCycle = buildVideoCycleFilter(spec, start, segment);
  const visualOutput = buildRatioFilter(spec);
  const audioCycle = includeAudio ? buildAudioCycleFilter(spec, start, segment) : '';
  return [videoCycle, visualOutput, audioCycle]
    .filter((filter) => filter.length > 0)
    .map(removeTrailingFilterSeparator)
    .join(';');
}

function removeTrailingFilterSeparator(filter: string): string {
  return filter.endsWith(';') ? filter.slice(0, -1) : filter;
}

function buildVideoCycleFilter(spec: LoopRenderSpec, start: string, segment: string): string {
  if (spec.transitionMode === 'repeat') {
    return `[0:v]trim=start=${start}:duration=${segment},setpts=PTS-STARTPTS[vcycle];`;
  }

  const firstDurationMs = Math.floor(spec.selectedSegmentDurationMs / 2);
  const secondDurationMs = spec.selectedSegmentDurationMs - firstDurationMs;
  const secondStartMs = spec.trimStartMs + firstDurationMs;
  const transition = toSeconds(spec.transitionDurationMs);
  const offset = toSeconds(secondDurationMs - spec.transitionDurationMs);
  return (
    '[0:v]split[vfirstraw][vsecondraw];' +
    `[vfirstraw]trim=start=${start}:duration=${toSeconds(firstDurationMs)},setpts=PTS-STARTPTS[vfirst];` +
    `[vsecondraw]trim=start=${toSeconds(secondStartMs)}:duration=${toSeconds(secondDurationMs)},setpts=PTS-STARTPTS[vsecond];` +
    `[vsecond][vfirst]xfade=transition=fade:duration=${transition}:offset=${offset}[vcycle];`
  );
}

function buildAudioCycleFilter(spec: LoopRenderSpec, start: string, segment: string): string {
  if (spec.transitionMode === 'repeat') {
    return `[0:a]atrim=start=${start}:duration=${segment},asetpts=PTS-STARTPTS[aout];`;
  }

  const firstDurationMs = Math.floor(spec.selectedSegmentDurationMs / 2);
  const secondDurationMs = spec.selectedSegmentDurationMs - firstDurationMs;
  const secondStartMs = spec.trimStartMs + firstDurationMs;
  return (
    '[0:a]asplit[afirstraw][asecondraw];' +
    `[afirstraw]atrim=start=${start}:duration=${toSeconds(firstDurationMs)},asetpts=PTS-STARTPTS[afirst];` +
    `[asecondraw]atrim=start=${toSeconds(secondStartMs)}:duration=${toSeconds(secondDurationMs)},asetpts=PTS-STARTPTS[asecond];` +
    `[asecond][afirst]acrossfade=d=${toSeconds(spec.transitionDurationMs)}:c1=tri:c2=tri[aout];`
  );
}

function buildRatioFilter(spec: LoopRenderSpec): string {
  if (spec.aspectRatio === 'original') {
    return '[vcycle]format=yuv420p[vout];';
  }

  const { outputWidth: width, outputHeight: height } = spec;
  return (
    '[vcycle]split[background][foreground];' +
    `[background]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=20:10[blurred];` +
    `[foreground]scale=${width}:${height}:force_original_aspect_ratio=decrease[contained];` +
    '[blurred][contained]overlay=(W-w)/2:(H-h)/2,format=yuv420p[vout];'
  );
}

function toSeconds(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(3);
}

async function verifyLoopOutput(spec: LoopRenderSpec, outputPath: string): Promise<void> {
  const [durationMs, dimensions, hasAudio] = await Promise.all([
    getVideoDuration(outputPath),
    getVideoResolution(outputPath),
    hasVideoAudioStream(outputPath),
  ]);
  if (Math.abs(durationMs - spec.actualDurationMs) > OUTPUT_DURATION_TOLERANCE_MS) {
    throw new Error('Durasi hasil loop tidak sesuai hasil perhitungan.');
  }
  if (dimensions.width !== spec.outputWidth || dimensions.height !== spec.outputHeight) {
    throw new Error('Resolusi hasil loop tidak sesuai format video.');
  }
  const expectedAudio = spec.sourceHasAudio && !spec.audioMuted;
  if (hasAudio !== expectedAudio) {
    throw new Error('Audio hasil loop tidak sesuai pengaturan.');
  }
}
