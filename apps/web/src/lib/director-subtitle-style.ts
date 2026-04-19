import type { ContentMode } from '@/lib/director-refine-settings';

type ResolvedContentMode = Exclude<ContentMode, 'auto'>;
type SubtitlePosition =
  | 'top'
  | 'center'
  | 'bottom'
  | 'cinema-bottom'
  | 'safe-bottom'
  | 'lower-third';
type SubtitleAnimation = 'none' | 'fade' | 'typewriter' | 'word' | 'phrase' | 'line';
type ExportAspectRatio = '9:16' | '16:9' | '1:1';
interface SubtitleFontSizeContext {
  mode?: ContentMode | ResolvedContentMode | null;
  position?: SubtitlePosition | null;
  animation?: SubtitleAnimation | string | null;
  quality?: '720p' | '1080p' | null;
  aspectRatio?: ExportAspectRatio | null;
}

export const DIRECTOR_SUBTITLE_FONT_SIZE_MIN = 16;
export const DIRECTOR_SUBTITLE_FONT_SIZE_MAX = 72;
export const DIRECTOR_SUBTITLE_DEFAULT_FONT_SIZE_MAX = 56;
const DIRECTOR_SUBTITLE_MAX_RENDER_HEIGHT_RATIO = 0.06;

const subtitleFontSizeMaxByContentMode: Record<ResolvedContentMode, number> = {
  podcast: 56,
  interview: 52,
  'talking-head': 64,
  'product-review': 64,
  cinematic: 44,
  general: 56,
};

const subtitleFontSizeMaxByPosition: Record<SubtitlePosition, number> = {
  top: 52,
  center: 56,
  bottom: 64,
  'cinema-bottom': 46,
  'safe-bottom': 54,
  'lower-third': 50,
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
  '9:16': 28,
  '1:1': 34,
  '16:9': 44,
};

const typewriterAnimationMaxByAspectRatio: Record<ExportAspectRatio, number> = {
  '9:16': 40,
  '1:1': 46,
  '16:9': 52,
};

function resolveAnimationFontSizeMax(
  animation: SubtitleAnimation | string | null | undefined,
  aspectRatio: ExportAspectRatio,
): number {
  if (animation === 'word') {
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
