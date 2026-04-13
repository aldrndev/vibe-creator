import type { SubtitleSegment, SubtitleWord } from '@/modules/transcribe/transcribe-normalizer';

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

const MAX_SUBTITLE_CHARS_PER_CUE = 72;
const TARGET_SUBTITLE_LINE_LENGTH = 32;
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
  const displaySegments = resolveSubtitleDisplaySegments(segments, style);

  if (shouldUseWordHighlight(style, displaySegments)) {
    return {
      extension: 'ass',
      content: generateASS(displaySegments, style),
      useForceStyle: false,
    };
  }

  return {
    extension: 'srt',
    content: generateSRT(displaySegments),
    useForceStyle: true,
  };
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
  return text.replace(/\s+/g, ' ').trim();
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
    .filter((segment) => segment.endMs > segment.startMs)
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

export function generateSRT(segments: SubtitleSegment[]): string {
  return applySubtitleHold(segmentSubtitlesForSrt(segments))
    .map((segment, index) => {
      const start = formatSRTTime(segment.startMs);
      const end = formatSRTTime(segment.endMs);
      return `${index + 1}\n${start} --> ${end}\n${wrapSubtitleText(segment.text)}\n`;
    })
    .join('\n');
}

export function generateASS(segments: SubtitleSegment[], style?: SubtitleStyleOptions): string {
  const assSegments = applySubtitleHold(segmentSubtitlesForAss(segments));
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
  const marginV = mapPositionToMarginV(style?.position);

  return [
    `Fontname=${fontName}`,
    `FontSize=${fontSize}`,
    `PrimaryColour=${primaryColour}`,
    `BackColour=${backColour}`,
    'BorderStyle=3',
    'Outline=1',
    'Shadow=0',
    `Alignment=${alignment}`,
    `MarginV=${marginV}`,
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
  const marginV = mapPositionToMarginV(style?.position);

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
    marginV,
    1,
  ].join(',');
}

function buildKaraokeText(segment: SubtitleSegment): string {
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

function resolveKaraokeWords(segment: SubtitleSegment): SubtitleWord[] {
  const timedWords = segment.words?.filter((word) => word.endMs > word.startMs) ?? [];
  if (timedWords.length > 0) {
    return timedWords;
  }

  const normalizedText = segment.text.replace(/\s+/g, ' ').trim();
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

function mapPositionToMarginV(position?: string): number {
  switch (position) {
    case 'top':
      return 72;
    case 'center':
      return 40;
    case 'safe-bottom':
      return 120;
    case 'cinema-bottom':
      return 180;
    case 'lower-third':
      return 300;
    default:
      return 60;
  }
}
