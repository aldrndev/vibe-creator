import { resolveEditorFontFile } from '@/lib/editor-fonts';
import { logger } from '@/lib/logger';
import { runFFmpeg, validateInputPath, validateOutputPath } from '../ffmpeg/index';
import { getTimelineDurationMs } from './audio-track.processor';
import type { TimelineData } from './export-processor.types';
import {
  buildBackgroundBaseFilters,
  buildBackgroundInputSource,
} from './modern-background.processor';
import { buildDrawtextFilter } from './text-overlay-filter';

const MS_PER_SECOND = 1000;
const MODERN_COMPOSITOR_TIMEOUT_MS = 300_000;
const MIN_LAYER_DURATION_MS = 100;
const DEFAULT_VISUAL_FADE_MS = 500;

const FILTER_MAP: Record<string, string> = {
  grayscale: 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3',
  cold: 'colorbalance=bs=0.3',
  warm: 'colorbalance=rs=0.3:gs=0.1',
  vivid: 'eq=saturation=1.5:contrast=1.1',
};

interface ComposeModernTimelineInput {
  readonly timelineData: TimelineData;
  readonly outputPath: string;
  readonly onProgress?: (percent: number) => void;
}

type VisualClip = TimelineData['clips'][number] & {
  inputIndex: number;
  renderOrder: number;
};

interface LayerStackItem {
  type: 'visual' | 'text';
  zIndex: number;
  renderOrder: number;
  visual?: VisualClip;
  text?: NonNullable<TimelineData['textOverlays']>[number];
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

function getLayerStartMs(clip: TimelineData['clips'][number]): number {
  return Math.max(0, clip.timelineStartMs ?? 0);
}

function getLayerEndMs(clip: TimelineData['clips'][number]): number {
  const fallbackDurationMs = Math.max(
    MIN_LAYER_DURATION_MS,
    (clip.endTime - clip.startTime) * MS_PER_SECOND,
  );
  return Math.max(
    getLayerStartMs(clip) + MIN_LAYER_DURATION_MS,
    clip.timelineEndMs ?? fallbackDurationMs,
  );
}

function getLayerDurationMs(clip: TimelineData['clips'][number]): number {
  return Math.max(MIN_LAYER_DURATION_MS, getLayerEndMs(clip) - getLayerStartMs(clip));
}

function hasTimelinePositioning(clip: TimelineData['clips'][number]): boolean {
  return (
    clip.timelineStartMs !== undefined ||
    clip.timelineEndMs !== undefined ||
    clip.zIndex !== undefined ||
    clip.loop === true
  );
}

function clipsOverlap(
  left: TimelineData['clips'][number],
  right: TimelineData['clips'][number],
): boolean {
  return (
    getLayerStartMs(left) < getLayerEndMs(right) && getLayerStartMs(right) < getLayerEndMs(left)
  );
}

export function shouldUseModernCompositor(timelineData: TimelineData): boolean {
  const visibleClips = timelineData.clips.filter((clip) => clip.visible !== false);
  const visibleTextOverlays = (timelineData.textOverlays ?? []).filter(
    (text) => text.visible !== false,
  );
  const needsModernBackground =
    timelineData.settings.backgroundMode === 'gradient' ||
    timelineData.settings.backgroundMode === 'image' ||
    (timelineData.settings.backgroundOpacity !== undefined &&
      timelineData.settings.backgroundOpacity !== 1);

  if (visibleClips.length === 0) {
    return visibleTextOverlays.length > 0 || (timelineData.audioTracks?.length ?? 0) > 0;
  }

  if (needsModernBackground) {
    return true;
  }

  const hasRotatedText = (timelineData.textOverlays ?? []).some(
    (text) => text.visible !== false && (text.rotation ?? 0) !== 0,
  );
  if (visibleClips.length <= 1) {
    const onlyClip = visibleClips[0];
    return Boolean(onlyClip && (getLayerStartMs(onlyClip) > 0 || onlyClip.loop || hasRotatedText));
  }

  if (visibleClips.some(hasTimelinePositioning)) {
    return true;
  }

  return visibleClips.some((clip, index) =>
    visibleClips.slice(index + 1).some((candidate) => clipsOverlap(clip, candidate)),
  );
}

export function hasVisibleTimedContent(timelineData: TimelineData): boolean {
  const hasVisual = timelineData.clips.some((clip) => clip.visible !== false);
  const hasText = (timelineData.textOverlays ?? []).some(
    (text) => text.visible !== false && text.endMs > text.startMs,
  );
  const hasAudio = (timelineData.audioTracks ?? []).some(
    (audio) => audio.timelineEndMs > audio.timelineStartMs,
  );

  return hasVisual || hasText || hasAudio;
}

export async function composeModernTimeline({
  timelineData,
  outputPath,
  onProgress,
}: ComposeModernTimelineInput): Promise<string> {
  const visibleClips = timelineData.clips
    .filter((clip) => clip.visible !== false)
    .sort((left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0));
  const visibleTextOverlays = (timelineData.textOverlays ?? []).filter(
    (text) => text.visible !== false,
  );
  if (!hasVisibleTimedContent(timelineData)) {
    throw new Error('Modern export requires at least one visible layer');
  }

  const durationMs = getTimelineDurationMs(timelineData);
  const durationSec = formatSeconds(durationMs / MS_PER_SECOND);
  const settings = timelineData.settings;
  const inputArgs = [
    '-f',
    'lavfi',
    '-t',
    durationSec,
    '-i',
    buildBackgroundInputSource(settings, durationSec),
  ];
  let nextInputIndex = 1;
  let backgroundImageInputIndex: number | undefined;
  if (settings.backgroundMode === 'image' && settings.backgroundImagePath) {
    backgroundImageInputIndex = nextInputIndex;
    nextInputIndex += 1;
    inputArgs.push(
      '-loop',
      '1',
      '-t',
      durationSec,
      '-i',
      validateInputPath(settings.backgroundImagePath),
    );
  }
  const visualClips: VisualClip[] = [];

  visibleClips.forEach((clip, index) => {
    const validInput = validateInputPath(clip.localPath);
    const layerDurationSec = formatSeconds(getLayerDurationMs(clip) / MS_PER_SECOND);
    if (clip.mediaType === 'image') {
      inputArgs.push('-loop', '1', '-t', layerDurationSec, '-i', validInput);
    } else if (clip.loop) {
      inputArgs.push(
        '-stream_loop',
        '-1',
        '-ss',
        formatSeconds(clip.startTime),
        '-t',
        layerDurationSec,
        '-i',
        validInput,
      );
    } else {
      inputArgs.push('-i', validInput);
    }
    visualClips.push({ ...clip, inputIndex: index + nextInputIndex, renderOrder: index });
  });

  const filterParts: string[] = [];
  const stack = buildLayerStack(visualClips, visibleTextOverlays);
  const backgroundBase = buildBackgroundBaseFilters({
    backgroundImageInputIndex,
    settings,
    visualClips,
  });
  let currentLabel = backgroundBase.label;
  filterParts.push(...backgroundBase.filters);

  for (const [index, item] of stack.entries()) {
    const nextLabel = `stack${index}`;
    if (item.type === 'visual' && item.visual) {
      const visualLabel = `visual${item.visual.renderOrder}`;
      filterParts.push(
        buildVisualLayerFilter(item.visual, visualLabel, settings.width, settings.height),
      );
      filterParts.push(buildOverlayFilter(currentLabel, visualLabel, nextLabel, item.visual));
    } else if (item.type === 'text' && item.text) {
      filterParts.push(
        ...buildTextLayerFilter({
          inputLabel: currentLabel,
          outputLabel: nextLabel,
          renderOrder: item.renderOrder,
          settings,
          text: item.text,
          timelineDurationMs: durationMs,
        }),
      );
    }
    currentLabel = nextLabel;
  }

  const validOutput = validateOutputPath(outputPath);

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
      filterParts.join(';'),
      '-map',
      `[${currentLabel}]`,
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      validOutput,
    ],
    tempDir: '',
    totalDurationMs: durationMs,
    timeoutMs: MODERN_COMPOSITOR_TIMEOUT_MS,
    onProgress: (update) => {
      if (update.type === 'PROGRESS' && update.percent !== undefined) {
        onProgress?.(update.percent);
      }
    },
  });

  return validOutput;
}

