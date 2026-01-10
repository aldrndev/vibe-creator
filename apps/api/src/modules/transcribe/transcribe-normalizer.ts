import { RawWhisperSegment } from "./whisper-runner.js";

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

    // 1. Convert to Ms and sorting
    let segments: SubtitleSegment[] = rawSegments
      .map((s) => ({
        startMs: Math.round(s.start * 1000),
        endMs: Math.round(s.end * 1000),
        text: s.text.trim(),
      }))
      .filter((s) => s.text.length > 0)
      .sort((a, b) => a.startMs - b.startMs);

    if (segments.length === 0) return [];

    const firstSegment = segments[0];
    if (!firstSegment) return [];

    const merged: SubtitleSegment[] = [];
    let current: SubtitleSegment = firstSegment;

    for (let i = 1; i < segments.length; i++) {
      const next = segments[i];
      if (!next) continue; // Should not happen due to loop bounds, but safe for TS

      const gap = next.startMs - current.endMs;

      // 2. Merge short gaps or overlaps if text is short?
      // Logic: if gap < 250ms, extending current might intersect next.
      // Usually we only merge if we want to combine text?
      // User Requirement: "Merge segments if gap < 250ms" -> Likely means extend end time?
      // Or merge text? "Merge adjacent segments" usually implies combining them into one subtitle block.
      // Let's assume merging text for now if they are close, to reduce flashing.
      // Both must exist to merge

      if (gap < 250 && gap >= -500) {
        // Allow slight overlap to merge
        current.endMs = next.endMs;
        current.text += " " + next.text;
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);

    // 3. Clamp Min Duration & Monotonicity
    const finalSegments: SubtitleSegment[] = [];

    for (let i = 0; i < merged.length; i++) {
      const seg = merged[i];
      if (!seg) continue; // Safety check

      let duration = seg.endMs - seg.startMs;

      // Min duration 600ms
      if (duration < 600) {
        seg.endMs = seg.startMs + 600;
      }

      // Ensure we don't overlap next segment start
      if (i < merged.length - 1) {
        const nextStart = merged[i + 1]?.startMs;
        if (nextStart !== undefined && seg.endMs > nextStart) {
          seg.endMs = nextStart; // Clip to next start
        }
      }

      finalSegments.push(seg);
    }

    return finalSegments;
  }
}

export const transcribeNormalizer = new TranscribeNormalizer();
