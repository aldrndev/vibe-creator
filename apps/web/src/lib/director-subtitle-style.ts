import type { ContentMode } from '@/lib/director-refine-settings';

type ResolvedContentMode = Exclude<ContentMode, 'auto'>;
type SubtitlePosition = 'top' | 'center' | 'bottom';
type SubtitleAnimation = 'none' | 'fade' | 'typewriter' | 'word' | 'pop-word' | 'phrase' | 'line';
type ExportAspectRatio = '9:16' | '16:9' | '1:1';
export type SubtitleFontSizePreset = 'small' | 'medium' | 'large';

export interface SubtitleFontSizeContext {
  mode?: ContentMode | ResolvedContentMode | null;
  position?: SubtitlePosition | null;
  animation?: SubtitleAnimation | string | null;
  quality?: '720p' | '1080p' | null;
  aspectRatio?: ExportAspectRatio | null;
}

export const DIRECTOR_SUBTITLE_FONT_SIZE_MIN = 16;
export const DIRECTOR_SUBTITLE_FONT_SIZE_MAX = 72;
export const DIRECTOR_SUBTITLE_DEFAULT_FONT_SIZE_MAX = 64;
const DIRECTOR_SUBTITLE_MAX_RENDER_HEIGHT_RATIO = 0.06;
const SUBTITLE_AVERAGE_CHAR_WIDTH_RATIO = 0.55;
const WORD_PRESET_BASELINE_CHARS = 18;
const LONG_PRESET_BASELINE_CHARS = 20;

const subtitleFontSizeMaxByContentMode: Record<ResolvedContentMode, number> = {
  podcast: 64,
  interview: 60,
  'talking-head': 72,
  'product-review': 72,
  cinematic: 56,
  general: 72,
};

const subtitleFontSizeMaxByPosition: Record<SubtitlePosition, number> = {
  top: 64,
  center: 72,
  bottom: 72,
};

/**
 * Word-by-word animation font size max, keyed by aspect ratio.
 * The constraining factor for word mode is frame WIDTH — a single long word
 * (e.g. "menghasilkan" = 12 chars) must fit without clipping.
 *
 * ffmpeg SRT force_style FontSize is in ASS script points.
 * At the default ASS PlayResY ≈ script height, a FontSize of N renders at
 * roughly N / PlayResY * videoHeight pixels.  For portrait 9:16 the available
 * width is only 1080 px (at 1080p), so we need aggressive limits.
 */
const wordAnimationMaxByAspectRatio: Record<ExportAspectRatio, number> = {
  '9:16': 72,
  '1:1': 80,
  '16:9': 96,
};

const typewriterAnimationMaxByAspectRatio: Record<ExportAspectRatio, number> = {
  '9:16': 64,
  '1:1': 72,
  '16:9': 90,
};

const subtitleWordPresetTargetWidthRatio: Record<SubtitleFontSizePreset, number> = {
  small: 0.3,
  medium: 0.5,
  large: 0.65,
};

const subtitleLongPresetTargetWidthRatio: Record<SubtitleFontSizePreset, number> = {
  small: 0.25,
  medium: 0.35,
  large: 0.5,
};

function resolveAnimationFontSizeMax(
  animation: SubtitleAnimation | string | null | undefined,
  aspectRatio: ExportAspectRatio,
): number {
  if (animation === 'word' || animation === 'pop-word') {
    return wordAnimationMaxByAspectRatio[aspectRatio];
  }

  if (animation === 'typewriter') {
    return typewriterAnimationMaxByAspectRatio[aspectRatio];
  }

  return DIRECTOR_SUBTITLE_FONT_SIZE_MAX;
}

function resolveRenderHeight(
  quality: NonNullable<SubtitleFontSizeContext['quality']>,
  aspectRatio: NonNullable<SubtitleFontSizeContext['aspectRatio']>,
): number {
  if (quality === '720p') {
    if (aspectRatio === '9:16') {
      return 1280;
    }

    return 720;
  }

  if (aspectRatio === '9:16') {
    return 1920;
  }

  return 1080;
}

function resolveRenderWidth(
  quality: NonNullable<SubtitleFontSizeContext['quality']>,
  aspectRatio: NonNullable<SubtitleFontSizeContext['aspectRatio']>,
): number {
  if (quality === '720p') {
    if (aspectRatio === '16:9') {
      return 1280;
    }

    return 720;
  }

  if (aspectRatio === '16:9') {
    return 1920;
  }

  return 1080;
}

