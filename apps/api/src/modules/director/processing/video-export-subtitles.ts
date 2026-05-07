import { mapSubtitleFontToken } from '@/modules/director/subtitle-style-tokens';
import type { SubtitleSegment, SubtitleWord } from '@/modules/transcribe/transcribe-normalizer';
import { hasCompleteWordTextCoverage } from '@/modules/transcribe/transcript-word-coverage';

export type SubtitleContentMode =
  | 'auto'
  | 'podcast'
  | 'interview'
  | 'talking-head'
  | 'product-review'
  | 'cinematic'
  | 'general';
type SubtitlePosition = 'top' | 'center' | 'bottom';
type SubtitleStylePreset =
  | 'custom'
  | 'viral-pop'
  | 'meme-pop'
  | 'podcast-duo'
  | 'clean-bold'
  | 'neon-glow'
  | 'creator-box'
  | 'cinema';
type SubtitleSpeakerMode = 'single' | 'speaker-colors';
type ExportAspectRatio = '9:16' | '16:9' | '1:1';
type ExportQuality = '720p' | '1080p';

export interface SubtitleSpeakerStyle {
  speaker: string;
  label: string;
  textColorToken: string;
  bgColorToken?: string;
}

export interface SubtitleStyleOptions {
  stylePreset?: SubtitleStylePreset | string;
  fontToken?: string;
  textColorToken?: string;
  bgColorToken?: string;
  fontSize?: number;
  position?: SubtitlePosition;
  animation?: string;
  speakerMode?: SubtitleSpeakerMode | string;
  speakerStyles?: unknown;
  contentMode?: SubtitleContentMode;
  aspectRatio?: ExportAspectRatio;
  quality?: ExportQuality;
}

export interface SubtitleAsset {
  extension: 'srt' | 'ass';
  content: string;
  useForceStyle: boolean;
}

const MAX_SUBTITLE_CHARS_PER_CUE_BASE = 48;
const TARGET_SUBTITLE_LINE_LENGTH_BASE = 22;
const MIN_SUBTITLE_CUE_DURATION_MS = 700;
const SUBTITLE_HOLD_MS = 220;
const SUBTITLE_HOLD_CLEARANCE_MS = 60;
const TURN_GROUP_MAX_GAP_MS = 380;
const TURN_GROUP_MIN_NEGATIVE_GAP_MS = -120;
const TURN_GROUP_MAX_DURATION_MS = 7_200;
const TURN_GROUP_MAX_CHARS = 120;
const TURN_GROUP_MAX_WORDS = 24;
const TURN_GROUP_PUNCTUATION_BREAK_GAP_MS = 280;
const MIN_SYNTHETIC_WORD_DURATION_MS = 90;
const POP_WORD_SCALE_PERCENT = 118;
const POP_WORD_FONT_SCALE = 1.22;
const POP_WORD_IN_MS = 90;
const POP_WORD_SETTLE_MS = 220;
const POP_KARAOKE_LINE_WIDTH_RATIO = 0.8;
const POP_WORD_OUTLINE = 4;
const POP_KARAOKE_BASE_OUTLINE = 3;
const MEME_POP_OUTLINE = 6;
const POP_WORD_SHADOW = 2;
const MEME_POP_SHADOW = 0;
const MAX_SPEAKER_STYLE_COUNT = 8;
const SUBTITLE_SAFE_WIDTH_RATIO = 0.9;
const SUBTITLE_AVERAGE_GLYPH_WIDTH_RATIO = 0.66;
const SUBTITLE_HORIZONTAL_MARGIN_RATIO = 0.05;
const ASS_HARD_LINE_LENGTH_MAX = 72;
const subtitleLineLengthMaxByAspectRatio: Record<ExportAspectRatio, number> = {
  '9:16': 44,
  '1:1': 56,
  '16:9': 72,
};
export const DIRECTOR_SUBTITLE_FONT_SIZE_MIN = 16;
export const DIRECTOR_SUBTITLE_FONT_SIZE_MAX = 72;
const DEFAULT_SUBTITLE_FONT_SIZE_MAX = 64;
const DIRECTOR_SUBTITLE_MAX_RENDER_HEIGHT_RATIO = 0.06;

/** Base render height used for proportional MarginV scaling. */
const MARGIN_V_BASE_HEIGHT = 1920;

