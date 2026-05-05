import { hasCompleteWordTextCoverage } from './transcript-word-coverage.js';
import type { RawWhisperSegment, RawWhisperWord } from './whisper-runner.js';

export interface SubtitleWord {
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
  speaker?: string;
}

export interface SubtitleSegment {
  startMs: number;
  endMs: number;
  text: string;
  words?: SubtitleWord[];
  speaker?: string;
}

const WORD_BREAK_GAP_MS = 520;
const SENTENCE_BREAK_MIN_DURATION_MS = 900;
const SOFT_MAX_UTTERANCE_DURATION_MS = 4_200;
const HARD_MAX_UTTERANCE_DURATION_MS = 6_200;
const MAX_UTTERANCE_WORDS = 14;
const NEW_SENTENCE_WORD_THRESHOLD = 6;
const FALLBACK_MERGE_GAP_MS = 320;
const FALLBACK_MAX_DURATION_MS = 4_500;
const FALLBACK_MAX_WORDS = 16;
const MIN_SEGMENT_DURATION_MS = 500;

export class TranscribeNormalizer {
  /**
   * Normalize raw whisper segments:
   * 1. Convert seconds to ms
   * 2. Merge short gaps (< 250ms)
   * 3. Clamp min duration (>= 600ms)
   * 4. Ensure monotonicity
   */
  normalizeSegments(rawSegments: RawWhisperSegment[]): SubtitleSegment[] {
    if (!rawSegments || rawSegments.length === 0) return [];

    const coverageAwareSegments = this.buildCoverageAwareSegments(rawSegments);
    if (coverageAwareSegments.length > 0) {
      return this.clampAndEnsureMonotonicity(coverageAwareSegments);
    }

    const segments = this.preprocessSegments(rawSegments);
    if (segments.length === 0) return [];

    const merged = this.mergeSegments(segments);
    return this.clampAndEnsureMonotonicity(merged);
  }

  private buildCoverageAwareSegments(rawSegments: RawWhisperSegment[]): SubtitleSegment[] {
    const segments: SubtitleSegment[] = [];
    let usedWordTimings = false;

    for (const rawSegment of rawSegments) {
      const words = (rawSegment.words ?? [])
        .map((word) => this.normalizeWord(word))
        .filter((word): word is SubtitleWord => word !== null)
        .sort((a, b) => a.startMs - b.startMs);

      if (
        words.length > 0 &&
        hasCompleteWordTextCoverage(
          rawSegment.text,
          words.map((word) => word.text),
        )
      ) {
        segments.push(...this.buildWordSegments(words));
        usedWordTimings = true;
        continue;
      }

      const fallbackSegment = this.normalizeRawSegment(rawSegment);
      if (fallbackSegment) {
        segments.push(fallbackSegment);
      }
    }

    return usedWordTimings ? segments.sort((a, b) => a.startMs - b.startMs) : [];
  }

  private buildWordSegments(words: SubtitleWord[]): SubtitleSegment[] {
    if (words.length === 0) {
      return [];
    }

    const firstWord = words[0];
    if (!firstWord) {
      return [];
    }

    const grouped: SubtitleSegment[] = [];
    let current: SubtitleSegment = {
      ...firstWord,
      words: [{ ...firstWord }],
      speaker: firstWord.speaker,
    };
    let wordCount = this.countWords(current.text);

    for (let i = 1; i < words.length; i++) {
      const next = words[i];
      if (!next) {
        continue;
      }

      const gap = next.startMs - current.endMs;
      const duration = current.endMs - current.startMs;
      const shouldBreakForGap = gap > WORD_BREAK_GAP_MS;
      const shouldBreakForWords = wordCount >= MAX_UTTERANCE_WORDS;
      const shouldBreakForHardDuration = duration >= HARD_MAX_UTTERANCE_DURATION_MS;
      const shouldBreakForSentence =
        this.endsSentence(current.text) && duration >= SENTENCE_BREAK_MIN_DURATION_MS;
      const shouldBreakForNewSentence =
        this.startsNewSentence(next.text) && wordCount >= NEW_SENTENCE_WORD_THRESHOLD;
      const shouldBreakForSoftDuration = duration >= SOFT_MAX_UTTERANCE_DURATION_MS && gap > 140;
      const shouldBreakForSpeakerChange =
        Boolean(current.speaker) && Boolean(next.speaker) && current.speaker !== next.speaker;
      const shouldBreak =
        shouldBreakForGap ||
        shouldBreakForWords ||
        shouldBreakForHardDuration ||
        shouldBreakForSentence ||
        shouldBreakForNewSentence ||
        shouldBreakForSoftDuration ||
        shouldBreakForSpeakerChange;

      if (shouldBreak) {
        grouped.push(current);
        current = {
          ...next,
          words: [{ ...next }],
          speaker: next.speaker,
        };
        wordCount = this.countWords(current.text);
        continue;
      }

      const mergedWords = [...(current.words ?? []), { ...next }];
      current = {
        startMs: current.startMs,
        endMs: next.endMs,
        text: this.rebuildTextFromWords(mergedWords),
        words: mergedWords,
        speaker: this.resolveDominantSpeaker(mergedWords) ?? current.speaker ?? next.speaker,
      };
      wordCount += this.countWords(next.text);
    }

    grouped.push(current);
    return grouped;
  }

