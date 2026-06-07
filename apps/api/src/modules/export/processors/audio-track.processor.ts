import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getFFprobePath } from '../ffmpeg/ffmpeg-binary';
import { runFFmpeg, validateInputPath, validateOutputPath } from '../ffmpeg/index';

const execFileAsync = promisify(execFile);
const MS_PER_SECOND = 1000;
const AUDIO_MIX_TIMEOUT_MS = 180_000;
const DEFAULT_DURATION_MS = 120_000;

export interface ExportAudioTrack {
  localPath: string;
  startTime: number;
  endTime: number;
  timelineStartMs: number;
  timelineEndMs: number;
  volume: number;
  fadeInMs: number;
  fadeOutMs: number;
  loop?: boolean;
}

interface MixAudioTracksInput {
  inputPath: string;
  outputPath: string;
  audioTracks: readonly ExportAudioTrack[];
  durationMs: number;
  onProgress?: (percent: number) => void;
}

interface BuildAudioMixFilterInput {
  hasBaseAudio: boolean;
  baseAudioInputIndex: number;
  audioInputStartIndex: number;
  audioTracks: readonly ExportAudioTrack[];
}

interface TimelineDurationInput {
  clips: ReadonlyArray<{ startTime: number; endTime: number; timelineEndMs?: number }>;
  audioTracks?: ReadonlyArray<{ timelineEndMs: number }>;
  textOverlays?: ReadonlyArray<{ endMs: number }>;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
}

function formatSeconds(value: number): string {
  return clamp(value, 0, Number.MAX_SAFE_INTEGER).toFixed(3);
}

function getClipDurationSeconds(track: ExportAudioTrack): number {
  return Math.max(0.1, (track.timelineEndMs - track.timelineStartMs) / MS_PER_SECOND);
}

function getSourceEndSeconds(track: ExportAudioTrack): number {
  const clipDurationSec = getClipDurationSeconds(track);
  if (track.endTime > track.startTime) {
    return Math.min(track.endTime, track.startTime + clipDurationSec);
  }

  return track.startTime + clipDurationSec;
}

function isUsableAudioTrack(track: ExportAudioTrack): boolean {
  return track.timelineEndMs > track.timelineStartMs && track.endTime > track.startTime;
}

export function getTimelineDurationMs(timelineData: TimelineDurationInput): number {
  const modernVisualEndMs = Math.max(
    0,
    ...timelineData.clips.map((clip) => clip.timelineEndMs ?? 0),
  );
  const legacyVisualDurationMs = timelineData.clips.reduce(
    (total, clip) => total + Math.max(100, (clip.endTime - clip.startTime) * MS_PER_SECOND),
    0,
  );
  const audioEndMs = Math.max(
    0,
    ...(timelineData.audioTracks?.map((track) => track.timelineEndMs) ?? []),
  );
  const textEndMs = Math.max(
    0,
    ...(timelineData.textOverlays?.map((overlay) => overlay.endMs) ?? []),
  );

  return Math.max(modernVisualEndMs || legacyVisualDurationMs, audioEndMs, textEndMs, 100);
}

function buildAudioTrackFilter(
  track: ExportAudioTrack,
  trackIndex: number,
  inputIndex: number,
): string {
  const label = `a${trackIndex}`;
  const durationSec = getClipDurationSeconds(track);
  const fadeInSec = clamp(track.fadeInMs / MS_PER_SECOND, 0, durationSec);
  const fadeOutSec = clamp(track.fadeOutMs / MS_PER_SECOND, 0, durationSec);
  const fadeOutStartSec = Math.max(0, durationSec - fadeOutSec);
  const delayMs = Math.max(0, Math.round(track.timelineStartMs));
  const volume = clamp(track.volume, 0, 2);
  const filters = [
    `[${inputIndex}:a:0]atrim=start=${formatSeconds(track.startTime)}:end=${formatSeconds(
      getSourceEndSeconds(track),
    )}`,
    'asetpts=PTS-STARTPTS',
  ];

  if (track.loop) {
    filters.push(
      'aloop=loop=-1:size=2147483647',
      `atrim=duration=${formatSeconds(durationSec)}`,
      'asetpts=PTS-STARTPTS',
    );
  }

  if (fadeInSec > 0) {
    filters.push(`afade=t=in:st=0:d=${formatSeconds(fadeInSec)}`);
  }

  if (fadeOutSec > 0) {
    filters.push(`afade=t=out:st=${formatSeconds(fadeOutStartSec)}:d=${formatSeconds(fadeOutSec)}`);
  }

  filters.push(`volume=${volume}`, `adelay=delays=${delayMs}:all=1`);

  return `${filters.join(',')}[${label}]`;
}