const subtitleFontSizeMaxByContentMode: Record<Exclude<SubtitleContentMode, 'auto'>, number> = {
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
 * The constraining factor for word mode is frame WIDTH, not height.
 * Portrait 9:16 has only 1080px width (at 1080p), so limits must be aggressive.
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

function resolveAnimationFontSizeMax(
  animation: string | undefined,
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

function isSubtitlePosition(value: string | undefined): value is SubtitlePosition {
  return value === 'top' || value === 'center' || value === 'bottom';
}

const TOP_TARGET_RATIO = 0.3;
const CENTER_TARGET_RATIO = 0.5;
const BOTTOM_TARGET_RATIO = 0.7;
const TOP_SAFE_RATIO = 0.06;
const BOTTOM_SAFE_RATIO = 0.1;
const PORTRAIT_BOTTOM_SAFE_RATIO = 0.18;
const SUBTITLE_LINE_HEIGHT_RATIO = 1.22;
const DEFAULT_SUBTITLE_LINE_COUNT = 2;

function resolveRenderHeight(
  quality: ExportQuality = '1080p',
  aspectRatio: ExportAspectRatio = '9:16',
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
  quality: ExportQuality = '1080p',
  aspectRatio: ExportAspectRatio = '9:16',
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

function resolveHorizontalMargin(
  quality: ExportQuality | undefined,
  aspectRatio: ExportAspectRatio | undefined,
): number {
  const frameWidth = resolveRenderWidth(quality, aspectRatio);
  return Math.max(24, Math.round(frameWidth * SUBTITLE_HORIZONTAL_MARGIN_RATIO));
}

function resolveSubtitleLineLength(
  fontSize: number,
  quality?: ExportQuality,
  aspectRatio?: ExportAspectRatio,
): number {
  const safeAspectRatio = aspectRatio ?? '9:16';
  const frameWidth = resolveRenderWidth(quality, aspectRatio);
  const availableWidth = frameWidth * SUBTITLE_SAFE_WIDTH_RATIO;
  const averageCharWidth = fontSize * SUBTITLE_AVERAGE_GLYPH_WIDTH_RATIO;
  const maxChars = Math.floor(availableWidth / averageCharWidth);
  return Math.max(14, Math.min(subtitleLineLengthMaxByAspectRatio[safeAspectRatio], maxChars));
}

function normalizeAssLineLength(lineLength: number): number {
  if (!Number.isFinite(lineLength)) {
    return TARGET_SUBTITLE_LINE_LENGTH_BASE;
  }

  return Math.max(14, Math.min(ASS_HARD_LINE_LENGTH_MAX, Math.floor(lineLength)));
}

function resolveMaxCharsPerCue(
  fontSize: number,
  quality?: ExportQuality,
  aspectRatio?: ExportAspectRatio,
): number {
  const lineLength = resolveSubtitleLineLength(fontSize, quality, aspectRatio);
  // Allow up to ~2 full lines per cue maximum, capped to prevent reading fatigue
  return Math.max(24, Math.min(84, Math.floor(lineLength * 2)));
}

export function resolveSubtitleFontSizeMaxByContentMode(contentMode?: SubtitleContentMode): number {
  if (!contentMode || contentMode === 'auto') {
    return DEFAULT_SUBTITLE_FONT_SIZE_MAX;
  }

  return subtitleFontSizeMaxByContentMode[contentMode];
}

export function resolveSubtitleFontSizeMax(
  style?: Pick<
    SubtitleStyleOptions,
    'contentMode' | 'position' | 'animation' | 'quality' | 'aspectRatio'
  >,
): number {
  const safeAspectRatio: ExportAspectRatio = (style?.aspectRatio as ExportAspectRatio) ?? '9:16';

  const modeMax = resolveSubtitleFontSizeMaxByContentMode(style?.contentMode);
  const positionMax = isSubtitlePosition(style?.position)
    ? subtitleFontSizeMaxByPosition[style.position]
    : DEFAULT_SUBTITLE_FONT_SIZE_MAX;
  const animationMax = resolveAnimationFontSizeMax(style?.animation, safeAspectRatio);
  const renderHeight = resolveRenderHeight(style?.quality, safeAspectRatio);
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

export function resolveSubtitleFontSize(
  fontSize: number | undefined,
  style?: Pick<
    SubtitleStyleOptions,
    'contentMode' | 'position' | 'quality' | 'aspectRatio' | 'animation'
  >,
): number {
  // Always evaluate the maximum limits against the base 1080p 9:16 layout
  // so that frontend user presets map 1:1 visually before applying dynamic resolution scaling.
  const baselineStyle = {
    ...style,
    quality: '1080p' as const,
    aspectRatio: '9:16' as const,
  };

  const maxFontSizeDesktop = resolveSubtitleFontSizeMax(baselineStyle);
  const normalizedFontSize = Math.round(fontSize ?? 24);

  const baseFontSize = Math.max(
    DIRECTOR_SUBTITLE_FONT_SIZE_MIN,
    Math.min(normalizedFontSize, maxFontSizeDesktop),
  );

  const safeAspectRatio = (style?.aspectRatio as ExportAspectRatio) ?? '9:16';
  const renderHeight = resolveRenderHeight(style?.quality, safeAspectRatio);

  // Dynamically scale font size so it takes the exact same visual proportion
  // on 720p/16:9/1:1 as it does on a 1080p 9:16 canvas (base height 1920).
  const scaledFontSize = Math.round(baseFontSize * (renderHeight / MARGIN_V_BASE_HEIGHT));
  return Math.max(DIRECTOR_SUBTITLE_FONT_SIZE_MIN, scaledFontSize);
}

export function normalizeSubtitleSpeakerStyles(value: unknown): SubtitleSpeakerStyle[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const speakerStyles: SubtitleSpeakerStyle[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }

    const speaker =
      'speaker' in item && typeof item.speaker === 'string' ? item.speaker.trim() : '';
    const label = 'label' in item && typeof item.label === 'string' ? item.label.trim() : speaker;
    const textColorToken =
      'textColorToken' in item && typeof item.textColorToken === 'string'
        ? item.textColorToken.trim()
        : '';
    const bgColorToken =
      'bgColorToken' in item && typeof item.bgColorToken === 'string'
        ? item.bgColorToken.trim()
        : undefined;

    if (!speaker || !label || !textColorToken) {
      continue;
    }

    speakerStyles.push({
      speaker,
      label,
      textColorToken,
      ...(bgColorToken ? { bgColorToken } : {}),
    });

    if (speakerStyles.length >= MAX_SPEAKER_STYLE_COUNT) {
      break;
    }
  }

  return speakerStyles;
}

export function escapeSubtitleFilterValue(value: string): string {
  return value
    .replaceAll('\\', String.raw`\\`)
    .replaceAll(':', String.raw`\:`)
    .replaceAll(',', String.raw`\,`)
    .replaceAll(';', String.raw`\;`)
    .replaceAll('[', String.raw`\[`)
    .replaceAll(']', String.raw`\]`)
    .replaceAll("'", String.raw`\'`);
}

export function buildSubtitlesFilter(
  subtitlePath: string,
  style?: SubtitleStyleOptions,
  useForceStyle = true,
): string {
  const escapedPath = escapeSubtitleFilterValue(subtitlePath.replaceAll('\\', '/'));
  if (!useForceStyle) {
    return `subtitles=filename=${escapedPath}`;
  }

  const escapedStyle = escapeSubtitleFilterValue(buildSubtitleForceStyle(style));
  return `subtitles=filename=${escapedPath}:force_style=${escapedStyle}`;
}

export function isMissingSubtitlesFilterError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("No such filter: 'subtitles'") ||
    error.message.includes('Filter not found')
  );
}

export function createSubtitleAsset(
  segments: SubtitleSegment[],
  style?: SubtitleStyleOptions,
): SubtitleAsset {
  const displaySegments = resolveSubtitleDisplaySegments(segments, style);

  if (shouldUsePopWord(style, displaySegments)) {
    return {
      extension: 'ass',
      content: generatePopWordASS(displaySegments, style),
      useForceStyle: false,
    };
  }

  if (shouldUsePopKaraoke(style, displaySegments)) {
    return {
      extension: 'ass',
      content: generatePopKaraokeASS(displaySegments, style),
      useForceStyle: false,
    };
  }

  if (shouldUseWordByWord(style, displaySegments)) {
    return {
      extension: 'ass',
      content: generateASS(buildWordByWordSegments(displaySegments), style, false),
      useForceStyle: false,
    };
  }

  if (shouldUseWordHighlight(style, displaySegments)) {
    return {
      extension: 'ass',
      content: generateASS(displaySegments, style, true),
      useForceStyle: false,
    };
  }

  return {
    extension: 'ass',
    content: generateASS(displaySegments, style, false),
    useForceStyle: false,
  };
}

function shouldUseWordByWord(
  style: SubtitleStyleOptions | undefined,
  segments: SubtitleSegment[],
): boolean {
  return style?.animation === 'word' && segments.some((segment) => segment.text.trim().length > 0);
}

function shouldUsePopStylePreset(style: SubtitleStyleOptions | undefined): boolean {
  if (style?.stylePreset === 'viral-pop' || style?.stylePreset === 'meme-pop') {
    return true;
  }

  if (style?.stylePreset && style.stylePreset !== 'custom') {
    return false;
  }

  return (
    style?.position === 'center' &&
    style.bgColorToken === 'BG_TRANSPARENT' &&
    (style.textColorToken === 'C_GREEN' ||
      style.textColorToken === 'C_YELLOW' ||
      style.textColorToken === 'C_ORANGE') &&
    (style.animation === 'typewriter' ||
      style.animation === 'word' ||
      style.animation === 'pop-word')
  );
}

function shouldUsePopWord(
  style: SubtitleStyleOptions | undefined,
  segments: SubtitleSegment[],
): boolean {
  return (
    (style?.animation === 'pop-word' ||
      (shouldUsePopStylePreset(style) && style?.animation === 'word')) &&
    segments.some((segment) => segment.text.trim().length > 0)
  );
}

function shouldUsePopKaraoke(
  style: SubtitleStyleOptions | undefined,
  segments: SubtitleSegment[],
): boolean {
  return (
    shouldUsePopStylePreset(style) &&
    style?.animation === 'typewriter' &&
    segments.some((segment) => segment.text.trim().length > 0)
  );
}

function buildWordByWordSegments(segments: SubtitleSegment[]): SubtitleSegment[] {
  return segments.flatMap((segment) =>
    resolveKaraokeWords(segment).map((word) => ({
      startMs: word.startMs,
      endMs: word.endMs,
      text: normalizeCueText(word.text),
      speaker: word.speaker ?? segment.speaker,
    })),
  );
}

export function shouldUseWordHighlight(
  style: SubtitleStyleOptions | undefined,
  segments: SubtitleSegment[],
): boolean {
  return (
    style?.animation === 'typewriter' && segments.some((segment) => segment.text.trim().length > 0)
  );
}

function normalizeCueText(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim();
}

function isMemePopStyle(style?: SubtitleStyleOptions): boolean {
  return style?.stylePreset === 'meme-pop' || style?.fontToken === 'F_MEME';
}

function formatStyledCueText(text: string, style?: SubtitleStyleOptions): string {
  const normalizedText = normalizeCueText(text);
  return isMemePopStyle(style) ? normalizedText.toUpperCase() : normalizedText;
}

function formatStyledWrappedCueText(text: string, style?: SubtitleStyleOptions): string {
  return text
    .split('\n')
    .map((line) => formatStyledCueText(line, style))
    .filter(Boolean)
    .join('\n');
}

function resolveSpeakerSubtitleStyle(
  style: SubtitleStyleOptions | undefined,
  speaker: string | undefined,
): SubtitleStyleOptions | undefined {
  if (!style || style.speakerMode !== 'speaker-colors' || !speaker) {
    return style;
  }

  const speakerStyle = normalizeSubtitleSpeakerStyles(style.speakerStyles).find(
    (candidate) => candidate.speaker === speaker,
  );
  if (!speakerStyle) {
    return style;
  }

  return {
    ...style,
    textColorToken: speakerStyle.textColorToken,
    bgColorToken: speakerStyle.bgColorToken ?? style.bgColorToken,
  };
}

function countWords(text: string): number {
  return normalizeCueText(text).split(' ').filter(Boolean).length;
}

function endsStrongSentence(text: string): boolean {
  return /[.!?…]$/.test(text.trim());
}

function startsLikelySentence(text: string): boolean {
  return /^(?:["'“([]+)?[A-Z][a-z]/.test(text.trim());
}

function shouldUseSpeakerTurnGrouping(style?: SubtitleStyleOptions): boolean {
  return style?.animation === 'phrase' || style?.animation === 'line';
}

function shouldMergeIntoSpeakerTurn(current: SubtitleSegment, next: SubtitleSegment): boolean {
  if (current.speaker && next.speaker && current.speaker !== next.speaker) {
    return false;
  }

  const gapMs = next.startMs - current.endMs;
  if (gapMs > TURN_GROUP_MAX_GAP_MS || gapMs < TURN_GROUP_MIN_NEGATIVE_GAP_MS) {
    return false;
  }

  const mergedDurationMs = Math.max(current.endMs, next.endMs) - current.startMs;
  if (mergedDurationMs > TURN_GROUP_MAX_DURATION_MS) {
    return false;
  }

  const mergedText = normalizeCueText(`${current.text} ${next.text}`);
  if (mergedText.length > TURN_GROUP_MAX_CHARS || countWords(mergedText) > TURN_GROUP_MAX_WORDS) {
    return false;
  }

  if (
    endsStrongSentence(current.text) &&
    startsLikelySentence(next.text) &&
    gapMs >= TURN_GROUP_PUNCTUATION_BREAK_GAP_MS
  ) {
    return false;
  }

  return true;
}

export function buildSpeakerTurnSubtitleSegments(segments: SubtitleSegment[]): SubtitleSegment[] {
  if (segments.length <= 1) {
    return segments;
  }

  const grouped: SubtitleSegment[] = [];
  let current: SubtitleSegment | null = null;

  for (const rawSegment of segments) {
    if (rawSegment.endMs <= rawSegment.startMs) {
      continue;
    }

    const segment: SubtitleSegment = {
      ...rawSegment,
      text: normalizeCueText(rawSegment.text),
      words: rawSegment.words?.map((word) => ({ ...word })),
    };

    if (!current) {
      current = segment;
      continue;
    }

    if (!shouldMergeIntoSpeakerTurn(current, segment)) {
      grouped.push(current);
      current = segment;
      continue;
    }

    current = {
      ...current,
      endMs: Math.max(current.endMs, segment.endMs),
      text: normalizeCueText(`${current.text} ${segment.text}`),
      words: [...(current.words ?? []), ...(segment.words ?? [])].sort(
        (left, right) => left.startMs - right.startMs,
      ),
    };
  }

  if (current) {
    grouped.push(current);
  }

  return grouped;
}

export function resolveSubtitleDisplaySegments(
  segments: SubtitleSegment[],
  style?: SubtitleStyleOptions,
): SubtitleSegment[] {
  const sanitized = segments
    .filter((segment) => segment.endMs > segment.startMs && segment.text.trim().length > 0)
    .map((segment) => ({
      ...segment,
      text: normalizeCueText(segment.text),
      words: segment.words?.map((word) => ({ ...word })),
    }));

  if (!shouldUseSpeakerTurnGrouping(style)) {
    return sanitized;
  }

  return buildSpeakerTurnSubtitleSegments(sanitized);
}

export function generateSRT(segments: SubtitleSegment[], style?: SubtitleStyleOptions): string {
  const fontSize = resolveSubtitleFontSize(style?.fontSize, style);
  const lineLength = resolveSubtitleLineLength(fontSize, style?.quality, style?.aspectRatio);
  const maxChars = resolveMaxCharsPerCue(fontSize, style?.quality, style?.aspectRatio);

  return segmentSubtitlesForSrt(segments, maxChars)
    .map((segment, index) => {
      const start = formatSRTTime(segment.startMs);
      const end = formatSRTTime(segment.endMs);
      return `${index + 1}\n${start} --> ${end}\n${wrapSubtitleText(segment.text, lineLength)}\n`;
    })
    .join('\n');
}

export function generateASS(
  segments: SubtitleSegment[],
  style?: SubtitleStyleOptions,
  useKaraoke = true,
): string {
  const fontSize = resolveSubtitleFontSize(style?.fontSize, style);
  const lineLength = resolveSubtitleLineLength(fontSize, style?.quality, style?.aspectRatio);

  // Keep karaoke timing strictly aligned with transcript word timestamps.
  const assSegments = segmentSubtitlesForAss(segments, lineLength);
  const styleLine = buildAssStyleLine(style);
  const playResolution = resolveAssPlayResolution(style);

  const events = assSegments
    .map((segment) => {
      const start = formatAssTime(segment.startMs);
      const end = formatAssTime(segment.endMs);
      const segmentStyle = resolveSpeakerSubtitleStyle(style, segment.speaker);
      const text = useKaraoke
        ? buildKaraokeText(segment, lineLength, segmentStyle)
        : buildStaticAssText(segment.text, segmentStyle);
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    })
    .join('\n');

  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${playResolution.width}`,
    `PlayResY: ${playResolution.height}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
    styleLine,
    '',
    '[Events]',
    'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text',
    events,
  ].join('\n');
}

export function generatePopWordASS(
  segments: SubtitleSegment[],
  style?: SubtitleStyleOptions,
): string {
  const styleLine = buildAssStyleLine(style);
  const playResolution = resolveAssPlayResolution(style);
  const events = buildPopWordEvents(segments, style).join('\n');

  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${playResolution.width}`,
    `PlayResY: ${playResolution.height}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
    styleLine,
    '',
    '[Events]',
    'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text',
    events,
  ].join('\n');
}

export function generatePopKaraokeASS(
  segments: SubtitleSegment[],
  style?: SubtitleStyleOptions,
): string {
  const styleLine = buildAssStyleLine(style);
  const playResolution = resolveAssPlayResolution(style);
  const events = buildPopKaraokeEvents(segments, style).join('\n');

  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${playResolution.width}`,
    `PlayResY: ${playResolution.height}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
    styleLine,
    '',
    '[Events]',
    'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text',
    events,
  ].join('\n');
}

