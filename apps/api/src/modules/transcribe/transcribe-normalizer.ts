import type { RawWhisperSegment, RawWhisperWord } from './whisper-runner.js';

export interface SubtitleWord {
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
}

export interface SubtitleSegment {
  startMs: number;
  endMs: number;
  text: string;
  words?: SubtitleWord[];
}

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

    const wordSegments = this.buildWordSegments(rawSegments);
    if (wordSegments.length > 0) {
      return this.clampAndEnsureMonotonicity(wordSegments);
    }

    const segments = this.preprocessSegments(rawSegments);
    if (segments.length === 0) return [];

    const merged = this.mergeSegments(segments);
    return this.clampAndEnsureMonotonicity(merged);
  }

  private buildWordSegments(rawSegments: RawWhisperSegment[]): SubtitleSegment[] {
    const words = rawSegments
      .flatMap((segment) => segment.words ?? [])
      .map((word) => this.normalizeWord(word))
      .filter((word): word is SubtitleWord => word !== null)
      .sort((a, b) => a.startMs - b.startMs);

    if (words.length === 0) {
      return [];
    }

    const firstWord = words[0];
    if (!firstWord) {
      return [];
    }

    const grouped: SubtitleSegment[] = [];
    let current: SubtitleSegment = { ...firstWord, words: [{ ...firstWord }] };
    let wordCount = this.countWords(current.text);

    for (let i = 1; i < words.length; i++) {
      const next = words[i];
      if (!next) {
        continue;
      }

      const gap = next.startMs - current.endMs;
      const duration = current.endMs - current.startMs;
      const shouldBreak =
        gap > 350 ||
        wordCount >= 5 ||
        duration >= 1800 ||
        this.endsSentence(current.text) ||
        this.startsNewSentence(next.text);

      if (shouldBreak) {
        grouped.push(current);
        current = { ...next, words: [{ ...next }] };
        wordCount = this.countWords(current.text);
        continue;
      }

      current = {
        startMs: current.startMs,
        endMs: next.endMs,
        text: `${current.text} ${next.text}`.replace(/\s+/g, ' ').trim(),
        words: [...(current.words ?? []), { ...next }],
      };
      wordCount += this.countWords(next.text);
    }

    grouped.push(current);
    return grouped;
  }

  private preprocessSegments(rawSegments: RawWhisperSegment[]): SubtitleSegment[] {
    return rawSegments
      .map((s) => ({
        startMs: Math.round(s.start * 1000),
        endMs: Math.round(s.end * 1000),
        text: s.text.trim(),
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
    };
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  private endsSentence(text: string): boolean {
    return /[.!?]$/.test(text.trim());
  }

  private startsNewSentence(text: string): boolean {
    return /^[A-Z]/.test(text.trim());
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

      // Merge if gap < 250ms and gap >= -500ms
      if (gap < 250 && gap >= -500) {
        current.endMs = next.endMs;
        current.text += ` ${next.text}`;
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

      // Min duration 600ms
      const duration = seg.endMs - seg.startMs;
      if (duration < 600) {
        seg.endMs = seg.startMs + 600;
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
      }

      finalSegments.push(seg);
    }

    return finalSegments;
  }
}

export const transcribeNormalizer = new TranscribeNormalizer();
