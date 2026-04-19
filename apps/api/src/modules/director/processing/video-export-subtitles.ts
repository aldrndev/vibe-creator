import type { SubtitleSegment, SubtitleWord } from '@/modules/transcribe/transcribe-normalizer';

export type SubtitleContentMode =
  | 'auto'
  | 'podcast'
  | 'interview'
  | 'talking-head'
  | 'product-review'
  | 'cinematic'
  | 'general';
type SubtitlePosition =
  | 'top'
  | 'center'
  | 'bottom'
  | 'cinema-bottom'
  | 'safe-bottom'
  | 'lower-third';
type ExportAspectRatio = '9:16' | '16:9' | '1:1';
type ExportQuality = '720p' | '1080p';

export interface SubtitleStyleOptions {
  fontToken?: string;
  textColorToken?: string;
  bgColorToken?: string;
  fontSize?: number;
  position?: SubtitlePosition;
  animation?: string;
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
export const DIRECTOR_SUBTITLE_FONT_SIZE_MIN = 16;
export const DIRECTOR_SUBTITLE_FONT_SIZE_MAX = 72;
const DEFAULT_SUBTITLE_FONT_SIZE_MAX = 56;
const DIRECTOR_SUBTITLE_MAX_RENDER_HEIGHT_RATIO = 0.06;

/** Base render height used for proportional MarginV scaling. */
const MARGIN_V_BASE_HEIGHT = 1920;

const subtitleFontSizeMaxByContentMode: Record<Exclude<SubtitleContentMode, 'auto'>, number> = {
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
 * The constraining factor for word mode is frame WIDTH, not height.
 * Portrait 9:16 has only 1080px width (at 1080p), so limits must be aggressive.
 */
const wordAnimationMaxByAspectRatio: Record<ExportAspectRatio, number> = {
  '9:16': 56,
  '1:1': 64,
  '16:9': 80,
};

const typewriterAnimationMaxByAspectRatio: Record<ExportAspectRatio, number> = {
  '9:16': 56,
  '1:1': 64,
  '16:9': 80,
};

function resolveAnimationFontSizeMax(
  animation: string | undefined,
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

function isSubtitlePosition(value: string | undefined): value is SubtitlePosition {
  return (
    value === 'top' ||
    value === 'center' ||
    value === 'bottom' ||
    value === 'cinema-bottom' ||
    value === 'safe-bottom' ||
    value === 'lower-third'
  );
}

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
  // ~2% of frame width, minimum 14px
  return Math.max(14, Math.round(frameWidth * 0.02));
}

function resolveSubtitleLineLength(
  fontSize: number,
  quality?: ExportQuality,
  aspectRatio?: ExportAspectRatio,
): number {
  const frameWidth = resolveRenderWidth(quality, aspectRatio);
  // Calculate based on user suggestion: max width 90% of frame width
  const availableWidth = frameWidth * 0.9;
  // Inter font typical character width is ~55% of its height
  const averageCharWidth = fontSize * 0.55;
  const maxChars = Math.floor(availableWidth / averageCharWidth);
  return Math.max(14, maxChars);
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

  const baseFontSize = Math.max(DIRECTOR_SUBTITLE_FONT_SIZE_MIN, Math.min(normalizedFontSize, maxFontSizeDesktop));

  const safeAspectRatio = (style?.aspectRatio as ExportAspectRatio) ?? '9:16';
  const renderHeight = resolveRenderHeight(style?.quality, safeAspectRatio);

  // Dynamically scale font size so it takes the exact same visual proportion
  // on 720p/16:9/1:1 as it does on a 1080p 9:16 canvas (base height 1920).
  const scaledFontSize = Math.round(baseFontSize * (renderHeight / MARGIN_V_BASE_HEIGHT));
  return Math.max(DIRECTOR_SUBTITLE_FONT_SIZE_MIN, scaledFontSize);
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

  if (shouldUseWordByWord(style, displaySegments)) {
    return {
      extension: 'srt',
      content: generateSRT(buildWordByWordSegments(displaySegments), style),
      useForceStyle: true,
    };
  }

  if (shouldUseWordHighlight(style, displaySegments)) {
    return {
      extension: 'ass',
      content: generateASS(displaySegments, style),
      useForceStyle: false,
    };
  }

  return {
    extension: 'srt',
    content: generateSRT(displaySegments, style),
    useForceStyle: true,
  };
}

function shouldUseWordByWord(
  style: SubtitleStyleOptions | undefined,
  segments: SubtitleSegment[],
): boolean {
  return style?.animation === 'word' && segments.some((segment) => segment.text.trim().length > 0);
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

export function generateASS(segments: SubtitleSegment[], style?: SubtitleStyleOptions): string {
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
      const text = buildKaraokeText(segment, lineLength);
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    })
    .join('\n');

  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${playResolution.width}`,
    `PlayResY: ${playResolution.height}`,
    'WrapStyle: 2',
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
  return segments
    .map((segment) => ({
      ...segment,
      text: wrapSubtitleText(segment.text, lineLength),
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
      startMs: cursor,
      endMs: isLastChunk
        ? segment.endMs
        : Math.min(
            segment.endMs,
            Math.max(nextEndMs, Math.min(segment.endMs, cursor + MIN_SUBTITLE_CUE_DURATION_MS)),
          ),
      text: chunk,
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
  const fontName = mapFontToken(style?.fontToken);
  const fontSize = resolveSubtitleFontSize(style?.fontSize, style);
  const primaryColour = mapTextColorToken(style?.textColorToken, '&H00FFFFFF');
  const backColour = mapBackgroundColorToken(style?.bgColorToken, '&H80000000');
  const alignment = mapPositionToAlignment(style?.position);
  const marginV = mapPositionToMarginV(style?.position, style?.quality, style?.aspectRatio);
  const marginH = resolveHorizontalMargin(style?.quality, style?.aspectRatio);

  return [
    `Fontname=${fontName}`,
    `FontSize=${fontSize}`,
    `PrimaryColour=${primaryColour}`,
    `BackColour=${backColour}`,
    'BorderStyle=3',
    'Outline=1',
    'Shadow=0',
    `Alignment=${alignment}`,
    `MarginL=${marginH}`,
    `MarginR=${marginH}`,
    `MarginV=${marginV}`,
  ].join(',');
}

function buildAssStyleLine(style?: SubtitleStyleOptions): string {
  const fontName = mapFontToken(style?.fontToken);
  const fontSize = resolveSubtitleFontSize(style?.fontSize, style);
  const primaryColour = mapHighlightColorToken(style?.textColorToken);
  const secondaryColour = mapTextColorToken(style?.textColorToken, '&H00FFFFFF');
  const outlineColour = '&H00000000';
  const backColour = mapBackgroundColorToken(style?.bgColorToken, '&H80000000');
  const alignment = mapPositionToAlignment(style?.position);
  const marginV = mapPositionToMarginV(style?.position, style?.quality, style?.aspectRatio);
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
    3,
    1,
    0,
    alignment,
    marginH,
    marginH,
    marginV,
    1,
  ].join(',');
}

function buildKaraokeText(segment: SubtitleSegment, lineLength: number): string {
  const words = resolveKaraokeWords(segment);
  if (words.length === 0) {
    return '';
  }

  const textParts: string[] = [];
  let cursor = segment.startMs;

  words.forEach((word, index) => {
    const normalizedWord = escapeAssText(word.text);
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

  return wrapAssKaraokeText(textParts.join(''), lineLength);
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
  if (timedWords.length > 0) {
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
  const plainText = text.replaceAll(/\{\\k\d+\}/g, '').trim();
  if (plainText.length <= lineLength) {
    return text;
  }

  const parts = text.split(' ');
  const lines: string[][] = [];
  let currentLineParts: string[] = [];
  let currentVisibleCount = 0;

  for (const part of parts) {
    const plainPart = part.replaceAll(/\{\\k\d+\}/g, '');
    const partLen = plainPart.length;

    if (currentLineParts.length === 0) {
      currentLineParts.push(part);
      currentVisibleCount = partLen;
    } else {
      const nextVisibleCount = currentVisibleCount + 1 + partLen;
      if (nextVisibleCount <= lineLength) {
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

function escapeAssText(text: string): string {
  return text.replaceAll('\\', String.raw`\\`).replaceAll('{', String.raw`\{`).replaceAll('}', String.raw`\}`);
}

function mapFontToken(fontToken?: string): string {
  switch (fontToken) {
    case 'F_MONO':
      return 'Courier New';
    case 'F_SERIF':
      return 'Georgia';
    default:
      return 'Inter';
  }
}

function mapTextColorToken(colorToken: string | undefined, fallback: string): string {
  switch (colorToken) {
    case 'C_BLACK':
      return '&H00000000';
    case 'C_ORANGE':
      return '&H000066FF';
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
    case 'C_ORANGE':
      return '&H0000FFFF';
    case 'C_YELLOW':
      return '&H000066FF';
    case 'C_BLACK':
      return '&H00FFFFFF';
    default:
      return '&H000066FF';
  }
}

function mapBackgroundColorToken(colorToken: string | undefined, fallback: string): string {
  switch (colorToken) {
    case 'BG_TRANSPARENT':
      return '&H00000000';
    case 'C_WHITE':
      return '&H80FFFFFF';
    case 'C_ORANGE':
      return '&H800066FF';
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

function mapPositionToMarginV(
  position?: string,
  quality?: ExportQuality,
  aspectRatio?: ExportAspectRatio,
): number {
  const renderHeight = resolveRenderHeight(quality, aspectRatio);
  const scale = renderHeight / MARGIN_V_BASE_HEIGHT;

  switch (position) {
    case 'top':
      return Math.round(72 * scale);
    case 'center':
      return Math.round(40 * scale);
    case 'safe-bottom':
      return Math.round(120 * scale);
    case 'cinema-bottom':
      return Math.round(180 * scale);
    case 'lower-third':
      return Math.round(300 * scale);
    default:
      return Math.round(60 * scale);
  }
}