function buildPopWordEvents(segments: SubtitleSegment[], style?: SubtitleStyleOptions): string[] {
  return segments.flatMap((segment) =>
    resolveKaraokeWords(segment).map((word) => {
      const start = formatAssTime(word.startMs);
      const end = formatAssTime(word.endMs);
      const wordStyle = resolveSpeakerSubtitleStyle(style, word.speaker ?? segment.speaker);
      const text = buildPopWordText(word.text, Math.max(1, word.endMs - word.startMs), wordStyle);
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    }),
  );
}

function buildPopKaraokeEvents(
  segments: SubtitleSegment[],
  style?: SubtitleStyleOptions,
): string[] {
  return segments.flatMap((segment) => {
    const words = resolveKaraokeWords(segment);
    return words.map((word, index) => {
      const nextWord = words[index + 1];
      const start = formatAssTime(word.startMs);
      const end = formatAssTime(nextWord?.startMs ?? segment.endMs);
      const wordStyle = resolveSpeakerSubtitleStyle(style, word.speaker ?? segment.speaker);
      const visibleWords = resolvePopKaraokeVisibleWords(words, index, wordStyle);
      const text = buildPopKaraokeText(visibleWords.words, visibleWords.activeIndex, wordStyle);
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    });
  });
}

function resolvePopKaraokeVisibleWords(
  words: SubtitleWord[],
  activeIndex: number,
  style?: SubtitleStyleOptions,
): {
  words: SubtitleWord[];
  activeIndex: number;
} {
  const activeWord = words[activeIndex];
  if (!activeWord) {
    return { words: [], activeIndex: 0 };
  }

  const activeFontSize = resolvePopWordFontSize(style);
  const lineLength = resolveSubtitleLineLength(activeFontSize, style?.quality, style?.aspectRatio);
  const maxVisibleChars = Math.max(
    10,
    Math.floor(normalizeAssLineLength(lineLength) * POP_KARAOKE_LINE_WIDTH_RATIO),
  );
  const visibleWords: SubtitleWord[] = [activeWord];
  let visibleCharCount = normalizeCueText(activeWord.text).length;

  for (let index = activeIndex - 1; index >= 0; index--) {
    const previousWord = words[index];
    if (!previousWord) {
      continue;
    }

    const previousTextLength = normalizeCueText(previousWord.text).length;
    const nextVisibleCharCount = visibleCharCount + 1 + previousTextLength;
    if (nextVisibleCharCount > maxVisibleChars) {
      break;
    }

    visibleWords.unshift(previousWord);
    visibleCharCount = nextVisibleCharCount;
  }

  return {
    words: visibleWords,
    activeIndex: visibleWords.length - 1,
  };
}