function buildLayerStack(
  visualClips: readonly VisualClip[],
  textOverlays: readonly NonNullable<TimelineData['textOverlays']>[number][],
): LayerStackItem[] {
  const visualItems = visualClips.map((visual) => ({
    type: 'visual' as const,
    zIndex: visual.zIndex ?? 0,
    renderOrder: visual.renderOrder,
    visual,
  }));
  const textItems = textOverlays
    .filter((text) => text.visible !== false)
    .map((text, index) => ({
      type: 'text' as const,
      zIndex: text.zIndex ?? 1000 + index,
      renderOrder: visualItems.length + index,
      text,
    }));

  return [...visualItems, ...textItems].sort(
    (left, right) => left.zIndex - right.zIndex || left.renderOrder - right.renderOrder,
  );
}

function buildVisualLayerFilter(
  clip: VisualClip,
  outputLabel: string,
  outputWidth: number,
  outputHeight: number,
): string {
  const durationMs = getLayerDurationMs(clip);
  const durationSec = formatSeconds(durationMs / MS_PER_SECOND);
  const source =
    clip.mediaType === 'image' || clip.loop
      ? `[${clip.inputIndex}:v]trim=duration=${durationSec}`
      : `[${clip.inputIndex}:v]trim=start=${formatSeconds(clip.startTime)}:end=${formatSeconds(clip.endTime)}`;
  const targetWidth = Math.max(2, Math.round(outputWidth * (clip.transforms?.scale ?? 1)));
  const targetHeight = Math.max(2, Math.round(outputHeight * (clip.transforms?.scale ?? 1)));
  const fitMode = clip.fit ?? 'contain';
  const filters = [
    source,
    'setpts=PTS-STARTPTS',
    `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=${fitMode === 'cover' ? 'increase' : 'decrease'}`,
  ];

  if (fitMode === 'cover') {
    filters.push(`crop=${targetWidth}:${targetHeight}`);
  }

  const filterId = clip.effects?.filters?.[0];
  if (filterId && FILTER_MAP[filterId]) {
    filters.push(FILTER_MAP[filterId]);
  }

  const rotation = clip.transforms?.rotation ?? 0;
  if (rotation !== 0) {
    const radians = ((rotation * Math.PI) / 180).toFixed(4);
    filters.push(`rotate=${radians}:c=none:ow=rotw(${radians}):oh=roth(${radians})`);
  }

  filters.push('format=rgba');

  const opacity = clamp(clip.transforms?.opacity ?? 1, 0, 1);
  if (opacity < 1) {
    filters.push(`colorchannelmixer=aa=${opacity}`);
  }

  const fadeInSec = getTransitionDurationSec(clip.effects?.fadeIn, clip.effects?.transitionIn);
  if (fadeInSec > 0) {
    filters.push(`fade=t=in:st=0:d=${formatSeconds(fadeInSec)}:alpha=1`);
  }

  const fadeOutSec = getTransitionDurationSec(clip.effects?.fadeOut, clip.effects?.transitionOut);
  if (fadeOutSec > 0) {
    const fadeOutStartSec = Math.max(0, durationMs / MS_PER_SECOND - fadeOutSec);
    filters.push(
      `fade=t=out:st=${formatSeconds(fadeOutStartSec)}:d=${formatSeconds(fadeOutSec)}:alpha=1`,
    );
  }

  filters.push(`setpts=PTS-STARTPTS+${formatSeconds(getLayerStartMs(clip) / MS_PER_SECOND)}/TB`);

  return `${filters.join(',')}[${outputLabel}]`;
}

