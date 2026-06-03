import { toFFmpegColor } from './ffmpeg-color';

const MS_PER_SECOND = 1000;
const MIN_LAYER_DURATION_MS = 100;
const FULL_OPACITY = 1;
const DEFAULT_GRADIENT_FROM = '#111827';
const DEFAULT_GRADIENT_TO = '#ff4b1f';
const DEFAULT_GRADIENT_ANGLE = 135;
const HEX_COLOR_PATTERN = /^#?([0-9a-f]{6})$/i;

export interface ModernBackgroundSettings {
  width: number;
  height: number;
  fps: number;
  backgroundColor?: string;
  backgroundMode?: 'solid' | 'blur' | 'gradient' | 'image';
  backgroundOpacity?: number;
  backgroundBlurAmount?: number;
  backgroundBlurZoom?: number;
  backgroundDim?: number;
  backgroundSaturation?: number;
  backgroundGradientFrom?: string;
  backgroundGradientTo?: string;
  backgroundGradientAngle?: number;
  backgroundImagePath?: string;
  backgroundImageFit?: 'contain' | 'cover';
  backgroundImageBlurAmount?: number;
  backgroundImageDim?: number;
  backgroundImagePositionX?: number;
  backgroundImagePositionY?: number;
  backgroundImageScale?: number;
}

export interface ModernBackgroundVisualClip {
  inputIndex: number;
  mediaType?: 'video' | 'image';
  startTime: number;
  endTime: number;
  timelineStartMs?: number;
  timelineEndMs?: number;
  zIndex?: number;
  loop?: boolean;
}