  private normalizeRawSegment(rawSegment: RawWhisperSegment): SubtitleSegment | null {
    const text = rawSegment.text.trim();
    if (text.length === 0) {
      return null;
    }

    return {
      startMs: Math.round(rawSegment.start * 1000),
      endMs: Math.round(rawSegment.end * 1000),
      text,
      speaker:
        typeof rawSegment.speaker === 'string' ? rawSegment.speaker.trim() || undefined : undefined,
    };
  }

  private preprocessSegments(rawSegments: RawWhisperSegment[]): SubtitleSegment[] {
    return rawSegments
      .map((s) => ({
        startMs: Math.round(s.start * 1000),
        endMs: Math.round(s.end * 1000),
        text: s.text.trim(),
        speaker: typeof s.speaker === 'string' ? s.speaker.trim() || undefined : undefined,
      }))
      .filter((s) => s.text.length > 0)
      .sort((a, b) => a.startMs - b.startMs);
  }

  private normalizeWord(word: RawWhisperWord): SubtitleWord | null {
    const text = word.text.trim();

    if (
      !text ||
      !Number.isFinite(word.start) ||
      !Number.isFinite(word.end) ||
      word.end <= word.start
    ) {
      return null;
    }

    return {
      startMs: Math.round(word.start * 1000),
      endMs: Math.round(word.end * 1000),
      text,
      confidence: word.confidence,
      speaker: typeof word.speaker === 'string' ? word.speaker.trim() || undefined : undefined,
    };
  }

  private resolveDominantSpeaker(words: SubtitleWord[]): string | undefined {
    const speakerDurations = new Map<string, number>();
    for (const word of words) {
      if (!word.speaker) {
        continue;
      }
      const duration = Math.max(0, word.endMs - word.startMs);
      speakerDurations.set(word.speaker, (speakerDurations.get(word.speaker) ?? 0) + duration);
    }

    let dominantSpeaker: string | undefined;
    let dominantDuration = 0;
    for (const [speaker, duration] of speakerDurations) {
      if (duration > dominantDuration) {
        dominantSpeaker = speaker;
        dominantDuration = duration;
      }
    }

    return dominantSpeaker;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  private endsSentence(text: string): boolean {
    return /[.!?]$/.test(text.trim());
  }

  private startsNewSentence(text: string): boolean {
    const normalized = text.trim();
    if (!normalized) {
      return false;
    }

    // Treat acronym-like tokens (CTA, AI, etc.) as continuation of the same utterance.
    if (/^[A-Z]{2,}[.!?,:;]?$/.test(normalized)) {
      return false;
    }

    return /^(?:["'“([]+)?[A-Z][a-z]/.test(normalized);
  }

  private mergeSegments(segments: SubtitleSegment[]): SubtitleSegment[] {
    const firstSegment = segments[0];
    if (!firstSegment) return [];

    const merged: SubtitleSegment[] = [];
    let current: SubtitleSegment = { ...firstSegment };

    for (let i = 1; i < segments.length; i++) {
      const next = segments[i];
      if (!next) continue;

      const gap = next.startMs - current.endMs;

      const mergedDurationMs = next.endMs - current.startMs;
      const mergedWordCount = this.countWords(`${current.text} ${next.text}`);

      // Merge only if close in time and still readable as one subtitle sentence.
      const isCrossSpeakerMerge =
        Boolean(current.speaker) && Boolean(next.speaker) && current.speaker !== next.speaker;

      if (
        gap < FALLBACK_MERGE_GAP_MS &&
        gap >= -500 &&
        mergedDurationMs <= FALLBACK_MAX_DURATION_MS &&
        mergedWordCount <= FALLBACK_MAX_WORDS &&
        !isCrossSpeakerMerge
      ) {
        current.endMs = next.endMs;
        current.text += ` ${next.text}`;
        current.speaker = current.speaker ?? next.speaker;
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);
    return merged;
  }

  private clampAndEnsureMonotonicity(merged: SubtitleSegment[]): SubtitleSegment[] {
    const finalSegments: SubtitleSegment[] = [];

    for (let i = 0; i < merged.length; i++) {
      const seg = merged[i];
      if (!seg) continue;

      // Min duration 500ms
      const duration = seg.endMs - seg.startMs;
      if (duration < MIN_SEGMENT_DURATION_MS) {
        seg.endMs = seg.startMs + MIN_SEGMENT_DURATION_MS;
      }

      // Ensure we don't overlap next segment start
      if (i < merged.length - 1) {
        const nextStart = merged[i + 1]?.startMs;
        if (nextStart !== undefined && seg.endMs > nextStart) {
          seg.endMs = nextStart;
        }
      }

      if (seg.words?.length) {
        seg.words = seg.words
          .map((word) => ({
            ...word,
            startMs: Math.max(seg.startMs, word.startMs),
            endMs: Math.min(seg.endMs, word.endMs),
          }))
          .filter((word) => word.endMs > word.startMs);

        // Rebuild segment text from surviving words to prevent text/timing mismatch.
        // If all words were filtered out, drop the segment entirely.
        if (seg.words.length === 0) {
          continue;
        }

        seg.text = this.rebuildTextFromWords(seg.words);
      }

      finalSegments.push(seg);
    }

    return finalSegments;
  }

  private rebuildTextFromWords(words: SubtitleWord[]): string {
    if (words.length === 0) {
      return '';
    }

    return words
      .map((word) => word.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const transcribeNormalizer = new TranscribeNormalizer();
