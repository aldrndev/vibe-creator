import type { RawWhisperSegment } from './whisper-runner.js';

export interface SubtitleSegment {
  startMs: number;
  endMs: number;
  text: string;
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

    const segments = this.preprocessSegments(rawSegments);
    if (segments.length === 0) return [];

    const merged = this.mergeSegments(segments);
    return this.clampAndEnsureMonotonicity(merged);
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

      finalSegments.push(seg);
    }

    return finalSegments;
  }
}

export const transcribeNormalizer = new TranscribeNormalizer();
