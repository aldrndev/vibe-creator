const MIN_PROGRESS = 0;
const MAX_IN_PROGRESS = 99;
const PERCENT_COMPLETE = 100;

export const EXPORT_PROGRESS_RANGES = {
  validating: { start: 0, end: 5 },
  clips: { start: 5, end: 55 },
  concat: { start: 55, end: 65 },
  text: { start: 65, end: 78 },
  audio: { start: 78, end: 88 },
  finalizing: { start: 88, end: 96 },
  cleanup: { start: 96, end: 99 },
  completed: { start: 100, end: 100 },
} as const;

export interface ExportProgressRange {
  readonly start: number;
  readonly end: number;
}

/**
 * Clamp a progress value to the visible export range.
 */
export function clampExportProgress(value: number, max = MAX_IN_PROGRESS): number {
  if (!Number.isFinite(value)) {
    return MIN_PROGRESS;
  }

  return Math.max(MIN_PROGRESS, Math.min(max, value));
}

/**
 * Map a child FFmpeg phase progress into an overall export progress range.
 */
export function mapSubProgressToOverall(range: ExportProgressRange, phasePercent: number): number {
  const normalizedPercent = clampExportProgress(phasePercent, PERCENT_COMPLETE) / PERCENT_COMPLETE;
  return range.start + (range.end - range.start) * normalizedPercent;
}

/**
 * Divide the visual clip render range evenly across timeline clips.
 */
export function getClipProgressRange(clipIndex: number, clipCount: number): ExportProgressRange {
  const safeClipCount = Math.max(1, Math.floor(clipCount));
  const safeIndex = Math.max(0, Math.min(safeClipCount - 1, Math.floor(clipIndex)));
  const clipSpan =
    (EXPORT_PROGRESS_RANGES.clips.end - EXPORT_PROGRESS_RANGES.clips.start) / safeClipCount;
  const start = EXPORT_PROGRESS_RANGES.clips.start + safeIndex * clipSpan;

  return {
    start,
    end: start + clipSpan,
  };
}