export function buildAudioMixFilter({
  hasBaseAudio,
  baseAudioInputIndex,
  audioInputStartIndex,
  audioTracks,
}: BuildAudioMixFilterInput): string {
  const filterParts = [`[${baseAudioInputIndex}:a:0]volume=${hasBaseAudio ? 1 : 0}[basea]`];
  const labels = ['[basea]'];

  audioTracks.forEach((track, index) => {
    filterParts.push(buildAudioTrackFilter(track, index, audioInputStartIndex + index));
    labels.push(`[a${index}]`);
  });

  filterParts.push(
    `${labels.join('')}amix=inputs=${labels.length}:duration=longest:dropout_transition=0[mixed]`,
  );

  return filterParts.join(';');
}

async function hasAudioStream(inputPath: string): Promise<boolean> {
  try {
    const ffprobePath = getFFprobePath();
    const result = await execFileAsync(
      ffprobePath,
      [
        '-v',
        'error',
        '-select_streams',
        'a:0',
        '-show_entries',
        'stream=index',
        '-of',
        'csv=p=0',
        inputPath,
      ],
      { timeout: 10_000 },
    );

    return result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export async function mixAudioTracks({
  inputPath,
  outputPath,
  audioTracks,
  durationMs,
  onProgress,
}: MixAudioTracksInput): Promise<string> {
  const usableTracks = audioTracks.filter(isUsableAudioTrack).map((track) => ({
    ...track,
    localPath: validateInputPath(track.localPath),
  }));

  if (usableTracks.length === 0) {
    return inputPath;
  }

  const validInput = validateInputPath(inputPath);
  const validOutput = validateOutputPath(outputPath);
  const hasBaseAudio = await hasAudioStream(validInput);
  const normalizedDurationMs = Math.max(100, durationMs || DEFAULT_DURATION_MS);
  const durationSec = formatSeconds(normalizedDurationMs / MS_PER_SECOND);
  const inputArgs = ['-i', validInput];
  const baseAudioInputIndex = hasBaseAudio ? 0 : 1;
  const audioInputStartIndex = hasBaseAudio ? 1 : 2;

  if (!hasBaseAudio) {
    inputArgs.push(
      '-f',
      'lavfi',
      '-t',
      durationSec,
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
    );
  }

  for (const track of usableTracks) {
    inputArgs.push('-i', track.localPath);
  }

  await runFFmpeg({
    args: [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-progress',
      'pipe:1',
      ...inputArgs,
      '-filter_complex',
      buildAudioMixFilter({
        hasBaseAudio,
        baseAudioInputIndex,
        audioInputStartIndex,
        audioTracks: usableTracks,
      }),
      '-map',
      '0:v:0',
      '-map',
      '[mixed]',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest',
      validOutput,
    ],
    tempDir: '',
    totalDurationMs: normalizedDurationMs,
    timeoutMs: AUDIO_MIX_TIMEOUT_MS,
    onProgress: (update) => {
      if (update.type === 'PROGRESS' && update.percent !== undefined) {
        onProgress?.(update.percent);
      }
    },
  });

  return validOutput;
}