export interface GradientLine {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface BackgroundBaseResult {
  label: string;
  filters: string[];
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

function normalizeHexColor(color: string | undefined, fallback: string): string {
  const match = color?.trim().match(HEX_COLOR_PATTERN);
  if (!match?.[1]) {
    return fallback;
  }

  return `#${match[1].toLowerCase()}`;
}

function hexChannelToNumber(color: string, startIndex: number): number {
  return Number.parseInt(color.slice(startIndex, startIndex + 2), 16);
}

function numberToHexChannel(value: number): string {
  return Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, '0');
}

export function blendHexColorWithBlack(color: string | undefined, opacity = FULL_OPACITY): string {
  const normalized = normalizeHexColor(color, '#000000');
  const alpha = clamp(opacity, 0, 1);
  const red = hexChannelToNumber(normalized, 1) * alpha;
  const green = hexChannelToNumber(normalized, 3) * alpha;
  const blue = hexChannelToNumber(normalized, 5) * alpha;

  return `#${numberToHexChannel(red)}${numberToHexChannel(green)}${numberToHexChannel(blue)}`;
}

export function resolveGradientLine(width: number, height: number, angle: number): GradientLine {
  const safeWidth = Math.max(2, Math.round(width));
  const safeHeight = Math.max(2, Math.round(height));
  const radians = (clamp(angle, 0, 360) * Math.PI) / 180;
  const deltaX = Math.sin(radians);
  const deltaY = -Math.cos(radians);
  const centerX = safeWidth / 2;
  const centerY = safeHeight / 2;
  const halfDiagonal = Math.hypot(safeWidth, safeHeight) / 2;

  return {
    x0: Math.round(clamp(centerX - deltaX * halfDiagonal, 0, safeWidth)),
    y0: Math.round(clamp(centerY - deltaY * halfDiagonal, 0, safeHeight)),
    x1: Math.round(clamp(centerX + deltaX * halfDiagonal, 0, safeWidth)),
    y1: Math.round(clamp(centerY + deltaY * halfDiagonal, 0, safeHeight)),
  };
}

function getLayerStartMs(clip: ModernBackgroundVisualClip): number {
  return Math.max(0, clip.timelineStartMs ?? 0);
}

function getLayerEndMs(clip: ModernBackgroundVisualClip): number {
  const fallbackDurationMs = Math.max(
    MIN_LAYER_DURATION_MS,
    (clip.endTime - clip.startTime) * MS_PER_SECOND,
  );
  return Math.max(
    getLayerStartMs(clip) + MIN_LAYER_DURATION_MS,
    clip.timelineEndMs ?? fallbackDurationMs,
  );
}

function getLayerDurationMs(clip: ModernBackgroundVisualClip): number {
  return Math.max(MIN_LAYER_DURATION_MS, getLayerEndMs(clip) - getLayerStartMs(clip));
}

function getBackgroundOpacity(settings: ModernBackgroundSettings): number {
  return clamp(settings.backgroundOpacity ?? FULL_OPACITY, 0, 1);
}

export function buildBackgroundInputSource(
  settings: ModernBackgroundSettings,
  durationSec: string,
): string {
  if (settings.backgroundMode === 'gradient') {
    const opacity = getBackgroundOpacity(settings);
    const from = blendHexColorWithBlack(
      settings.backgroundGradientFrom ?? DEFAULT_GRADIENT_FROM,
      opacity,
    );
    const to = blendHexColorWithBlack(
      settings.backgroundGradientTo ?? DEFAULT_GRADIENT_TO,
      opacity,
    );
    const line = resolveGradientLine(
      settings.width,
      settings.height,
      settings.backgroundGradientAngle ?? DEFAULT_GRADIENT_ANGLE,
    );

    return [
      `gradients=s=${settings.width}x${settings.height}`,
      `r=${settings.fps}`,
      `c0=${toFFmpegColor(from, 'black')}`,
      `c1=${toFFmpegColor(to, 'black')}`,
      'nb_colors=2',
      `x0=${line.x0}`,
      `y0=${line.y0}`,
      `x1=${line.x1}`,
      `y1=${line.y1}`,
      `d=${durationSec}`,
      'speed=0',
      'type=linear',
    ].join(':');
  }

  const backgroundColor =
    settings.backgroundMode === 'solid'
      ? blendHexColorWithBlack(settings.backgroundColor, getBackgroundOpacity(settings))
      : settings.backgroundMode === 'image'
        ? normalizeHexColor(settings.backgroundColor, '#000000')
        : '#000000';

  return `color=c=${toFFmpegColor(backgroundColor, 'black')}:s=${settings.width}x${settings.height}:r=${settings.fps}:d=${durationSec}`;
}

export function buildBackgroundBaseFilters({
  backgroundImageInputIndex,
  settings,
  visualClips,
}: {
  backgroundImageInputIndex?: number;
  settings: ModernBackgroundSettings;
  visualClips: readonly ModernBackgroundVisualClip[];
}): BackgroundBaseResult {
  const filters = ['[0:v]format=rgba[base0]'];

  if (settings.backgroundMode === 'image' && backgroundImageInputIndex !== undefined) {
    const fit = settings.backgroundImageFit ?? 'cover';
    const blurAmount = clamp(settings.backgroundImageBlurAmount ?? 0, 0, 40);
    const dim = clamp(settings.backgroundImageDim ?? 0, 0, 0.6);
    const opacity = getBackgroundOpacity(settings);
    const positionX = clamp(settings.backgroundImagePositionX ?? 50, 0, 100) / 100;
    const positionY = clamp(settings.backgroundImagePositionY ?? 50, 0, 100) / 100;
    const scale = clamp(settings.backgroundImageScale ?? 1, 1, 2);
    const targetWidth = Math.max(2, Math.round(settings.width * scale));
    const targetHeight = Math.max(2, Math.round(settings.height * scale));
    const imageFilters = [
      `[${backgroundImageInputIndex}:v]setpts=PTS-STARTPTS`,
      `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=${
        fit === 'cover' ? 'increase' : 'decrease'
      }`,
    ];

    if (fit === 'cover') {
      imageFilters.push(
        `crop=${settings.width}:${settings.height}:(in_w-${settings.width})*${positionX.toFixed(
          2,
        )}:(in_h-${settings.height})*${positionY.toFixed(2)}`,
      );
    } else {
      imageFilters.push(
        `crop='min(iw,${settings.width})':'min(ih,${settings.height})':(in_w-out_w)*${positionX.toFixed(
          2,
        )}:(in_h-out_h)*${positionY.toFixed(2)}`,
        `pad=${settings.width}:${settings.height}:(ow-iw)*${positionX.toFixed(
          2,
        )}:(oh-ih)*${positionY.toFixed(2)}:color=black@0`,
      );
    }

    if (blurAmount > 0) {
      imageFilters.push(`gblur=sigma=${blurAmount}`);
    }
    if (dim > 0) {
      imageFilters.push(`drawbox=color=black@${dim}:t=fill`);
    }
    imageFilters.push('format=rgba');
    if (opacity < 1) {
      imageFilters.push(`colorchannelmixer=aa=${opacity}`);
    }

    filters.push(`${imageFilters.join(',')}[imageBg]`);
    filters.push('[base0][imageBg]overlay=0:0[baseImage]');
    return { label: 'baseImage', filters };
  }

  if (settings.backgroundMode !== 'blur') {
    return { label: 'base0', filters };
  }

  const blurAmount = clamp(settings.backgroundBlurAmount ?? 18, 0, 50);
  const blurZoom = clamp(settings.backgroundBlurZoom ?? 1.08, 1, 1.5);
  const dim = clamp(settings.backgroundDim ?? 0.08, 0, 0.6);
  const saturation = clamp(settings.backgroundSaturation ?? 1.05, 0, 2);
  const opacity = getBackgroundOpacity(settings);
  const alphaFilter = opacity < 1 ? `,colorchannelmixer=aa=${opacity}` : '';
  const backgroundWidth = Math.max(2, Math.round(settings.width * blurZoom));
  const backgroundHeight = Math.max(2, Math.round(settings.height * blurZoom));
  let currentLabel = 'base0';

  [...visualClips]
    .sort((left, right) => (right.zIndex ?? 0) - (left.zIndex ?? 0))
    .forEach((clip, index) => {
      const source =
        clip.mediaType === 'image' || clip.loop
          ? `[${clip.inputIndex}:v]trim=duration=${formatSeconds(
              getLayerDurationMs(clip) / MS_PER_SECOND,
            )}`
          : `[${clip.inputIndex}:v]trim=start=${formatSeconds(clip.startTime)}:end=${formatSeconds(
              clip.endTime,
            )}`;
      const bgLabel = `blurBg${index}`;
      const nextLabel = `baseBlur${index}`;
      const startSec = formatSeconds(getLayerStartMs(clip) / MS_PER_SECOND);
      const endSec = formatSeconds(getLayerEndMs(clip) / MS_PER_SECOND);

      filters.push(
        `${source},setpts=PTS-STARTPTS+${startSec}/TB,scale=${backgroundWidth}:${backgroundHeight}:force_original_aspect_ratio=increase,crop=${settings.width}:${settings.height},gblur=sigma=${blurAmount},eq=brightness=${-dim}:saturation=${saturation},format=rgba${alphaFilter}[${bgLabel}]`,
      );
      filters.push(
        `[${currentLabel}][${bgLabel}]overlay=0:0:enable='between(t\\,${startSec}\\,${endSec})'[${nextLabel}]`,
      );
      currentLabel = nextLabel;
    });

  return { label: currentLabel, filters };
}