function buildOverlayFilter(
  inputLabel: string,
  visualLabel: string,
  outputLabel: string,
  clip: VisualClip,
): string {
  const x = Math.round(clip.transforms?.x ?? 0);
  const y = Math.round(clip.transforms?.y ?? 0);
  const startSec = formatSeconds(getLayerStartMs(clip) / MS_PER_SECOND);
  const endSec = formatSeconds(getLayerEndMs(clip) / MS_PER_SECOND);

  return `[${inputLabel}][${visualLabel}]overlay=x='(W-w)/2+${x}':y='(H-h)/2+${y}':enable='between(t\\,${startSec}\\,${endSec})'[${outputLabel}]`;
}

function buildTextLayerFilter({
  inputLabel,
  outputLabel,
  renderOrder,
  settings,
  text,
  timelineDurationMs,
}: {
  inputLabel: string;
  outputLabel: string;
  renderOrder: number;
  settings: TimelineData['settings'];
  text: NonNullable<TimelineData['textOverlays']>[number];
  timelineDurationMs: number;
}): string[] {
  const fontFile = resolveEditorFontFile(text.fontFamily, text.fontWeight === 'bold');
  if (!fontFile) {
    logger.warn(
      { fontFamily: text.fontFamily },
      'Editor font file missing; FFmpeg will use its default font',
    );
  }
  const drawtextFilter = buildDrawtextFilter(text, fontFile);
  const rotation = text.rotation ?? 0;
  if (rotation === 0) {
    return [`[${inputLabel}]${drawtextFilter}[${outputLabel}]`];
  }

  const baseLabel = `textbase${renderOrder}`;
  const drawLabel = `textdraw${renderOrder}`;
  const rotatedLabel = `textrot${renderOrder}`;
  const radians = ((rotation * Math.PI) / 180).toFixed(4);

  return [
    `color=c=black@0.0:s=${settings.width}x${settings.height}:r=${settings.fps}:d=${formatSeconds(
      timelineDurationMs / MS_PER_SECOND,
    )},format=rgba[${baseLabel}]`,
    `[${baseLabel}]${drawtextFilter}[${drawLabel}]`,
    `[${drawLabel}]rotate=${radians}:c=none:ow=iw:oh=ih[${rotatedLabel}]`,
    `[${inputLabel}][${rotatedLabel}]overlay=0:0[${outputLabel}]`,
  ];
}

function getTransitionDurationSec(
  fadeMs: number | undefined,
  transition: string | undefined,
): number {
  if (transition && transition !== 'none') {
    return Math.max(0.1, (fadeMs || DEFAULT_VISUAL_FADE_MS) / MS_PER_SECOND);
  }

  return Math.max(0, (fadeMs ?? 0) / MS_PER_SECOND);
}