function buildPopWordText(text: string, durationMs: number, style?: SubtitleStyleOptions): string {
  const fontSize = resolvePopWordFontSize(style);
  const highlightColor = formatAssOverrideColor(
    mapTextColorToken(style?.textColorToken, '&H0000FFFF'),
  );
  const outlineColor = formatAssOverrideColor('&H00000000');
  const outline = resolvePopWordOutline(style);
  const shadow = resolvePopShadow(style);
  const popInMs = Math.min(POP_WORD_IN_MS, durationMs);
  const settleMs = Math.min(durationMs, Math.max(popInMs, POP_WORD_SETTLE_MS));
  const escapedText = escapeAssText(formatStyledCueText(text, style));

  return String.raw`{\fs${fontSize}\bord${outline}\shad${shadow}\c${highlightColor}\3c${outlineColor}\fscx100\fscy100\t(0,${popInMs},\fscx${POP_WORD_SCALE_PERCENT}\fscy${POP_WORD_SCALE_PERCENT})\t(${popInMs},${settleMs},\fscx100\fscy100)}${escapedText}`;
}

function buildPopKaraokeText(
  words: SubtitleWord[],
  activeIndex: number,
  style?: SubtitleStyleOptions,
): string {
  const baseFontSize = resolveSubtitleFontSize(style?.fontSize, style);
  const activeFontSize = resolvePopWordFontSize(style);
  const normalColor = formatAssOverrideColor(
    mapTextColorToken(style?.textColorToken, '&H00FFFFFF'),
  );
  const outlineColor = formatAssOverrideColor('&H00000000');
  const baseOutline = resolvePopKaraokeBaseOutline(style);
  const activeOutline = resolvePopWordOutline(style);
  const shadow = resolvePopShadow(style);
  const basePrefix = String.raw`{\fs${baseFontSize}\bord${baseOutline}\shad${shadow}\c${normalColor}\3c${outlineColor}}`;

  return words
    .map((word, index) => {
      const escapedText = escapeAssText(formatStyledCueText(word.text, style));
      if (index !== activeIndex) {
        return `${basePrefix}${escapedText}`;
      }

      return String.raw`{\fs${activeFontSize}\bord${activeOutline}\shad${shadow}\c${normalColor}\3c${outlineColor}\fscx100\fscy100\t(0,${POP_WORD_IN_MS},\fscx${POP_WORD_SCALE_PERCENT}\fscy${POP_WORD_SCALE_PERCENT})\t(${POP_WORD_IN_MS},${POP_WORD_SETTLE_MS},\fscx100\fscy100)}${escapedText}`;
    })
    .join(' ');
}