export function resolveSubtitleFontSizeMax(context: SubtitleFontSizeContext = {}): number {
  const { mode, position, animation, quality, aspectRatio } = context;

  const safeAspectRatio: ExportAspectRatio = aspectRatio ?? '9:16';

  const modeMax =
    !mode || mode === 'auto'
      ? DIRECTOR_SUBTITLE_DEFAULT_FONT_SIZE_MAX
      : subtitleFontSizeMaxByContentMode[mode];
  const positionMax = position
    ? subtitleFontSizeMaxByPosition[position]
    : DIRECTOR_SUBTITLE_DEFAULT_FONT_SIZE_MAX;
  const animationMax = resolveAnimationFontSizeMax(animation, safeAspectRatio);
  const renderHeight = resolveRenderHeight(quality === '720p' ? '720p' : '1080p', safeAspectRatio);
  const resolutionMax = Math.max(
    DIRECTOR_SUBTITLE_FONT_SIZE_MIN,
    Math.round(renderHeight * DIRECTOR_SUBTITLE_MAX_RENDER_HEIGHT_RATIO),
  );

  return Math.min(
    DIRECTOR_SUBTITLE_FONT_SIZE_MAX,
    modeMax,
    positionMax,
    animationMax,
    resolutionMax,
  );
}

export function clampSubtitleFontSize(
  fontSize: number,
  context: SubtitleFontSizeContext = {},
): number {
  const maxSize = resolveSubtitleFontSizeMax(context);
  return Math.max(DIRECTOR_SUBTITLE_FONT_SIZE_MIN, Math.min(Math.round(fontSize), maxSize));
}

export function resolveSubtitleRenderFontSize(
  fontSize: number,
  context: SubtitleFontSizeContext = {},
): number {
  const baselineContext = {
    ...context,
    quality: '1080p' as const,
    aspectRatio: '9:16' as const,
  };
  const maxFontSizeDesktop = resolveSubtitleFontSizeMax(baselineContext);
  const normalizedFontSize = Math.round(fontSize);
  const baseFontSize = Math.max(
    DIRECTOR_SUBTITLE_FONT_SIZE_MIN,
    Math.min(normalizedFontSize, maxFontSizeDesktop),
  );

  const safeAspectRatio: ExportAspectRatio = context.aspectRatio ?? '9:16';
  const safeQuality: NonNullable<SubtitleFontSizeContext['quality']> =
    context.quality === '720p' ? '720p' : '1080p';
  const renderHeight = resolveRenderHeight(safeQuality, safeAspectRatio);
  const scaledFontSize = Math.round(baseFontSize * (renderHeight / 1920));
  return Math.max(DIRECTOR_SUBTITLE_FONT_SIZE_MIN, scaledFontSize);
}

export function resolveSubtitleFontSizePresetValue(
  preset: SubtitleFontSizePreset,
  context: SubtitleFontSizeContext = {},
): number {
  const safeAspectRatio: ExportAspectRatio = context.aspectRatio ?? '9:16';
  const safeQuality: NonNullable<SubtitleFontSizeContext['quality']> =
    context.quality === '720p' ? '720p' : '1080p';
  const frameWidth = resolveRenderWidth(safeQuality, safeAspectRatio);
  const isWordStyle = context.animation === 'word' || context.animation === 'pop-word';
  const targetWidthRatio = isWordStyle
    ? subtitleWordPresetTargetWidthRatio[preset]
    : subtitleLongPresetTargetWidthRatio[preset];
  const baselineChars = isWordStyle ? WORD_PRESET_BASELINE_CHARS : LONG_PRESET_BASELINE_CHARS;
  const estimatedFontSize =
    (frameWidth * targetWidthRatio) / (baselineChars * SUBTITLE_AVERAGE_CHAR_WIDTH_RATIO);

  return clampSubtitleFontSize(estimatedFontSize, context);
}

export function resolveSubtitleFontSizePreset(
  fontSize: number,
  context: SubtitleFontSizeContext = {},
): SubtitleFontSizePreset {
  const normalizedFontSize = clampSubtitleFontSize(fontSize, context);
  const presetValues = (
    ['small', 'medium', 'large'] as const satisfies readonly SubtitleFontSizePreset[]
  ).map((preset) => ({
    preset,
    fontSize: resolveSubtitleFontSizePresetValue(preset, context),
  }));

  let nearestPreset: SubtitleFontSizePreset = 'small';
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const presetValue of presetValues) {
    const distance = Math.abs(presetValue.fontSize - normalizedFontSize);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPreset = presetValue.preset;
    }
  }

  return nearestPreset;
}

export function resolveSubtitleFontSizeMaxByContentMode(
  mode: ContentMode | ResolvedContentMode | null | undefined,
): number {
  if (!mode || mode === 'auto') {
    return DIRECTOR_SUBTITLE_DEFAULT_FONT_SIZE_MAX;
  }

  return subtitleFontSizeMaxByContentMode[mode];
}

/**
 * @deprecated Use {@link clampSubtitleFontSize} with full context instead.
 * This helper only considers content mode and ignores resolution, animation, and position constraints.
 */
export function clampSubtitleFontSizeByContentMode(
  fontSize: number,
  mode: ContentMode | ResolvedContentMode | null | undefined,
): number {
  const maxSize = resolveSubtitleFontSizeMaxByContentMode(mode);
  return Math.max(DIRECTOR_SUBTITLE_FONT_SIZE_MIN, Math.min(Math.round(fontSize), maxSize));
}
