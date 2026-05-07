import type { SubtitleSegment, SubtitleWord } from './transcribe-normalizer';

const TAIL_RETRY_GAP_RATIO = 0.08;
const TAIL_RETRY_MIN_GAP_MS = 1_500;
const TAIL_RETRY_MAX_GAP_MS = 5_000;
const TAIL_RETRY_OVERLAP_MS = 2_000;
const TAIL_RETRY_MIN_DURATION_MS = 3_000;
const TAIL_DUPLICATE_GUARD_MS = 250;

export interface TranscriptTailRecoveryWindow {
  readonly startMs: number;
  readonly endMs: number;
  readonly offsetMs: number;
  readonly lastTranscriptEndMs: number;
}

function rebuildTextFromWords(words: SubtitleWord[]): string {
  return words
    .map((word) => word.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveTailRetryGapMs(clipDurationMs: number): number {
  return Math.min(
    TAIL_RETRY_MAX_GAP_MS,
    Math.max(TAIL_RETRY_MIN_GAP_MS, Math.round(clipDurationMs * TAIL_RETRY_GAP_RATIO)),
  );
}

/**
 * Resolves the last timed point in a normalized transcript.
 */
export function getTranscriptLastEndMs(segments: SubtitleSegment[]): number {
  return segments.reduce((maxEndMs, segment) => {
    const wordMaxEndMs =
      segment.words?.reduce((wordMax, word) => Math.max(wordMax, word.endMs), 0) ?? 0;
    return Math.max(maxEndMs, segment.endMs, wordMaxEndMs);
  }, 0);
}

/**
 * Builds a retry window when the transcript ends suspiciously before the clip does.
 */
export function getTranscriptTailRecoveryWindow(
  segments: SubtitleSegment[],
  clipDurationMs: number,
): TranscriptTailRecoveryWindow | null {
  if (!Number.isFinite(clipDurationMs) || clipDurationMs <= 0) {
    return null;
  }

  const lastTranscriptEndMs = getTranscriptLastEndMs(segments);
  const missingTailMs = clipDurationMs - lastTranscriptEndMs;
  if (missingTailMs <= resolveTailRetryGapMs(clipDurationMs)) {
    return null;
  }

  const startMs =
    lastTranscriptEndMs > 0 ? Math.max(0, lastTranscriptEndMs - TAIL_RETRY_OVERLAP_MS) : 0;
  if (clipDurationMs - startMs < TAIL_RETRY_MIN_DURATION_MS) {
    return null;
  }

  return {
    startMs,
    endMs: clipDurationMs,
    offsetMs: startMs,
    lastTranscriptEndMs,
  };
}

function offsetTailWord(word: SubtitleWord, offsetMs: number): SubtitleWord {
  return {
    ...word,
    startMs: word.startMs + offsetMs,
    endMs: word.endMs + offsetMs,
  };
}

function offsetTailSegment(
  segment: SubtitleSegment,
  offsetMs: number,
  lastTranscriptEndMs: number,
): SubtitleSegment | null {
  const duplicateGuardEndMs = lastTranscriptEndMs + TAIL_DUPLICATE_GUARD_MS;
  const offsetWords = segment.words
    ?.map((word) => offsetTailWord(word, offsetMs))
    .filter((word) => word.endMs > duplicateGuardEndMs);

  if (offsetWords?.length) {
    return {
      startMs: Math.min(...offsetWords.map((word) => word.startMs)),
      endMs: Math.max(...offsetWords.map((word) => word.endMs)),
      text: rebuildTextFromWords(offsetWords),
      words: offsetWords,
      speaker: segment.speaker,
    };
  }

  const startMs = segment.startMs + offsetMs;
  const endMs = segment.endMs + offsetMs;
  if (endMs <= duplicateGuardEndMs || segment.text.trim().length === 0) {
    return null;
  }

  return {
    ...segment,
    startMs: Math.max(startMs, lastTranscriptEndMs + 1),
    endMs,
    text: segment.text.trim(),
    words: undefined,
  };
}

/**
 * Offsets tail retry transcript timings back into the selected clip timeline.
 */
export function offsetRecoveredTailSegments(
  segments: SubtitleSegment[],
  window: TranscriptTailRecoveryWindow,
): SubtitleSegment[] {
  return segments
    .map((segment) => offsetTailSegment(segment, window.offsetMs, window.lastTranscriptEndMs))
    .filter((segment): segment is SubtitleSegment => segment !== null)
    .sort((a, b) => a.startMs - b.startMs);
}