function resolvePopWordOutline(style?: SubtitleStyleOptions): number {
  return isMemePopStyle(style) ? MEME_POP_OUTLINE : POP_WORD_OUTLINE;
}

function resolvePopKaraokeBaseOutline(style?: SubtitleStyleOptions): number {
  return isMemePopStyle(style) ? MEME_POP_OUTLINE : POP_KARAOKE_BASE_OUTLINE;
}

function resolvePopShadow(style?: SubtitleStyleOptions): number {
  return isMemePopStyle(style) ? MEME_POP_SHADOW : POP_WORD_SHADOW;
}

function resolvePopWordFontSize(style?: SubtitleStyleOptions): number {
  const baseFontSize = resolveSubtitleFontSize(style?.fontSize, style);
  return Math.min(
    DIRECTOR_SUBTITLE_FONT_SIZE_MAX,
    Math.max(DIRECTOR_SUBTITLE_FONT_SIZE_MIN, Math.round(baseFontSize * POP_WORD_FONT_SCALE)),
  );
}

function formatAssOverrideColor(color: string): string {
  return color.endsWith('&') ? color : `${color}&`;
}

interface AssPlayResolution {
  width: number;
  height: number;
}

function resolveAssPlayResolution(
  style?: Pick<SubtitleStyleOptions, 'aspectRatio' | 'quality'>,
): AssPlayResolution {
  const quality = style?.quality === '720p' ? '720p' : '1080p';
  const aspectRatio = style?.aspectRatio ?? '9:16';

  if (quality === '720p') {
    switch (aspectRatio) {
      case '16:9':
        return { width: 1280, height: 720 };
      case '1:1':
        return { width: 720, height: 720 };
      default:
        return { width: 720, height: 1280 };
    }
  }

  switch (aspectRatio) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '1:1':
      return { width: 1080, height: 1080 };
    default:
      return { width: 1080, height: 1920 };
  }
}

