const LOOP_BOUNDARY_TOLERANCE_SECONDS = 0.03;

export function resolveLoopPreviewStartSeconds(trimStartMs: number): number {
  return Math.max(0, trimStartMs) / 1000;
}

export function shouldRestartLoopPreview(currentTimeSeconds: number, trimEndMs: number): boolean {
  return currentTimeSeconds >= Math.max(0, trimEndMs) / 1000 - LOOP_BOUNDARY_TOLERANCE_SECONDS;
}

export function shouldRestartPlayingLoopPreview(
  paused: boolean,
  currentTimeSeconds: number,
  trimEndMs: number,
): boolean {
  return !paused && shouldRestartLoopPreview(currentTimeSeconds, trimEndMs);
}
