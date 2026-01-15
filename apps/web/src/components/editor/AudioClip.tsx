import { useState, useCallback, useRef, useEffect } from "react";
import { WaveformDisplay } from "./WaveformDisplay";
import { useEditorStore, type EditorClip } from "@/stores/editor-store";
import { cn } from "@/lib/utils";
import { Volume2, VolumeX, Music } from "lucide-react";

interface AudioClipProps {
  clip: EditorClip;
  trackId: string;
  pixelsPerMs: number;
  isSelected: boolean;
  onSelect: () => void;
}

export function AudioClip({
  clip,
  trackId,
  pixelsPerMs,
  isSelected,
  onSelect,
}: AudioClipProps) {
  const { updateClip } = useEditorStore();

  const [isDraggingFadeIn, setIsDraggingFadeIn] = useState(false);
  const [isDraggingFadeOut, setIsDraggingFadeOut] = useState(false);
  const clipRef = useRef<HTMLDivElement>(null);

  const clipWidth = (clip.endMs - clip.startMs) * pixelsPerMs;
  const clipLeft = clip.startMs * pixelsPerMs;

  const fadeInMs = clip.effects?.fadeIn ?? 0;
  const fadeOutMs = clip.effects?.fadeOut ?? 0;
  const volume = clip.effects?.volume ?? 1;
  const isMuted = volume === 0;

  const handleFadeInDrag = useCallback(
    (e: MouseEvent) => {
      if (!clipRef.current || !isDraggingFadeIn) return;
      const rect = clipRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const fadeMs = Math.max(
        0,
        Math.min(x / pixelsPerMs, clip.endMs - clip.startMs - fadeOutMs)
      );
      updateClip(trackId, clip.id, {
        effects: { ...clip.effects, fadeIn: Math.round(fadeMs) },
      });
    },
    [isDraggingFadeIn, pixelsPerMs, clip, trackId, updateClip, fadeOutMs]
  );

  const handleFadeOutDrag = useCallback(
    (e: MouseEvent) => {
      if (!clipRef.current || !isDraggingFadeOut) return;
      const rect = clipRef.current.getBoundingClientRect();
      const x = rect.right - e.clientX;
      const fadeMs = Math.max(
        0,
        Math.min(x / pixelsPerMs, clip.endMs - clip.startMs - fadeInMs)
      );
      updateClip(trackId, clip.id, {
        effects: { ...clip.effects, fadeOut: Math.round(fadeMs) },
      });
    },
    [isDraggingFadeOut, pixelsPerMs, clip, trackId, updateClip, fadeInMs]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingFadeIn(false);
    setIsDraggingFadeOut(false);
  }, []);

  useEffect(() => {
    if (isDraggingFadeIn || isDraggingFadeOut) {
      window.addEventListener(
        "mousemove",
        isDraggingFadeIn ? handleFadeInDrag : handleFadeOutDrag
      );
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener(
          "mousemove",
          isDraggingFadeIn ? handleFadeInDrag : handleFadeOutDrag
        );
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [
    isDraggingFadeIn,
    isDraggingFadeOut,
    handleFadeInDrag,
    handleFadeOutDrag,
    handleMouseUp,
  ]);

  const fadeInWidth = fadeInMs * pixelsPerMs;
  const fadeOutWidth = fadeOutMs * pixelsPerMs;

  return (
    <div
      ref={clipRef}
      className={cn(
        "absolute top-2 bottom-2 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border backdrop-blur-sm",
        isSelected
          ? "bg-emerald-500/30 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20"
          : "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40"
      )}
      style={{
        left: clipLeft,
        width: Math.max(clipWidth, 40),
      }}
      onClick={onSelect}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />

      {/* Waveform */}
      {clip.asset?.url && (
        <div className="absolute inset-0 px-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <WaveformDisplay
            audioUrl={clip.asset.url}
            assetId={clip.assetId ?? clip.id}
            width={Math.max(clipWidth, 50)}
            height={44}
            color={isMuted ? "#4b5563" : "#10b981"}
            className="absolute inset-0"
            startMs={clip.trimStartMs}
            endMs={clip.trimStartMs + (clip.endMs - clip.startMs)}
          />
        </div>
      )}

      {/* Fade Overlays */}
      {fadeInMs > 0 && (
        <div
          className="absolute top-0 bottom-0 left-0 pointer-events-none transition-all duration-300"
          style={{
            width: fadeInWidth,
            background:
              "linear-gradient(to right, rgba(0,0,0,0.6), transparent)",
          }}
        />
      )}
      {fadeOutMs > 0 && (
        <div
          className="absolute top-0 bottom-0 right-0 pointer-events-none transition-all duration-300"
          style={{
            width: fadeOutWidth,
            background:
              "linear-gradient(to left, rgba(0,0,0,0.6), transparent)",
          }}
        />
      )}

      {/* Controls Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <Music size={10} className="text-emerald-400 flex-shrink-0" />
          <span className="text-[9px] font-black uppercase tracking-tight text-white/80 truncate">
            {clip.asset?.name || "Audio Signal"}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded-md backdrop-blur-md">
          {isMuted ? (
            <VolumeX size={8} className="text-destructive" />
          ) : (
            <Volume2 size={8} className="text-emerald-400" />
          )}
          <span className="text-[8px] font-black text-white/60">
            {isMuted ? "MUTE" : `${Math.round(volume * 100)}%`}
          </span>
        </div>
      </div>

      {/* Fade Handles */}
      {isSelected && (
        <>
          <div
            className="absolute top-0 bottom-0 w-4 cursor-ew-resize group/fadein z-20 flex items-center justify-center -translate-x-2"
            style={{ left: fadeInWidth }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDraggingFadeIn(true);
            }}
          >
            <div className="w-1.5 h-6 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover/fadein:scale-125 transition-transform border border-white/20" />
          </div>
          <div
            className="absolute top-0 bottom-0 w-4 cursor-ew-resize group/fadeout z-20 flex items-center justify-center translate-x-2"
            style={{ right: fadeOutWidth }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDraggingFadeOut(true);
            }}
          >
            <div className="w-1.5 h-6 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover/fadeout:scale-125 transition-transform border border-white/20" />
          </div>
        </>
      )}
    </div>
  );
}
