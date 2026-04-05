import type { SubtitleSegment } from '@/modules/transcribe/transcribe-normalizer';

export interface SubtitleStyleOptions {
  fontToken?: string;
  textColorToken?: string;
  bgColorToken?: string;
  fontSize?: number;
  position?: string;
  animation?: string;
}

export interface SubtitleAsset {
  extension: 'srt' | 'ass';
  content: string;
  useForceStyle: boolean;
}

const MAX_SUBTITLE_CHARS_PER_CUE = 42;
const TARGET_SUBTITLE_LINE_LENGTH = 22;
const MIN_SUBTITLE_CUE_DURATION_MS = 700;

export function escapeSubtitleFilterValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/'/g, "\\'");
}

export function buildSubtitlesFilter(
  subtitlePath: string,
  style?: SubtitleStyleOptions,
  useForceStyle = true,
): string {
  const escapedPath = escapeSubtitleFilterValue(subtitlePath.replace(/\\/g, '/'));
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
  if (shouldUseWordHighlight(style, segments)) {
    return {
      extension: 'ass',
      content: generateASS(segments, style),
      useForceStyle: false,
    };
  }

  return {
    extension: 'srt',
    content: generateSRT(segments),
    useForceStyle: true,
  };
}

export function shouldUseWordHighlight(
  style: SubtitleStyleOptions | undefined,
  segments: SubtitleSegment[],
): boolean {
  return style?.animation === 'typewriter' && segments.some((segment) => segment.words?.length);
}

export function generateSRT(segments: SubtitleSegment[]): string {
  return segmentSubtitlesForSrt(segments)
    .map((segment, index) => {
      const start = formatSRTTime(segment.startMs);
      const end = formatSRTTime(segment.endMs);
      return `${index + 1}\n${start} --> ${end}\n${wrapSubtitleText(segment.text)}\n`;
    })
    .join('\n');
}

export function generateASS(segments: SubtitleSegment[], style?: SubtitleStyleOptions): string {
  const assSegments = segmentSubtitlesForAss(segments);
  const styleLine = buildAssStyleLine(style);

  const events = assSegments
    .map((segment) => {
      const start = formatAssTime(segment.startMs);
      const end = formatAssTime(segment.endMs);
      const text = buildKaraokeText(segment);
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    })
    .join('\n');

  return [
    '[Script Info]',
    'ScriptType: v4.00+',
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

export function segmentSubtitlesForSrt(segments: SubtitleSegment[]): SubtitleSegment[] {
  return segments.flatMap((segment) => splitSubtitleCue(segment));
}

export function segmentSubtitlesForAss(segments: SubtitleSegment[]): SubtitleSegment[] {
  return segments
    .map((segment) => ({
      ...segment,
      text: wrapSubtitleText(segment.text),
    }))
    .filter((segment) => segment.text.trim().length > 0);
}

export function splitSubtitleCue(segment: SubtitleSegment): SubtitleSegment[] {
  const normalizedText = segment.text.replace(/\s+/g, ' ').trim();
  if (normalizedText.length <= MAX_SUBTITLE_CHARS_PER_CUE) {
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
    if (nextChunk.length > MAX_SUBTITLE_CHARS_PER_CUE && currentChunk) {
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

export function wrapSubtitleText(text: string): string {
  if (text.length <= TARGET_SUBTITLE_LINE_LENGTH) {
    return text;
  }

  const words = text.split(' ').filter(Boolean);
  let bestLine = words[0] ?? text;
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= TARGET_SUBTITLE_LINE_LENGTH) {
      currentLine = nextLine;
      bestLine = nextLine;
      continue;
    }

    break;
  }

  const secondLine = text.slice(bestLine.length).trim();
  return secondLine ? `${bestLine}\n${secondLine}` : bestLine;
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
  const fontSize = Math.max(16, Math.min(style?.fontSize ?? 24, 64));
  const primaryColour = mapTextColorToken(style?.textColorToken, '&H00FFFFFF');
  const backColour = mapBackgroundColorToken(style?.bgColorToken, '&H80000000');
  const alignment = mapPositionToAlignment(style?.position);

  return [
    `Fontname=${fontName}`,
    `FontSize=${fontSize}`,
    `PrimaryColour=${primaryColour}`,
    `BackColour=${backColour}`,
    'BorderStyle=3',
    'Outline=1',
    'Shadow=0',
    `Alignment=${alignment}`,
    'MarginV=60',
  ].join(',');
}

function buildAssStyleLine(style?: SubtitleStyleOptions): string {
  const fontName = mapFontToken(style?.fontToken);
  const fontSize = Math.max(16, Math.min(style?.fontSize ?? 24, 64));
  const primaryColour = mapHighlightColorToken(style?.textColorToken);
  const secondaryColour = mapTextColorToken(style?.textColorToken, '&H00FFFFFF');
  const outlineColour = '&H00000000';
  const backColour = mapBackgroundColorToken(style?.bgColorToken, '&H80000000');
  const alignment = mapPositionToAlignment(style?.position);

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
    40,
    40,
    60,
    1,
  ].join(',');
}

function buildKaraokeText(segment: SubtitleSegment): string {
  const words = segment.words?.filter((word) => word.endMs > word.startMs) ?? [];
  if (words.length === 0) {
    return wrapSubtitleText(segment.text).replace(/\n/g, '\\N');
  }

  const textParts: string[] = [];
  let cursor = segment.startMs;

  words.forEach((word, index) => {
    const normalizedWord = escapeAssText(word.text);
    const gapMs = Math.max(0, word.startMs - cursor);
    if (gapMs > 0) {
      textParts.push(`{\\k${Math.max(1, Math.round(gapMs / 10))}}`);
    }

    const wordDurationMs = Math.max(10, word.endMs - word.startMs);
    const suffix = index < words.length - 1 ? ' ' : '';
    textParts.push(
      `{\\k${Math.max(1, Math.round(wordDurationMs / 10))}}${normalizedWord}${suffix}`,
    );
    cursor = word.endMs;
  });

  const trailingGapMs = Math.max(0, segment.endMs - cursor);
  if (trailingGapMs > 0) {
    textParts.push(`{\\k${Math.max(1, Math.round(trailingGapMs / 10))}}`);
  }

  return wrapAssKaraokeText(textParts.join(''));
}

function wrapAssKaraokeText(text: string): string {
  const plainText = text.replace(/\{\\k\d+\}/g, '').trim();
  if (plainText.length <= TARGET_SUBTITLE_LINE_LENGTH) {
    return text;
  }

  const parts = text.split(' ');
  let visibleCount = 0;
  const firstLineParts: string[] = [];
  const secondLineParts: string[] = [];
  let useSecondLine = false;

  for (const part of parts) {
    const plainPart = part.replace(/\{\\k\d+\}/g, '');
    const nextVisibleCount = visibleCount + (visibleCount === 0 ? 0 : 1) + plainPart.length;
    if (!useSecondLine && nextVisibleCount > TARGET_SUBTITLE_LINE_LENGTH) {
      useSecondLine = true;
    }

    if (useSecondLine) {
      secondLineParts.push(part);
    } else {
      firstLineParts.push(part);
      visibleCount = nextVisibleCount;
    }
  }

  if (secondLineParts.length === 0) {
    return text;
  }

  return `${firstLineParts.join(' ')}\\N${secondLineParts.join(' ')}`;
}

function escapeAssText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
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
