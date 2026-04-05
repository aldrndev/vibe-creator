interface ClipPlaybackWindowInput {
  readonly startMs: number;
  readonly endMs: number;
}

interface ClipPlaybackWindow {
  readonly startSec: number;
  readonly durationSec: number;
}

/**
 * Resolve the playback window for a selectable clip.
 * The picker should preview the full clip duration, not a shortened snippet.
 */
export function getClipPlaybackWindow({
  startMs,
  endMs,
}: ClipPlaybackWindowInput): ClipPlaybackWindow {
  const durationMs = Math.max(endMs - startMs, 100);

  return {
    startSec: startMs / 1000,
    durationSec: durationMs / 1000,
  };
}
