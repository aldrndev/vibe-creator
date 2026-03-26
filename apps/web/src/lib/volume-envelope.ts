/**
 * Volume Envelope System
 * Keyframe-based volume adjustments with Bezier interpolation
 */

export interface VolumeKeyframe {
  id: string;
  /** Time in milliseconds relative to clip start */
  timeMs: number;
  /** Volume level 0-2 (0=mute, 1=normal, 2=boost) */
  volume: number;
  /** Interpolation type to next keyframe */
  interpolation: 'linear' | 'smooth' | 'step';
}

export interface VolumeEnvelope {
  clipId: string;
  keyframes: VolumeKeyframe[];
}

/**
 * Create a unique ID for keyframes
 */
export function createKeyframeId(): string {
  return `kf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Default envelope - single keyframe at full volume
 */
export function createDefaultEnvelope(clipId: string): VolumeEnvelope {
  return {
    clipId,
    keyframes: [
      {
        id: createKeyframeId(),
        timeMs: 0,
        volume: 1,
        interpolation: 'linear',
      },
    ],
  };
}

/**
 * Add a keyframe to envelope, maintaining time order
 */
export function addKeyframe(
  envelope: VolumeEnvelope,
  timeMs: number,
  volume: number,
  interpolation: VolumeKeyframe['interpolation'] = 'linear',
): VolumeEnvelope {
  const newKeyframe: VolumeKeyframe = {
    id: createKeyframeId(),
    timeMs,
    volume: Math.max(0, Math.min(2, volume)),
    interpolation,
  };

  const keyframes = [...envelope.keyframes, newKeyframe].sort((a, b) => a.timeMs - b.timeMs);

  return { ...envelope, keyframes };
}

/**
 * Remove a keyframe by ID
 */
export function removeKeyframe(envelope: VolumeEnvelope, keyframeId: string): VolumeEnvelope {
  // Don't allow removing all keyframes
  if (envelope.keyframes.length <= 1) {
    return envelope;
  }

  return {
    ...envelope,
    keyframes: envelope.keyframes.filter((kf) => kf.id !== keyframeId),
  };
}

/**
 * Update a keyframe
 */
export function updateKeyframe(
  envelope: VolumeEnvelope,
  keyframeId: string,
  updates: Partial<Omit<VolumeKeyframe, 'id'>>,
): VolumeEnvelope {
  const keyframes = envelope.keyframes.map((kf) => {
    if (kf.id !== keyframeId) return kf;

    return {
      ...kf,
      ...updates,
      volume: updates.volume !== undefined ? Math.max(0, Math.min(2, updates.volume)) : kf.volume,
    };
  });

  // Re-sort if time changed
  if (updates.timeMs !== undefined) {
    keyframes.sort((a, b) => a.timeMs - b.timeMs);
  }

  return { ...envelope, keyframes };
}

/**
 * Get volume at a specific time using interpolation
 */
export function getVolumeAtTime(envelope: VolumeEnvelope, timeMs: number): number {
  const { keyframes } = envelope;

  if (keyframes.length === 0) return 1;
  if (keyframes.length === 1) return keyframes[0]?.volume ?? 1;

  // Find surrounding keyframes
  let prevKeyframe = keyframes[0];
  let nextKeyframe = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    const current = keyframes[i];
    const next = keyframes[i + 1];

    if (current && next && timeMs >= current.timeMs && timeMs <= next.timeMs) {
      prevKeyframe = current;
      nextKeyframe = next;
      break;
    }
  }

  if (!prevKeyframe || !nextKeyframe) return 1;

  // Before first keyframe
  if (timeMs <= prevKeyframe.timeMs) {
    return prevKeyframe.volume;
  }

  // After last keyframe
  if (timeMs >= nextKeyframe.timeMs) {
    return nextKeyframe.volume;
  }

  // Interpolate between keyframes
  const t = (timeMs - prevKeyframe.timeMs) / (nextKeyframe.timeMs - prevKeyframe.timeMs);

  switch (prevKeyframe.interpolation) {
    case 'step':
      return prevKeyframe.volume;

    case 'smooth': {
      // Smooth step (ease in-out)
      const smoothT = t * t * (3 - 2 * t);
      return prevKeyframe.volume + (nextKeyframe.volume - prevKeyframe.volume) * smoothT;
    }
    default:
      return prevKeyframe.volume + (nextKeyframe.volume - prevKeyframe.volume) * t;
  }
}

/**
 * Convert envelope to automation data for export
 */
export function envelopeToAutomation(
  envelope: VolumeEnvelope,
  clipDurationMs: number,
): Array<{ timeMs: number; volume: number }> {
  const points: Array<{ timeMs: number; volume: number }> = [];
  const sampleRate = 100; // Sample every 100ms

  for (let timeMs = 0; timeMs <= clipDurationMs; timeMs += sampleRate) {
    points.push({
      timeMs,
      volume: getVolumeAtTime(envelope, timeMs),
    });
  }

  return points;
}

/**
 * Envelope presets
 */
export const ENVELOPE_PRESETS: Array<{
  id: string;
  name: string;
  create: (durationMs: number) => VolumeKeyframe[];
}> = [
  {
    id: 'constant',
    name: 'Constant',
    create: () => [{ id: createKeyframeId(), timeMs: 0, volume: 1, interpolation: 'linear' }],
  },
  {
    id: 'fade-in',
    name: 'Fade In',
    create: (durationMs) => [
      { id: createKeyframeId(), timeMs: 0, volume: 0, interpolation: 'smooth' },
      {
        id: createKeyframeId(),
        timeMs: Math.min(1000, durationMs * 0.2),
        volume: 1,
        interpolation: 'linear',
      },
    ],
  },
  {
    id: 'fade-out',
    name: 'Fade Out',
    create: (durationMs) => [
      { id: createKeyframeId(), timeMs: 0, volume: 1, interpolation: 'linear' },
      {
        id: createKeyframeId(),
        timeMs: durationMs - Math.min(1000, durationMs * 0.2),
        volume: 1,
        interpolation: 'smooth',
      },
      { id: createKeyframeId(), timeMs: durationMs, volume: 0, interpolation: 'linear' },
    ],
  },
  {
    id: 'fade-in-out',
    name: 'Fade In/Out',
    create: (durationMs) => [
      { id: createKeyframeId(), timeMs: 0, volume: 0, interpolation: 'smooth' },
      {
        id: createKeyframeId(),
        timeMs: Math.min(500, durationMs * 0.1),
        volume: 1,
        interpolation: 'linear',
      },
      {
        id: createKeyframeId(),
        timeMs: durationMs - Math.min(500, durationMs * 0.1),
        volume: 1,
        interpolation: 'smooth',
      },
      { id: createKeyframeId(), timeMs: durationMs, volume: 0, interpolation: 'linear' },
    ],
  },
  {
    id: 'duck',
    name: 'Duck (Voiceover)',
    create: (durationMs) => [
      { id: createKeyframeId(), timeMs: 0, volume: 1, interpolation: 'smooth' },
      { id: createKeyframeId(), timeMs: 200, volume: 0.3, interpolation: 'linear' },
      { id: createKeyframeId(), timeMs: durationMs - 200, volume: 0.3, interpolation: 'smooth' },
      { id: createKeyframeId(), timeMs: durationMs, volume: 1, interpolation: 'linear' },
    ],
  },
];
