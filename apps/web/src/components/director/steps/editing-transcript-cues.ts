import type { SubtitleStyle } from '@/stores/director-store';

export interface TranscriptWord {
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
}

export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
  words?: TranscriptWord[];
}

export interface TranscriptCue {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  segmentIndices: number[];
  source:
    | {
        kind: 'segment';
      }
    | {
        kind: 'word';
        segmentIndex: number;
        tokenIndex: number;
      }
    | {
        kind: 'group';
      };
}

const TURN_GROUP_MAX_GAP_MS = 380;
const TURN_GROUP_MIN_NEGATIVE_GAP_MS = -120;
const TURN_GROUP_MAX_DURATION_MS = 7_200;
const TURN_GROUP_MAX_CHARS = 120;
const TURN_GROUP_MAX_WORDS = 24;
const MIN_SYNTHETIC_WORD_DURATION_MS = 90;

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function countWords(text: string): number {
  return normalizeText(text).split(' ').filter(Boolean).length;
}

function shouldMergeSegments(current: TranscriptSegment, next: TranscriptSegment): boolean {
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

  const mergedText = normalizeText(`${current.text} ${next.text}`);
  if (mergedText.length > TURN_GROUP_MAX_CHARS || countWords(mergedText) > TURN_GROUP_MAX_WORDS) {
    return false;
  }

  return true;
}

function formatSrtMsPart(ms: number): string {
  return String(ms).padStart(3, '0');
}

function formatSrtTimePart(value: number): string {
  return String(value).padStart(2, '0');
}

function clampMs(ms: number): number {
  if (!Number.isFinite(ms)) {
    return 0;
  }
  return Math.max(0, Math.round(ms));
}

function buildSyntheticWords(segment: TranscriptSegment): TranscriptWord[] {
  const normalized = normalizeText(segment.text);
  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length === 0) {
    return [];
  }

  const durationMs = Math.max(1, segment.endMs - segment.startMs);
  const perWordMs = Math.max(
    MIN_SYNTHETIC_WORD_DURATION_MS,
    Math.floor(durationMs / tokens.length),
  );
  const words: TranscriptWord[] = [];
  let cursor = segment.startMs;

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token) {
      continue;
    }

    const isLast = index === tokens.length - 1;
    const wordEnd = isLast ? segment.endMs : Math.min(segment.endMs, cursor + perWordMs);
    words.push({
      startMs: cursor,
      endMs: Math.max(cursor + 1, wordEnd),
      text: token,
      speaker: segment.speaker,
    });
    cursor = Math.max(cursor + 1, wordEnd);
  }

  return words;
}

function distributeWordsByWeights(totalWords: number, weights: number[]): number[] {
  if (weights.length === 0) {
    return [];
  }

  if (totalWords <= 0) {
    return weights.map(() => 0);
  }

  if (totalWords <= weights.length) {
    return weights.map((_, index) => (index < totalWords ? 1 : 0));
  }

  const sumWeight = weights.reduce((acc, weight) => acc + weight, 0);
  const baseCounts = weights.map((weight) =>
    Math.max(1, Math.floor((weight / Math.max(1, sumWeight)) * totalWords)),
  );
  let allocated = baseCounts.reduce((acc, value) => acc + value, 0);

  if (allocated > totalWords) {
    let overflow = allocated - totalWords;
    for (let index = baseCounts.length - 1; index >= 0 && overflow > 0; index--) {
      if ((baseCounts[index] ?? 0) > 1) {
        baseCounts[index] = (baseCounts[index] ?? 0) - 1;
        overflow -= 1;
      }
    }
    allocated = baseCounts.reduce((acc, value) => acc + value, 0);
  }

  if (allocated < totalWords) {
    let deficit = totalWords - allocated;
    const fractions = weights.map((weight, index) => ({
      index,
      frac: (weight / Math.max(1, sumWeight)) * totalWords - (baseCounts[index] ?? 0),
    }));
    fractions.sort((a, b) => b.frac - a.frac);

    while (deficit > 0) {
      const target = fractions[(totalWords - deficit) % fractions.length];
      if (!target) {
        break;
      }
      baseCounts[target.index] = (baseCounts[target.index] ?? 0) + 1;
      deficit -= 1;
    }
  }

  return baseCounts;
}

export function formatSrtTimestamp(ms: number): string {
  const safe = clampMs(ms);
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1_000);
  const milliseconds = safe % 1_000;

  return `${formatSrtTimePart(hours)}:${formatSrtTimePart(minutes)}:${formatSrtTimePart(seconds)},${formatSrtMsPart(milliseconds)}`;
}

export function formatSrtRange(startMs: number, endMs: number): string {
  return `${formatSrtTimestamp(startMs)} --> ${formatSrtTimestamp(endMs)}`;
}

export function getTranscriptLayoutLabel(animation: SubtitleStyle['animation']): string {
  if (animation === 'word') {
    return 'Gaya word by word';
  }

  if (animation === 'typewriter') {
    return 'Gaya karaoke (kata per kata)';
  }

  if (animation === 'phrase') {
    return 'Gaya cinema (per frasa)';
  }

  if (animation === 'line') {
    return 'Gaya baris';
  }

  if (animation === 'fade') {
    return 'Gaya halus';
  }

  return 'Gaya standar';
}

