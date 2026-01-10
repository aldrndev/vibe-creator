import { useRef, useEffect, useState, useMemo } from "react";
import { Button, Slider } from "@/components/ui";
import { Play, Pause } from "lucide-react";
import type { EditorTimeline } from "@/stores/editor-store";
import { FILTER_PRESETS } from "@/components/editor/InspectorPanel";

interface PreviewPlayerProps {
  timeline: EditorTimeline;
  aspectRatio?: number;
}

export function PreviewPlayer({
  timeline,
  aspectRatio = 9 / 16,
}: PreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  // Calculate duration from timeline
  useEffect(() => {
    let max = 0;
    timeline.tracks.forEach((t) => {
      t.clips.forEach((c) => {
        if (c.endMs > max) max = c.endMs;
      });
    });
    setDurationMs(max || 10000);
  }, [timeline]);

  // Animation Loop
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      if (isPlaying) {
        setCurrentTimeMs((prev) => {
          const next = prev + dt;
          if (next >= durationMs) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      animationFrame = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      animationFrame = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, durationMs]);

  // Find active clip
  const activeClip = useMemo(() => {
    const videoTrack = timeline.tracks.find((t) => t.type === "VIDEO");
    if (!videoTrack) return null;
    return videoTrack.clips.find(
      (c) => currentTimeMs >= c.startMs && currentTimeMs < c.endMs
    );
  }, [timeline, currentTimeMs]);

  // Calculate Styles
  const videoStyles = useMemo(() => {
    if (!activeClip) return { opacity: 0 };

    const transforms = activeClip.transforms || {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    };
    const effects = activeClip.effects || { filters: [], speed: 1, volume: 1 };

    let filterCss = "";
    if (effects.filters && effects.filters.length > 0) {
      const preset = FILTER_PRESETS.find((p) => p.id === effects.filters[0]);
      if (preset) filterCss = preset.css;
    }

    return {
      filter: filterCss || undefined,
      transform: `translate(${transforms.x}px, ${transforms.y}px) scale(${transforms.scale}) rotate(${transforms.rotation}deg)`,
      opacity: transforms.opacity,
      transformOrigin: "center center",
      width: "100%",
      height: "100%",
      objectFit: "contain" as const,
    };
  }, [activeClip]);

  // Sync Video Element
  useEffect(() => {
    if (!videoRef.current || !activeClip?.asset?.url) return;

    const video = videoRef.current;
    const clipTimeMs =
      currentTimeMs - activeClip.startMs + (activeClip.trimStartMs || 0);
    const videoTimeSec = clipTimeMs / 1000;

    if (video.src !== activeClip.asset.url) {
      video.src = activeClip.asset.url;
      video.load();
    }

    if (Math.abs(video.currentTime - videoTimeSec) > 0.2) {
      video.currentTime = videoTimeSec;
    }

    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [activeClip, isPlaying, currentTimeMs]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <div
      className="relative group bg-black rounded-lg overflow-hidden border border-border"
      style={{ aspectRatio }}
    >
      {/* Render Layer */}
      {activeClip ? (
        <video
          ref={videoRef}
          className="absolute inset-0 pointer-events-none"
          style={videoStyles}
          playsInline
          muted
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
          No Signal
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 bg-black/20 flex flex-col justify-end p-4 transition-opacity ${
          isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
        }`}
      >
        <div className="flex items-center gap-2">
          <Button size="icon" variant="secondary" onClick={togglePlay}>
            {isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
          </Button>
          <Slider
            min={0}
            max={durationMs}
            step={100}
            value={[currentTimeMs]}
            onValueChange={(v: number[]) => {
              setCurrentTimeMs(v[0] ?? 0);
              setIsPlaying(false);
            }}
            className="flex-1"
          />
          <span className="text-xs font-mono text-white/80">
            {Math.floor(currentTimeMs / 1000)}s
          </span>
        </div>
      </div>
    </div>
  );
}
