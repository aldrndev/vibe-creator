import { useRef, useEffect } from "react";
import { useModernEditorStore } from "@/stores/modern-editor-store";
import type { AudioLayer } from "@vibe-creator/shared";

interface AudioLayerContentProps {
  layer: AudioLayer;
  assets: Array<{ id: string; url: string; type: string }>;
  layerStartMs: number;
}

export function AudioLayerContent({
  layer,
  assets,
  layerStartMs,
}: AudioLayerContentProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { isPlaying, currentTimeMs } = useModernEditorStore();
  const asset = assets.find((a) => a.id === layer.assetId);

  // Sync playback state
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (isPlaying && audio.paused) {
      audio.play().catch(() => {});
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying]);

  // Sync volume
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = Math.min(Math.max(layer.data.volume, 0), 1);
  }, [layer.data.volume]);

  // Sync time
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const layerTimeMs = currentTimeMs - layerStartMs;
    const audioTimeSec = Math.max(0, layerTimeMs / 1000);

    if (Math.abs(audio.currentTime - audioTimeSec) > 0.1) {
      audio.currentTime = audioTimeSec;
    }
  }, [currentTimeMs, layerStartMs]);

  if (!asset) return null;

  return <audio ref={audioRef} src={asset.url} />;
}