export function segmentSubtitlesForSrt(
  segments: SubtitleSegment[],
  maxChars: number = MAX_SUBTITLE_CHARS_PER_CUE_BASE,
): SubtitleSegment[] {
  return segments.flatMap((segment) => splitSubtitleCue(segment, maxChars));
}

export function segmentSubtitlesForAss(
  segments: SubtitleSegment[],
  lineLength: number = TARGET_SUBTITLE_LINE_LENGTH_BASE,
): SubtitleSegment[] {
  const safeLineLength = normalizeAssLineLength(lineLength);
  const maxChars = safeLineLength * DEFAULT_SUBTITLE_LINE_COUNT;
  return segments
    .flatMap((segment) => splitSubtitleCue(segment, maxChars))
    .map((segment) => ({
      ...segment,
      text: wrapSubtitleText(segment.text, safeLineLength),
    }))
    .filter((segment) => segment.text.trim().length > 0);
}

export function applySubtitleHold(segments: SubtitleSegment[]): SubtitleSegment[] {
  return segments.map((segment, index) => {
    const next = segments[index + 1];
    if (!next) {
      return segment;
    }

    const maxEndMs = Math.max(segment.endMs, next.startMs - SUBTITLE_HOLD_CLEARANCE_MS);
    const heldEndMs = Math.min(segment.endMs + SUBTITLE_HOLD_MS, maxEndMs);
    if (heldEndMs <= segment.endMs) {
      return segment;
    }

    return {
      ...segment,
      endMs: heldEndMs,
    };
  });
}

