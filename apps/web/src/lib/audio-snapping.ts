/**
 * Audio Snapping System
 * Snaps audio clips to video clip boundaries for precise alignment
 */

interface ClipBoundary {
  id: string;
  trackId: string;
  type: 'VIDEO' | 'AUDIO';
  startMs: number;
  endMs: number;
}

/**
 * Snapping configuration
 */
export interface SnapConfig {
  /** Enable/disable snapping */
  enabled: boolean;
  /** Snap threshold in pixels */
  threshold: number;
  /** Snap to clip starts */
  snapToStarts: boolean;
  /** Snap to clip ends */
  snapToEnds: boolean;
  /** Snap to playhead */
  snapToPlayhead: boolean;
  /** Snap to other clips on same track */
  snapToSameTrack: boolean;
  /** Snap to clips on other tracks */
  snapToCrossTrack: boolean;
}

/**
 * Default snap configuration
 */
export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  enabled: true,
  threshold: 10,
  snapToStarts: true,
  snapToEnds: true,
  snapToPlayhead: true,
  snapToSameTrack: true,
  snapToCrossTrack: true,
};

/**
 * Snap point for visualization
 */
export interface SnapPoint {
  timeMs: number;
  type: 'start' | 'end' | 'playhead';
  sourceClipId?: string;
  sourceTrackId?: string;
}

/**
 * Get all snap points from clips
 */
export function getSnapPoints(
  clips: ClipBoundary[],
  config: SnapConfig,
  playheadMs?: number,
): SnapPoint[] {
  const points: SnapPoint[] = [];

  clips.forEach((clip) => {
    if (config.snapToStarts) {
      points.push({
        timeMs: clip.startMs,
        type: 'start',
        sourceClipId: clip.id,
        sourceTrackId: clip.trackId,
      });
    }

    if (config.snapToEnds) {
      points.push({
        timeMs: clip.endMs,
        type: 'end',
        sourceClipId: clip.id,
        sourceTrackId: clip.trackId,
      });
    }
  });

  if (config.snapToPlayhead && playheadMs !== undefined) {
    points.push({
      timeMs: playheadMs,
      type: 'playhead',
    });
  }

  // Remove duplicates
  const seen = new Set<number>();
  return points.filter((p) => {
    if (seen.has(p.timeMs)) return false;
    seen.add(p.timeMs);
    return true;
  });
}

/**
 * Find nearest snap point
 */
export function findNearestSnapPoint(
  targetMs: number,
  snapPoints: SnapPoint[],
  thresholdMs: number,
  excludeClipId?: string,
): SnapPoint | null {
  let nearest: SnapPoint | null = null;
  let nearestDistance = Infinity;

  for (const point of snapPoints) {
    // Skip self
    if (excludeClipId && point.sourceClipId === excludeClipId) {
      continue;
    }

    const distance = Math.abs(point.timeMs - targetMs);

    if (distance < thresholdMs && distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/**
 * Snap result
 */
export interface SnapResult {
  snapped: boolean;
  originalMs: number;
  snappedMs: number;
  snapPoint: SnapPoint | null;
}

/**
 * Calculate snapped position for a clip edge
 */
export function calculateSnappedPosition(
  targetMs: number,
  clips: ClipBoundary[],
  config: SnapConfig,
  pixelsPerMs: number,
  playheadMs?: number,
  excludeClipId?: string,
  excludeTrackId?: string,
): SnapResult {
  if (!config.enabled) {
    return {
      snapped: false,
      originalMs: targetMs,
      snappedMs: targetMs,
      snapPoint: null,
    };
  }

  // Filter clips based on config
  let filteredClips = clips;

  if (!config.snapToCrossTrack && excludeTrackId) {
    filteredClips = clips.filter((c) => c.trackId === excludeTrackId);
  }

  if (!config.snapToSameTrack && excludeTrackId) {
    filteredClips = clips.filter((c) => c.trackId !== excludeTrackId);
  }

  // Get snap points
  const snapPoints = getSnapPoints(filteredClips, config, playheadMs);

  // Convert pixel threshold to milliseconds
  const thresholdMs = config.threshold / pixelsPerMs;

  // Find nearest snap point
  const nearest = findNearestSnapPoint(targetMs, snapPoints, thresholdMs, excludeClipId);

  if (nearest) {
    return {
      snapped: true,
      originalMs: targetMs,
      snappedMs: nearest.timeMs,
      snapPoint: nearest,
    };
  }

  return {
    snapped: false,
    originalMs: targetMs,
    snappedMs: targetMs,
    snapPoint: null,
  };
}

/**
 * Snap both start and end of a clip during move
 */
export function snapClipDuringMove(
  clipStartMs: number,
  clipEndMs: number,
  clips: ClipBoundary[],
  config: SnapConfig,
  pixelsPerMs: number,
  playheadMs?: number,
  clipId?: string,
  trackId?: string,
): { startMs: number; endMs: number; snapped: boolean } {
  const clipDuration = clipEndMs - clipStartMs;

  // Try snapping start
  const startResult = calculateSnappedPosition(
    clipStartMs,
    clips,
    config,
    pixelsPerMs,
    playheadMs,
    clipId,
    trackId,
  );

  if (startResult.snapped) {
    return {
      startMs: startResult.snappedMs,
      endMs: startResult.snappedMs + clipDuration,
      snapped: true,
    };
  }

  // Try snapping end
  const endResult = calculateSnappedPosition(
    clipEndMs,
    clips,
    config,
    pixelsPerMs,
    playheadMs,
    clipId,
    trackId,
  );

  if (endResult.snapped) {
    return {
      startMs: endResult.snappedMs - clipDuration,
      endMs: endResult.snappedMs,
      snapped: true,
    };
  }

  return {
    startMs: clipStartMs,
    endMs: clipEndMs,
    snapped: false,
  };
}

/**
 * Check for overlap with other clips
 */
export function checkClipOverlap(
  startMs: number,
  endMs: number,
  trackId: string,
  clips: ClipBoundary[],
  excludeClipId?: string,
): boolean {
  const trackClips = clips.filter((c) => c.trackId === trackId && c.id !== excludeClipId);

  for (const clip of trackClips) {
    // Check for overlap
    if (startMs < clip.endMs && endMs > clip.startMs) {
      return true;
    }
  }

  return false;
}

/**
 * Find nearest gap for placing a clip
 */
export function findNearestGap(
  preferredStartMs: number,
  clipDurationMs: number,
  trackId: string,
  clips: ClipBoundary[],
  maxSearchMs: number = 60000,
): { startMs: number; found: boolean } {
  const trackClips = clips
    .filter((c) => c.trackId === trackId)
    .sort((a, b) => a.startMs - b.startMs);

  // Check if preferred position works
  if (!checkClipOverlap(preferredStartMs, preferredStartMs + clipDurationMs, trackId, clips)) {
    return { startMs: preferredStartMs, found: true };
  }

  // Search for gaps
  let searchStart = 0;

  for (const clip of trackClips) {
    const gapStart = searchStart;
    const gapEnd = clip.startMs;
    const gapDuration = gapEnd - gapStart;

    if (gapDuration >= clipDurationMs) {
      // Check if this gap is within search range
      if (Math.abs(gapStart - preferredStartMs) < maxSearchMs) {
        return { startMs: gapStart, found: true };
      }
    }

    searchStart = clip.endMs;
  }

  // Check gap after last clip
  if (!checkClipOverlap(searchStart, searchStart + clipDurationMs, trackId, clips)) {
    return { startMs: searchStart, found: true };
  }

  return { startMs: preferredStartMs, found: false };
}