export function buildTranscriptCues(
  segments: TranscriptSegment[],
  animation: SubtitleStyle['animation'],
): TranscriptCue[] {
  if (animation === 'typewriter' || animation === 'word') {
    const cues: TranscriptCue[] = [];
    segments.forEach((segment, segmentIndex) => {
      const words = segment.words?.length ? segment.words : buildSyntheticWords(segment);
      words.forEach((word, tokenIndex) => {
        cues.push({
          id: `word-${segmentIndex}-${tokenIndex}-${word.startMs}-${word.endMs}`,
          startMs: word.startMs,
          endMs: word.endMs,
          text: normalizeText(word.text),
          segmentIndices: [segmentIndex],
          source: {
            kind: 'word',
            segmentIndex,
            tokenIndex,
          },
        });
      });
    });
    return cues;
  }

  if (animation === 'phrase' || animation === 'line') {
    const cues: TranscriptCue[] = [];
    let currentIndices: number[] = [];
    let currentStart = 0;
    let currentEnd = 0;
    let currentText = '';
    let currentSegment: TranscriptSegment | null = null;

    segments.forEach((segment, segmentIndex) => {
      if (!currentSegment) {
        currentSegment = segment;
        currentIndices = [segmentIndex];
        currentStart = segment.startMs;
        currentEnd = segment.endMs;
        currentText = normalizeText(segment.text);
        return;
      }

      if (shouldMergeSegments(currentSegment, segment)) {
        currentSegment = {
          ...currentSegment,
          endMs: Math.max(currentSegment.endMs, segment.endMs),
          text: `${currentSegment.text} ${segment.text}`,
          speaker: currentSegment.speaker ?? segment.speaker,
        };
        currentIndices.push(segmentIndex);
        currentEnd = Math.max(currentEnd, segment.endMs);
        currentText = normalizeText(`${currentText} ${segment.text}`);
        return;
      }

      cues.push({
        id: `group-${currentIndices.join('-')}-${currentStart}-${currentEnd}`,
        startMs: currentStart,
        endMs: currentEnd,
        text: currentText,
        segmentIndices: [...currentIndices],
        source: { kind: 'group' },
      });

      currentSegment = segment;
      currentIndices = [segmentIndex];
      currentStart = segment.startMs;
      currentEnd = segment.endMs;
      currentText = normalizeText(segment.text);
    });

    if (currentSegment) {
      cues.push({
        id: `group-${currentIndices.join('-')}-${currentStart}-${currentEnd}`,
        startMs: currentStart,
        endMs: currentEnd,
        text: currentText,
        segmentIndices: [...currentIndices],
        source: { kind: 'group' },
      });
    }

    return cues;
  }

  return segments.map((segment, segmentIndex) => ({
    id: `segment-${segmentIndex}-${segment.startMs}-${segment.endMs}`,
    startMs: segment.startMs,
    endMs: segment.endMs,
    text: normalizeText(segment.text),
    segmentIndices: [segmentIndex],
    source: { kind: 'segment' },
  }));
}

function applyWordEdit(
  segments: TranscriptSegment[],
  segmentIndex: number,
  tokenIndex: number,
  nextText: string,
): TranscriptSegment[] {
  const target = segments[segmentIndex];
  if (!target) {
    return segments;
  }

  const tokenized = (target.words?.length ? target.words : buildSyntheticWords(target)).map(
    (word) => normalizeText(word.text),
  );

  if (!tokenized[tokenIndex]) {
    return segments;
  }

  tokenized[tokenIndex] = normalizeText(nextText);
  const updatedText = tokenized.filter(Boolean).join(' ').trim();

  return segments.map((segment, index) =>
    index === segmentIndex
      ? {
          ...segment,
          text: updatedText,
        }
      : segment,
  );
}

function applyGroupEdit(
  segments: TranscriptSegment[],
  segmentIndices: number[],
  nextText: string,
): TranscriptSegment[] {
  if (segmentIndices.length === 0) {
    return segments;
  }

  const normalized = normalizeText(nextText);
  const words = normalized.split(' ').filter(Boolean);
  const sourceSegments = segmentIndices
    .map((index) => segments[index])
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
  if (sourceSegments.length === 0) {
    return segments;
  }

  const weights = sourceSegments.map((segment) => Math.max(1, countWords(segment.text)));
  const perSegmentCounts = distributeWordsByWeights(words.length, weights);

  let cursor = 0;
  const nextTexts = perSegmentCounts.map((count) => {
    const value = words
      .slice(cursor, cursor + count)
      .join(' ')
      .trim();
    cursor += count;
    return value;
  });

  return segments.map((segment, index) => {
    const localIndex = segmentIndices.indexOf(index);
    if (localIndex < 0) {
      return segment;
    }

    return {
      ...segment,
      text: nextTexts[localIndex] ?? '',
    };
  });
}

export function applyTranscriptCueEdit(params: {
  segments: TranscriptSegment[];
  cue: TranscriptCue;
  nextText: string;
}): TranscriptSegment[] {
  const { segments, cue, nextText } = params;
  if (cue.source.kind === 'word') {
    return applyWordEdit(segments, cue.source.segmentIndex, cue.source.tokenIndex, nextText);
  }

  if (cue.source.kind === 'group') {
    return applyGroupEdit(segments, cue.segmentIndices, nextText);
  }

  const segmentIndex = cue.segmentIndices[0];
  if (segmentIndex === undefined) {
    return segments;
  }

  return segments.map((segment, index) =>
    index === segmentIndex
      ? {
          ...segment,
          text: normalizeText(nextText),
        }
      : segment,
  );
}
