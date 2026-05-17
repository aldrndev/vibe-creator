import { describe, expect, it } from 'vitest';
import {
  clampExportProgress,
  EXPORT_PROGRESS_RANGES,
  getClipProgressRange,
  mapSubProgressToOverall,
} from './export-progress';

describe('export progress helpers', () => {
  it('maps child phase progress into the requested export range', () => {
    expect(mapSubProgressToOverall({ start: 20, end: 40 }, 0)).toBe(20);
    expect(mapSubProgressToOverall({ start: 20, end: 40 }, 50)).toBe(30);
    expect(mapSubProgressToOverall({ start: 20, end: 40 }, 100)).toBe(40);
  });

  it('clamps invalid and out-of-range progress values', () => {
    expect(clampExportProgress(Number.NaN)).toBe(0);
    expect(clampExportProgress(-10)).toBe(0);
    expect(clampExportProgress(120)).toBe(99);
    expect(mapSubProgressToOverall({ start: 10, end: 20 }, 150)).toBe(20);
  });

  it('divides clip progress range evenly and safely', () => {
    expect(getClipProgressRange(0, 2)).toEqual({ start: 5, end: 30 });
    expect(getClipProgressRange(1, 2)).toEqual({ start: 30, end: 55 });
    expect(getClipProgressRange(99, 2)).toEqual({ start: 30, end: 55 });
    expect(getClipProgressRange(0, 0)).toEqual(EXPORT_PROGRESS_RANGES.clips);
  });
});
