export interface SelectedClipRangeInput {
  readonly candidateStartMs: number;
  readonly candidateEndMs: number;
  readonly trimStartMs?: number | null;
  readonly trimEndMs?: number | null;
}

export interface SelectedClipRange {
  readonly startMs: number;
  readonly endMs: number;
}

const MIN_CLIP_DURATION_MS = 250;

export function resolveSelectedClipRangeMs({
  candidateStartMs,
  candidateEndMs,
  trimStartMs,
  trimEndMs,
}: SelectedClipRangeInput): SelectedClipRange {
  const normalizedTrimStart = Math.max(0, trimStartMs ?? 0);
  const normalizedTrimEnd = Math.max(0, trimEndMs ?? 0);
  const startMs = candidateStartMs + normalizedTrimStart;
  const endMs = candidateEndMs - normalizedTrimEnd;

  if (endMs - startMs < MIN_CLIP_DURATION_MS) {
    throw new Error('Durasi klip terlalu pendek setelah trim');
  }

  return { startMs, endMs };
}