export function splitSubtitleCue(
  segment: SubtitleSegment,
  maxChars: number = MAX_SUBTITLE_CHARS_PER_CUE_BASE,
): SubtitleSegment[] {
  const normalizedText = segment.text.replaceAll(/\s+/g, ' ').trim();
  if (normalizedText.length <= maxChars) {
    return [{ ...segment, text: normalizedText }];
  }

  const words = normalizedText.split(' ').filter(Boolean);
  if (words.length <= 1) {
    return [{ ...segment, text: normalizedText }];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (const word of words) {
    const nextChunk = currentChunk ? `${currentChunk} ${word}` : word;
    if (nextChunk.length > maxChars && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = word;
      continue;
    }

    currentChunk = nextChunk;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  if (chunks.length === 1) {
    return [{ ...segment, text: chunks[0] ?? normalizedText }];
  }

  const durationMs = Math.max(segment.endMs - segment.startMs, MIN_SUBTITLE_CUE_DURATION_MS);
  const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let cursor = segment.startMs;

  return chunks.map((chunk, index) => {
    const remainingDurationMs = segment.endMs - cursor;
    const isLastChunk = index === chunks.length - 1;
    const proportionalDurationMs = Math.max(
      MIN_SUBTITLE_CUE_DURATION_MS,
      Math.round((durationMs * chunk.length) / Math.max(totalChars, 1)),
    );
    const nextEndMs = isLastChunk
      ? segment.endMs
      : Math.min(segment.endMs, cursor + proportionalDurationMs, cursor + remainingDurationMs);

    const splitSegment = {
      ...segment,
      startMs: cursor,
      endMs: isLastChunk
        ? segment.endMs
        : Math.min(
            segment.endMs,
            Math.max(nextEndMs, Math.min(segment.endMs, cursor + MIN_SUBTITLE_CUE_DURATION_MS)),
          ),
      text: chunk,
      words: undefined,
    };

    cursor = splitSegment.endMs;
    return splitSegment;
  });
}

export function wrapSubtitleText(
  text: string,
  lineLength: number = TARGET_SUBTITLE_LINE_LENGTH_BASE,
): string {
  if (text.length <= lineLength) {
    return text;
  }

  const words = text.split(' ').filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if (`${currentLine} ${word}`.length <= lineLength) {
      currentLine += ` ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join('\n');
}

export function formatSRTTime(ms: number): string {
  const date = new Date(0, 0, 0, 0, 0, 0, ms);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  const owl = date.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s},${owl}`;
}

export function formatAssTime(ms: number): string {
  const totalCentiseconds = Math.max(0, Math.round(ms / 10));
  const hours = Math.floor(totalCentiseconds / 360000);
  const minutes = Math.floor((totalCentiseconds % 360000) / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

export function buildSubtitleForceStyle(style?: SubtitleStyleOptions): string {
  const fontName = mapSubtitleFontToken(style?.fontToken);
  const fontSize = resolveSubtitleFontSize(style?.fontSize, style);
  const primaryColour = mapTextColorToken(style?.textColorToken, '&H00FFFFFF');
  const backColour = mapBackgroundColorToken(style?.bgColorToken, '&H80000000');
  const alignment = mapPositionToAlignment(style?.position);
  const marginV = mapPositionToMarginV(
    style?.position,
    fontSize,
    style?.quality,
    style?.aspectRatio,
  );
  const marginH = resolveHorizontalMargin(style?.quality, style?.aspectRatio);

  return [
    `Fontname=${fontName}`,
    `FontSize=${fontSize}`,
    `PrimaryColour=${primaryColour}`,
    `BackColour=${backColour}`,
    `BorderStyle=${resolveAssBorderStyle(style)}`,
    `Outline=${resolveAssOutline(style)}`,
    `Shadow=${resolveAssShadow(style)}`,
    `Alignment=${alignment}`,
    `MarginL=${marginH}`,
    `MarginR=${marginH}`,
    `MarginV=${marginV}`,
  ].join(',');
}

function buildAssStyleLine(style?: SubtitleStyleOptions): string {
  const fontName = mapSubtitleFontToken(style?.fontToken);
  const fontSize = resolveSubtitleFontSize(style?.fontSize, style);
  const primaryColour = mapHighlightColorToken(style?.textColorToken);
  const secondaryColour = mapTextColorToken(style?.textColorToken, '&H00FFFFFF');
  const outlineColour = '&H00000000';
  const backColour = mapBackgroundColorToken(style?.bgColorToken, '&H80000000');
  const borderStyle = resolveAssBorderStyle(style);
  const outline = resolveAssOutline(style);
  const shadow = resolveAssShadow(style);
  const alignment = mapPositionToAlignment(style?.position);
  const marginV = mapPositionToMarginV(
    style?.position,
    fontSize,
    style?.quality,
    style?.aspectRatio,
  );
  const marginH = resolveHorizontalMargin(style?.quality, style?.aspectRatio);

  return [
    'Style: Default',
    fontName,
    fontSize,
    primaryColour,
    secondaryColour,
    outlineColour,
    backColour,
    1,
    0,
    0,
    0,
    100,
    100,
    0,
    0,
    borderStyle,
    outline,
    shadow,
    alignment,
    marginH,
    marginH,
    marginV,
    1,
  ].join(',');
}

function resolveAssBorderStyle(style?: SubtitleStyleOptions): number {
  return style?.bgColorToken === 'BG_TRANSPARENT' || isMemePopStyle(style) ? 1 : 3;
}

function resolveAssOutline(style?: SubtitleStyleOptions): number {
  if (isMemePopStyle(style)) {
    return MEME_POP_OUTLINE;
  }

  if (style?.animation === 'pop-word') {
    return 3;
  }

  if (
    style?.bgColorToken === 'BG_TRANSPARENT' &&
    (style.textColorToken === 'C_GREEN' || style.textColorToken === 'C_ORANGE')
  ) {
    return 3;
  }

  return 1;
}

function resolveAssShadow(style?: SubtitleStyleOptions): number {
  if (isMemePopStyle(style)) {
    return MEME_POP_SHADOW;
  }

  if (style?.animation === 'pop-word') {
    return 2;
  }

  if (
    style?.bgColorToken === 'BG_TRANSPARENT' &&
    (style.textColorToken === 'C_GREEN' || style.textColorToken === 'C_ORANGE')
  ) {
    return 2;
  }

  return 0;
}

function buildKaraokeText(
  segment: SubtitleSegment,
  lineLength: number,
  style?: SubtitleStyleOptions,
): string {
  const words = resolveKaraokeWords(segment);
  if (words.length === 0) {
    return '';
  }

  const textParts: string[] = [];
  let cursor = segment.startMs;

  words.forEach((word, index) => {
    const normalizedWord = escapeAssText(formatStyledCueText(word.text, style));
    const gapMs = Math.max(0, word.startMs - cursor);
    if (gapMs > 0) {
      textParts.push(String.raw`{\k${Math.max(1, Math.round(gapMs / 10))}}`);
    }

    const wordDurationMs = Math.max(10, word.endMs - word.startMs);
    const suffix = index < words.length - 1 ? ' ' : '';
    textParts.push(
      String.raw`{\k${Math.max(1, Math.round(wordDurationMs / 10))}}${normalizedWord}${suffix}`,
    );
    cursor = word.endMs;
  });

  const trailingGapMs = Math.max(0, segment.endMs - cursor);
  if (trailingGapMs > 0) {
    textParts.push(String.raw`{\k${Math.max(1, Math.round(trailingGapMs / 10))}}`);
  }

  return `${buildAssColorOverride(style)}${wrapAssKaraokeText(textParts.join(''), lineLength)}`;
}

function resolveKaraokeWords(segment: SubtitleSegment): SubtitleWord[] {
  const timedWords =
    segment.words
      ?.map((word) => ({
        ...word,
        startMs: Math.max(segment.startMs, Math.min(word.startMs, segment.endMs)),
        endMs: Math.max(segment.startMs, Math.min(word.endMs, segment.endMs)),
      }))
      .filter((word) => word.text.trim().length > 0 && word.endMs > word.startMs)
      .sort((left, right) => left.startMs - right.startMs) ?? [];
  if (
    timedWords.length > 0 &&
    hasCompleteWordTextCoverage(
      segment.text,
      timedWords.map((word) => word.text),
    )
  ) {
    return timedWords;
  }

  const normalizedText = segment.text.replaceAll(/\s+/g, ' ').trim();
  if (!normalizedText) {
    return [];
  }

  const tokens = normalizedText.split(' ').filter(Boolean);
  if (tokens.length === 0) {
    return [];
  }

  const segmentDurationMs = Math.max(1, segment.endMs - segment.startMs);
  const durationPerWordMs = Math.max(
    MIN_SYNTHETIC_WORD_DURATION_MS,
    Math.floor(segmentDurationMs / tokens.length),
  );
  const syntheticWords: SubtitleWord[] = [];
  let cursor = segment.startMs;

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token) {
      continue;
    }
    const isLast = index === tokens.length - 1;
    const wordEndMs = isLast ? segment.endMs : Math.min(segment.endMs, cursor + durationPerWordMs);
    syntheticWords.push({
      startMs: cursor,
      endMs: Math.max(cursor + 1, wordEndMs),
      text: token,
      speaker: segment.speaker,
    });
    cursor = Math.max(cursor + 1, wordEndMs);
  }

  return syntheticWords;
}

function wrapAssKaraokeText(text: string, lineLength: number): string {
  const safeLineLength = normalizeAssLineLength(lineLength);
  const plainText = stripAssOverrideTags(text).trim();
  if (plainText.length <= safeLineLength) {
    return text;
  }

  const parts = text.split(' ');
  const lines: string[][] = [];
  let currentLineParts: string[] = [];
  let currentVisibleCount = 0;

  for (const part of parts) {
    const plainPart = stripAssOverrideTags(part);
    const partLen = plainPart.length;

    if (currentLineParts.length === 0) {
      currentLineParts.push(part);
      currentVisibleCount = partLen;
    } else {
      const nextVisibleCount = currentVisibleCount + 1 + partLen;
      if (nextVisibleCount <= safeLineLength) {
        currentLineParts.push(part);
        currentVisibleCount = nextVisibleCount;
      } else {
        lines.push(currentLineParts);
        currentLineParts = [part];
        currentVisibleCount = partLen;
      }
    }
  }

  if (currentLineParts.length > 0) {
    lines.push(currentLineParts);
  }

  return lines.map((lineContent) => lineContent.join(' ')).join(String.raw`\N`);
}

function stripAssOverrideTags(text: string): string {
  return text.replaceAll(/\{[^}]*\}/g, '');
}

function escapeAssText(text: string): string {
  return text
    .replaceAll('\\', String.raw`\\`)
    .replaceAll('{', String.raw`\{`)
    .replaceAll('}', String.raw`\}`);
}

function buildAssColorOverride(style?: SubtitleStyleOptions): string {
  const primaryColor = formatAssOverrideColor(
    mapTextColorToken(style?.textColorToken, '&H00FFFFFF'),
  );
  const secondaryColor = formatAssOverrideColor(mapHighlightColorToken(style?.textColorToken));
  const backColor = formatAssOverrideColor(
    mapBackgroundColorToken(style?.bgColorToken, '&H80000000'),
  );

  return String.raw`{\c${primaryColor}\2c${secondaryColor}\4c${backColor}}`;
}

function buildStaticAssText(text: string, style?: SubtitleStyleOptions): string {
  const escapedText = escapeAssText(formatStyledWrappedCueText(text, style)).replaceAll(
    '\n',
    String.raw`\N`,
  );
  return `${buildAssColorOverride(style)}${escapedText}`;
}

function mapTextColorToken(colorToken: string | undefined, fallback: string): string {
  switch (colorToken) {
    case 'C_BLACK':
      return '&H00000000';
    case 'C_ORANGE':
      return '&H000066FF';
    case 'C_CYAN':
      return '&H00EED322';
    case 'C_BLUE':
      return '&H00FAA560';
    case 'C_PINK':
      return '&H00D84FFF';
    case 'C_GREEN':
      return '&H002BFF00';
    case 'C_YELLOW':
      return '&H0000FFFF';
    case 'C_WHITE':
      return '&H00FFFFFF';
    default:
      return fallback;
  }
}

function mapHighlightColorToken(colorToken?: string): string {
  switch (colorToken) {
    case 'C_CYAN':
      return '&H00FFFFFF';
    case 'C_BLUE':
      return '&H00FFFFFF';
    case 'C_PINK':
      return '&H00FFFFFF';
    case 'C_ORANGE':
      return '&H0000FFFF';
    case 'C_YELLOW':
      return '&H000066FF';
    case 'C_GREEN':
      return '&H002BFF00';
    case 'C_BLACK':
      return '&H00FFFFFF';
    default:
      return '&H000066FF';
  }
}

function mapBackgroundColorToken(colorToken: string | undefined, fallback: string): string {
  switch (colorToken) {
    case 'BG_TRANSPARENT':
      return '&HFF000000';
    case 'C_WHITE':
      return '&H80FFFFFF';
    case 'C_ORANGE':
      return '&H800066FF';
    case 'C_CYAN':
      return '&H80EED322';
    case 'C_BLUE':
      return '&H80FAA560';
    case 'C_PINK':
      return '&H80D84FFF';
    case 'C_GREEN':
      return '&H802BFF00';
    case 'C_BLACK':
      return '&H80000000';
    default:
      return fallback;
  }
}

function mapPositionToAlignment(position?: string): number {
  switch (position) {
    case 'top':
      return 8;
    case 'center':
      return 5;
    default:
      return 2;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function estimateSubtitleBlockHeightPx(fontSize: number): number {
  const lineHeight = Math.round(fontSize * SUBTITLE_LINE_HEIGHT_RATIO);
  return Math.max(lineHeight, lineHeight * DEFAULT_SUBTITLE_LINE_COUNT);
}

function resolveSafeBottomRatio(aspectRatio?: ExportAspectRatio): number {
  return aspectRatio === '9:16' ? PORTRAIT_BOTTOM_SAFE_RATIO : BOTTOM_SAFE_RATIO;
}

function resolveSubtitleCenterY(
  position: SubtitlePosition,
  renderHeight: number,
  blockHeight: number,
  aspectRatio?: ExportAspectRatio,
): number {
  const halfBlock = blockHeight / 2;
  const safeTop = renderHeight * TOP_SAFE_RATIO;
  const safeBottom = renderHeight * resolveSafeBottomRatio(aspectRatio);
  const minCenterY = safeTop + halfBlock;
  const maxCenterY = renderHeight - safeBottom - halfBlock;
  const defaultCenterY = renderHeight * CENTER_TARGET_RATIO;

  if (minCenterY > maxCenterY) {
    return defaultCenterY;
  }

  const targetCenterY =
    position === 'top'
      ? renderHeight * TOP_TARGET_RATIO + halfBlock
      : position === 'center'
        ? defaultCenterY
        : renderHeight * BOTTOM_TARGET_RATIO - halfBlock;

  return clamp(targetCenterY, minCenterY, maxCenterY);
}

function mapPositionToMarginV(
  position?: string,
  fontSize: number = 24,
  quality?: ExportQuality,
  aspectRatio?: ExportAspectRatio,
): number {
  const renderHeight = resolveRenderHeight(quality, aspectRatio);
  const blockHeight = estimateSubtitleBlockHeightPx(fontSize);
  const safePosition: SubtitlePosition =
    position === 'top' || position === 'center' || position === 'bottom' ? position : 'bottom';
  const centerY = resolveSubtitleCenterY(safePosition, renderHeight, blockHeight, aspectRatio);
  const halfBlock = blockHeight / 2;

  switch (safePosition) {
    case 'top':
      return Math.round(centerY - halfBlock);
    case 'center':
      return 0;
    default:
      return Math.round(renderHeight - (centerY + halfBlock));
  }
}
