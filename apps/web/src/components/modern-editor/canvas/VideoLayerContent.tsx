import { useEffect, useRef } from 'react';
import { useModernEditorStore } from '@/stores/modern-editor-store';

interface VideoLayerContentProps {
  src: string;
  layerStartMs: number;
  layerTrimStartMs?: number;
  volume?: number;
}

export function VideoLayerContent({
  src,
  layerStartMs,
  layerTrimStartMs = 0,
  volume = 1,
}: VideoLayerContentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isPlaying, currentTimeMs } = useModernEditorStore();

  // Sync playback state
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    if (isPlaying && video.paused) {
      video.play().catch(() => {
        // Browser may block autoplay - silently fail
      });
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying]);

  // Sync volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = Math.min(Math.max(volume, 0), 1);
    }
  }, [volume]);

  // Sync video time with timeline
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    // Calculate video time relative to layer start and trim
    const layerTimeMs = currentTimeMs - layerStartMs + layerTrimStartMs;
    const videoTimeSec = Math.max(0, layerTimeMs / 1000);

    // Only seek if difference is significant to avoid stuttering
    if (Math.abs(video.currentTime - videoTimeSec) > 0.1) {
      video.currentTime = videoTimeSec;
    }
  }, [currentTimeMs, layerStartMs, layerTrimStartMs]);

  return (
    <video
      ref={videoRef}
      src={src}
      className="w-full h-full object-contain pointer-events-none"
      playsInline
      muted={volume === 0}
    />
  );
}
