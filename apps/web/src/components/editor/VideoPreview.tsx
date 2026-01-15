import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { FILTER_PRESETS } from "./InspectorPanel";
import { cn } from "@/lib/utils";
import { Film, RotateCw } from "lucide-react";

// Resize handle positions
type HandlePosition =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "rotate";

interface DragState {
  id: string;
  type: "move" | "resize" | "rotate";
  handle?: HandlePosition;
  startX: number;
  startY: number;
  startPosX: number;
  startPosY: number;
  startFontSize: number;
  startRotation: number;
}

// Text overlay layer component with drag, resize, and rotation
function TextOverlayLayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    textOverlays,
    currentTimeMs,
    selectedTextOverlayId,
    selectTextOverlay,
    updateTextOverlay,
  } = useEditorStore();
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Filter overlays visible at current time
  const visibleOverlays = textOverlays.filter(
    (overlay) =>
      currentTimeMs >= overlay.startMs && currentTimeMs < overlay.endMs
  );

  // Handle drag/resize/rotate move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
      const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;

      if (dragState.type === "move") {
        const newX = Math.max(0, Math.min(100, dragState.startPosX + deltaX));
        const newY = Math.max(0, Math.min(100, dragState.startPosY + deltaY));
        updateTextOverlay(dragState.id, { x: newX, y: newY });
      } else if (dragState.type === "resize") {
        const deltaSize = (deltaX + deltaY) / 2;
        const scaleFactor =
          dragState.handle?.includes("w") || dragState.handle?.includes("n")
            ? -1
            : 1;
        const newFontSize = Math.max(
          12,
          Math.min(300, dragState.startFontSize + deltaSize * scaleFactor * 2)
        );
        updateTextOverlay(dragState.id, { fontSize: Math.round(newFontSize) });
      } else if (dragState.type === "rotate") {
        const overlay = textOverlays.find((o) => o.id === dragState.id);
        if (!overlay) return;

        const centerX = rect.left + (overlay.x / 100) * rect.width;
        const centerY = rect.top + (overlay.y / 100) * rect.height;

        const angle =
          Math.atan2(e.clientY - centerY, e.clientX - centerX) *
          (180 / Math.PI);
        const snappedAngle = Math.round(angle / 5) * 5;

        if (overlay.rotation !== snappedAngle) {
          updateTextOverlay(dragState.id, { rotation: snappedAngle });
        }
      }
    },
    [dragState, updateTextOverlay, textOverlays]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const handleMoveStart = (
    e: React.MouseEvent,
    overlay: (typeof textOverlays)[0]
  ) => {
    e.stopPropagation();
    selectTextOverlay(overlay.id);
    setDragState({
      id: overlay.id,
      type: "move",
      startX: e.clientX,
      startY: e.clientY,
      startPosX: overlay.x,
      startPosY: overlay.y,
      startFontSize: overlay.fontSize,
      startRotation: overlay.rotation || 0,
    });
  };

  const handleResizeStart = (
    e: React.MouseEvent,
    overlay: (typeof textOverlays)[0],
    handle: HandlePosition
  ) => {
    e.stopPropagation();
    selectTextOverlay(overlay.id);
    setDragState({
      id: overlay.id,
      type: "resize",
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: overlay.x,
      startPosY: overlay.y,
      startFontSize: overlay.fontSize,
      startRotation: overlay.rotation || 0,
    });
  };

  const handleRotateStart = (
    e: React.MouseEvent,
    overlay: (typeof textOverlays)[0]
  ) => {
    e.stopPropagation();
    selectTextOverlay(overlay.id);
    setDragState({
      id: overlay.id,
      type: "rotate",
      startX: e.clientX,
      startY: e.clientY,
      startPosX: overlay.x,
      startPosY: overlay.y,
      startFontSize: overlay.fontSize,
      startRotation: overlay.rotation || 0,
    });
  };

  const renderHandles = (overlay: (typeof textOverlays)[0]) => {
    const handleClass =
      "absolute w-4 h-4 bg-primary border-2 border-white rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] cursor-pointer z-50 transition-transform hover:scale-125";
    const handles: {
      pos: HandlePosition;
      style: React.CSSProperties;
      cursor: string;
    }[] = [
      { pos: "nw", style: { top: -8, left: -8 }, cursor: "nwse-resize" },
      { pos: "ne", style: { top: -8, right: -8 }, cursor: "nesw-resize" },
      { pos: "se", style: { bottom: -8, right: -8 }, cursor: "nwse-resize" },
      { pos: "sw", style: { bottom: -8, left: -8 }, cursor: "nesw-resize" },
    ];

    return (
      <div className="absolute inset-0 pointer-events-none border-2 border-primary/50 rounded-lg animate-in fade-in zoom-in duration-200">
        {handles.map(({ pos, style, cursor }) => (
          <div
            key={pos}
            className={cn(handleClass, "pointer-events-auto")}
            style={{ ...style, cursor }}
            onMouseDown={(e) => handleResizeStart(e, overlay, pos)}
          />
        ))}
        {/* Rotation handle */}
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-primary text-primary flex items-center justify-center rounded-full shadow-xl cursor-grab z-50 pointer-events-auto hover:bg-primary hover:text-white transition-all"
          onMouseDown={(e) => handleRotateStart(e, overlay)}
        >
          <RotateCw size={12} />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-primary/40" />
        </div>
      </div>
    );
  };

  if (visibleOverlays.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
    >
      {visibleOverlays.map((overlay) => {
        const isSelected = overlay.id === selectedTextOverlayId;
        const isDragging = dragState?.id === overlay.id;
        const rotation = overlay.rotation || 0;
        const durationMs = overlay.endMs - overlay.startMs;
        const progress = (currentTimeMs - overlay.startMs) / durationMs;

        const animationStyle: React.CSSProperties = {
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          opacity: 1,
        };

        if (progress >= 0 && progress < 0.1) {
          const entryProgress = progress * 10;
          switch (overlay.animation) {
            case "fade":
              animationStyle.opacity = entryProgress;
              break;
            case "slide-up":
              animationStyle.transform = `translate(-50%, calc(-50% + ${
                (1 - entryProgress) * 30
              }px)) rotate(${rotation}deg)`;
              animationStyle.opacity = entryProgress;
              break;
            case "slide-down":
              animationStyle.transform = `translate(-50%, calc(-50% - ${
                (1 - entryProgress) * 30
              }px)) rotate(${rotation}deg)`;
              animationStyle.opacity = entryProgress;
              break;
          }
        }

        return (
          <div
            key={overlay.id}
            className={cn(
              "absolute pointer-events-auto cursor-grab transition-shadow select-none group/overlay",
              isSelected && "z-50",
              isDragging && "cursor-grabbing"
            )}
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              transform: animationStyle.transform,
              fontFamily: overlay.fontFamily,
              fontSize: `${overlay.fontSize}px`,
              fontWeight: overlay.fontWeight,
              fontStyle: overlay.fontStyle,
              color: overlay.color,
              backgroundColor: overlay.backgroundColor || "transparent",
              padding: overlay.backgroundColor ? "12px 24px" : "4px 8px",
              borderRadius: 12,
              textAlign: overlay.textAlign,
              whiteSpace: "pre-wrap",
              opacity: animationStyle.opacity,
              maxWidth: "90%",
              textShadow: !overlay.backgroundColor
                ? "0 4px 12px rgba(0,0,0,0.8)"
                : "none",
              filter: isSelected
                ? "drop-shadow(0 0 10px rgba(var(--primary), 0.3))"
                : "none",
            }}
            onMouseDown={(e) => handleMoveStart(e, overlay)}
          >
            {overlay.text}
            {isSelected && renderHandles(overlay)}
          </div>
        );
      })}
    </div>
  );
}

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { timeline, currentTimeMs, isPlaying, projectSettings } =
    useEditorStore();

  const activeClip = useMemo(() => {
    const videoTrack = timeline.tracks.find((t) => t.type === "VIDEO");
    if (!videoTrack) return null;
    return videoTrack.clips.find(
      (c) => currentTimeMs >= c.startMs && currentTimeMs < c.endMs
    );
  }, [timeline, currentTimeMs]);

  const videoStyles = useMemo(() => {
    if (!activeClip) return {};
    const transforms = activeClip.transforms || {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    };
    const effects = activeClip.effects || {
      filters: [],
      speed: 1,
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
    };
    let filterCss = "";
    if (effects.filters && effects.filters.length > 0) {
      const preset = FILTER_PRESETS.find((p) => p.id === effects.filters[0]);
      if (preset) filterCss = preset.css;
    }
    return {
      filter: filterCss || undefined,
      transform: `translate(${transforms.x}px, ${transforms.y}px) scale(${transforms.scale}) rotate(${transforms.rotation}deg)`,
      opacity: transforms.opacity,
      transition: "filter 0.3s ease, transform 0.1s ease",
    };
  }, [activeClip]);

  useEffect(() => {
    if (!videoRef.current || !activeClip?.asset?.url) return;
    const video = videoRef.current;
    if (video.src !== activeClip.asset.url) {
      video.src = activeClip.asset.url;
      video.load();
    }
    const videoTimeSec =
      (currentTimeMs - activeClip.startMs + activeClip.trimStartMs) / 1000;
    if (Math.abs(video.currentTime - videoTimeSec) > 0.1)
      video.currentTime = videoTimeSec;
    if (isPlaying && video.paused) video.play().catch(() => {});
    else if (!isPlaying && !video.paused) video.pause();
  }, [currentTimeMs, isPlaying, activeClip]);

  useEffect(() => {
    if (!videoRef.current || !activeClip) return;
    videoRef.current.playbackRate = activeClip.effects?.speed ?? 1;
    videoRef.current.volume = activeClip.effects?.volume ?? 1;
  }, [activeClip]);

  const aspectRatio = projectSettings.width / projectSettings.height;

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-black/40 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-20 blur-[120px] bg-primary/20 pointer-events-none rounded-full" />
      <div
        className="relative bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10 flex items-center justify-center"
        style={{
          width: "auto",
          height: "auto",
          maxWidth: "100%",
          maxHeight: "100%",
          aspectRatio,
        }}
      >
        {!activeClip?.asset?.url ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-700">
            <div className="w-16 h-16 rounded-2xl bg-muted/10 flex items-center justify-center border border-white/5 mb-2 backdrop-blur-sm">
              <Film size={24} className="text-white/20" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                Preview Mode
              </p>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            style={videoStyles}
            playsInline
          />
        )}
        <TextOverlayLayer />
      </div>
    </div>
  );
}
