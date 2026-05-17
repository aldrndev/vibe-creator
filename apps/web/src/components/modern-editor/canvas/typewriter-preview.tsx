import { useEffect, useMemo, useState } from 'react';

const TYPEWRITER_MIN_DURATION_MS = 450;
const TYPEWRITER_MAX_DURATION_MS = 1600;
const TYPEWRITER_MS_PER_CHARACTER = 35;

interface TypewriterPreviewTextProps {
  text: string;
  layerDurationMs: number;
}

export function getTypewriterPreviewDurationMs(text: string, layerDurationMs: number): number {
  const characterCount = Math.max(1, Array.from(text).length);
  const naturalDurationMs = characterCount * TYPEWRITER_MS_PER_CHARACTER;
  const boundedDurationMs = Math.min(
    TYPEWRITER_MAX_DURATION_MS,
    Math.max(TYPEWRITER_MIN_DURATION_MS, naturalDurationMs),
  );

  return Math.max(1, Math.min(Math.max(1, layerDurationMs), boundedDurationMs));
}

export function TypewriterPreviewText({ text, layerDurationMs }: TypewriterPreviewTextProps) {
  const characters = useMemo(() => Array.from(text), [text]);
  const [visibleCount, setVisibleCount] = useState(characters.length);

  useEffect(() => {
    if (characters.length === 0 || typeof window === 'undefined') {
      setVisibleCount(characters.length);
      return undefined;
    }

    const durationMs = getTypewriterPreviewDurationMs(text, layerDurationMs);
    const startedAt = window.performance.now();
    let frameId = 0;

    setVisibleCount(0);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      setVisibleCount(Math.ceil(characters.length * progress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [characters.length, layerDurationMs, text]);

  return <>{characters.slice(0, visibleCount).join('')}</>;
}
