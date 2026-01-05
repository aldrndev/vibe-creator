/**
 * Editor Canvas
 *
 * Main editing canvas showing layer previews with click-to-select.
 * Displays video/image/text layers with proper z-ordering.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { useModernEditorStore } from "@/stores/modern-editor-store";
import type { Layer, TextLayer, ImageLayer } from "@vibe-creator/shared";
import { clsx } from "clsx";
import { RotateCw, X } from "lucide-react";
import { motion } from "framer-motion";
import type {
  VideoLayer,
  AudioLayer,
  TextLayer as TextLayerType,
} from "@vibe-creator/shared";

interface EditorCanvasProps {
  className?: string;
}

export function EditorCanvas({ className }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const {
    settings,
    layerOrder,
    layersById,
    selectedLayerId,
    selectLayer,
    updateLayer,
    removeLayer,
    currentTimeMs,
    assets,
  } = useModernEditorStore();

  // Calculate scale to fit canvas in container
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth - 48; // padding
      const containerHeight = containerRef.current.clientHeight - 48;

      const scaleX = containerWidth / settings.width;
      const scaleY = containerHeight / settings.height;
      setScale(Math.min(scaleX, scaleY, 1));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [settings.width, settings.height]);

  // Get visible layers at current time
  const getVisibleLayers = useCallback(() => {
    const allLayers = layerOrder
      .map((id) => layersById[id])
      .filter((layer): layer is Layer => Boolean(layer));

    // If no layers exist, return empty
    if (allLayers.length === 0) return [];

    // Filter by visibility and timing
    const visible = allLayers.filter((layer) => {
      if (!layer.visible) return false;
      // Layer is visible if current time is within its range
      return currentTimeMs >= layer.startMs && currentTimeMs < layer.endMs;
    });

    // Debug: log if layers exist but none visible
    if (allLayers.length > 0 && visible.length === 0) {
      console.log("[EditorCanvas] Layers exist but none visible:", {
        currentTimeMs,
        layers: allLayers.map((l) => ({
          id: l.id,
          type: l.type,
          visible: l.visible,
          startMs: l.startMs,
          endMs: l.endMs,
        })),
      });
    }

    return visible;
  }, [layerOrder, layersById, currentTimeMs]);

  const visibleLayers = getVisibleLayers();

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectLayer(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className={clsx(
        "flex-1 flex items-center justify-center bg-content2/50 overflow-hidden p-6",
        className
      )}
      onClick={handleCanvasClick}
    >
      {/* Canvas */}
      <div
        className="relative bg-black shadow-2xl"
        style={{
          width: settings.width * scale,
          height: settings.height * scale,
          backgroundColor: settings.backgroundColor,
        }}
      >
        {/* Audio Layers (Invisible) */}
        {visibleLayers
          .filter((l) => l.type === "audio")
          .map((layer) => (
            <AudioLayerContent
              key={layer.id}
              layer={layer as AudioLayer}
              assets={assets}
              layerStartMs={layer.startMs}
            />
          ))}

        {/* Visual Layers */}
        {visibleLayers.map((layer) => (
          <LayerRenderer
            key={layer.id}
            layer={layer}
            scale={scale}
            canvasWidth={settings.width}
            canvasHeight={settings.height}
            isSelected={selectedLayerId === layer.id}
            onSelect={() => selectLayer(layer.id)}
            onUpdate={(updates) => updateLayer(layer.id, updates)}
            onDelete={() => removeLayer(layer.id)}
            assets={assets}
          />
        ))}

        {/* Empty state */}
        {visibleLayers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/30">
            <div className="text-center">
              <p className="text-lg font-medium">Canvas Kosong</p>
              <p className="text-sm">
                Drop file atau tambah layer dari sidebar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Canvas info */}
      <div className="absolute bottom-2 right-2 text-xs text-foreground/40">
        {settings.width}x{settings.height} @ {Math.round(scale * 100)}%
      </div>
    </div>
  );
}

// Video layer content with playback sync
function VideoLayerContent({
  src,
  layerStartMs,
  layerTrimStartMs = 0,
  volume = 1,
}: {
  src: string;
  layerStartMs: number;
  layerTrimStartMs?: number;
  volume?: number;
}) {
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
    />
  );
}

// Audio layer content
function AudioLayerContent({
  layer,
  assets,
  layerStartMs,
}: {
  layer: AudioLayer;
  assets: any[];
  layerStartMs: number;
}) {
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

  // Sync volume & Fade logic (basic)
  useEffect(() => {
    if (!audioRef.current) return;
    // Basic volume setting
    // Ideally we would calculate fade based on currentTime relative to start/end
    audioRef.current.volume = Math.min(Math.max(layer.data.volume, 0), 1);
  }, [layer.data.volume]); // Re-run on volume change

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

// Layer Renderer Component
function LayerRenderer({
  layer,
  scale,
  canvasWidth,
  canvasHeight,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  assets,
}: {
  layer: Layer;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Layer>) => void;
  onDelete: () => void;
  assets: Array<{ id: string; url: string; type: string }>;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [layerStart, setLayerStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    fontSize: 0,
  });

  // Calculate position based on anchor and percentage
  const getStyle = (): React.CSSProperties => {
    // Convert percentage to pixels
    const x = (layer.x / 100) * canvasWidth * scale;
    const y = (layer.y / 100) * canvasHeight * scale;
    const width = (layer.width / 100) * canvasWidth * scale;
    const height = (layer.height / 100) * canvasHeight * scale;

    // Center anchor
    const left = x - width / 2;
    const top = y - height / 2;

    return {
      position: "absolute",
      left,
      top,
      width,
      height,
      transform: `rotate(${layer.rotation}deg)`,
      opacity: layer.opacity,
      cursor: layer.locked ? "not-allowed" : "move",
      outline: isSelected && !isEditing ? "2px solid #0072F5" : "none",
      outlineOffset: "2px",
      zIndex: isEditing ? 100 : undefined, // Bring to front when editing
    };
  };

  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    setLayerStart({
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation,
      fontSize: layer.type === "text" ? (layer as TextLayer).data.fontSize : 0,
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (layer.locked || isEditing) return;
    e.stopPropagation();
    onSelect();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (layer.locked || isEditing) return;
    e.stopPropagation();
    // Prevent scrolling while dragging layer
    // e.preventDefault(); // Commented out to allow clicking, but might need checking
    onSelect();
    const touch = e.touches[0];
    if (!touch) return;
    handleDragStart(touch.clientX, touch.clientY);
  };

  const handleResizeStartRaw = (
    clientX: number,
    clientY: number,
    handle: string
  ) => {
    setIsResizing(handle);
    setDragStart({ x: clientX, y: clientY });
    setLayerStart({
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation,
      fontSize: layer.type === "text" ? (layer as TextLayer).data.fontSize : 0,
    });
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    handleResizeStartRaw(e.clientX, e.clientY, handle);
  };

  const handleResizeTouchStart = (e: React.TouchEvent, handle: string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (!touch) return;
    handleResizeStartRaw(touch.clientX, touch.clientY, handle);
  };

  const handleRotateStartRaw = (_: unknown) => {
    setIsRotating(true);
  };

  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleRotateStartRaw(e);
  };

  const handleRotateTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsRotating(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // Rotation Logic
      if (isRotating && layerRef.current) {
        const rect = layerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate angle relative to center
        // atan2(y, x) -> result in radians -PI to PI
        const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let angleDeg = angleRad * (180 / Math.PI);

        // Adjust coordinate system:
        // atan2(0,-1) (top) = -90deg. We want that to be 0 rotation.
        // So we add 90 degrees.
        angleDeg += 90;

        onUpdate({ rotation: angleDeg });
        return;
      }

      if (!isDragging && !isResizing) return;

      // Calculate delta in percentages
      const dxPx = e.clientX - dragStart.x;
      const dyPx = e.clientY - dragStart.y;

      const dx = (dxPx / (canvasWidth * scale)) * 100;
      const dy = (dyPx / (canvasHeight * scale)) * 100;

      if (isDragging) {
        onUpdate({
          x: layerStart.x + dx,
          y: layerStart.y + dy,
        });
      } else if (isResizing) {
        let newWidth = layerStart.width;
        let newHeight = layerStart.height;
        let newFontSize = layerStart.fontSize;

        // Corner scaling (Proprietary/Original Logic)
        if (["nw", "ne", "sw", "se"].includes(isResizing)) {
          let widthChange = 0;
          if (isResizing.includes("e")) widthChange = dx;
          else widthChange = -dx;

          const scaleFactor = Math.max(
            0.1,
            (layerStart.width + widthChange) / layerStart.width
          );

          newWidth = layerStart.width * scaleFactor;
          newHeight = layerStart.height * scaleFactor;

          if (layer.type === "text") {
            newFontSize = layerStart.fontSize * scaleFactor;
          }
        }
        // Side stretching (Non-proportional, no font scaling)
        else {
          if (isResizing === "e") {
            newWidth = Math.max(1, layerStart.width + dx);
            // Center shift for E grow: +dx/2
            // But we are in a simple MVP where center is anchor.
            // If we widen right, and anchor is center, it widens both ways unless we shift X.
            // Correct interaction: e-resize should hold LEFT edge fixed.
            // Left edge = x - w/2.
            // New Left needs to be same: newX - newW/2 = oldX - oldW/2.
            // newX = oldX - oldW/2 + newW/2 = oldX + (newW - oldW)/2.
            // newW = oldW + dx.
            // DeltaW = dx.
            // newX = oldX + dx/2.
            // onUpdate({ x: layerStart.x + dx/2 });
            onUpdate({ x: layerStart.x + dx / 2 });
          } else if (isResizing === "w") {
            newWidth = Math.max(1, layerStart.width - dx);
            // Hold RIGHT edge fixed.
            // Right edge = x + w/2.
            // newX + newW/2 = oldX + oldW/2.
            // newX = oldX + oldW/2 - newW/2 = oldX + (oldW - newW)/2.
            // newW = oldW - dx. (since dragging left is negative dx, so -dx is positive increase)
            // Wait. dx is negative if moving left.
            // If moving left (dx < 0): newWidth = oldWidth - dx (increases).
            // Center must move left: newX = oldX + dx/2.
            onUpdate({ x: layerStart.x + dx / 2 });
          } else if (isResizing === "s") {
            newHeight = Math.max(1, layerStart.height + dy);
            // Hold TOP edge fixed.
            // newY = oldY + dy/2.
            onUpdate({ y: layerStart.y + dy / 2 });
          } else if (isResizing === "n") {
            newHeight = Math.max(1, layerStart.height - dy);
            // Hold BOTTOM edge fixed.
            // newY = oldY + dy/2.
            onUpdate({ y: layerStart.y + dy / 2 });
          }
        }

        const updates: Partial<Layer> = {
          width: newWidth,
          height: newHeight,
        };

        if (
          layer.type === "text" &&
          Math.abs(newFontSize - layerStart.fontSize) > 0.1
        ) {
          (updates as any).data = { ...layer.data, fontSize: newFontSize };
        }

        onUpdate(updates);
      }
    },
    [
      isDragging,
      isResizing,
      isRotating,
      dragStart,
      layerStart,
      canvasWidth,
      canvasHeight,
      scale,
      onUpdate,
      layer.type,
      layer.data,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
    setIsRotating(false);
  }, []);

  // Touch Move Handler
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      // Prevent scrolling if we are performing an action
      if (isDragging || isResizing || isRotating) {
        // e.preventDefault(); // Passive listener issue possible, handle carefully
      }

      const touch = e.touches[0];
      if (!touch) return;

      // ROTATION
      if (isRotating && layerRef.current) {
        const rect = layerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angleRad = Math.atan2(
          touch.clientY - centerY,
          touch.clientX - centerX
        );
        let angleDeg = angleRad * (180 / Math.PI);
        angleDeg += 90;
        onUpdate({ rotation: angleDeg });
        return;
      }

      if (!isDragging && !isResizing) return;

      const dxPx = touch.clientX - dragStart.x;
      const dyPx = touch.clientY - dragStart.y;
      const dx = (dxPx / (canvasWidth * scale)) * 100;
      const dy = (dyPx / (canvasHeight * scale)) * 100;

      // Reuse the same logic for updates
      if (isDragging) {
        onUpdate({
          x: layerStart.x + dx,
          y: layerStart.y + dy,
        });
      } else if (isResizing) {
        let newWidth = layerStart.width;
        let newHeight = layerStart.height;
        let newFontSize = layerStart.fontSize;

        if (
          isResizing.includes("n") ||
          isResizing.includes("s") ||
          isResizing.includes("e") ||
          isResizing.includes("w")
        ) {
          // Simplify: just reuse the logic from mouse move but copied here to be safe
          // Since we can't easily extract without larger refactor, duplicating logic for now
          if (["nw", "ne", "sw", "se"].includes(isResizing)) {
            let widthChange = 0;
            if (isResizing.includes("e")) widthChange = dx;
            else widthChange = -dx;

            const scaleFactor = Math.max(
              0.1,
              (layerStart.width + widthChange) / layerStart.width
            );
            newWidth = layerStart.width * scaleFactor;
            newHeight = layerStart.height * scaleFactor;
            if (layer.type === "text")
              newFontSize = layerStart.fontSize * scaleFactor;
          } else {
            if (isResizing === "e") {
              newWidth = Math.max(1, layerStart.width + dx);
              onUpdate({ x: layerStart.x + dx / 2 });
            } else if (isResizing === "w") {
              newWidth = Math.max(1, layerStart.width - dx);
              onUpdate({ x: layerStart.x + dx / 2 });
            } else if (isResizing === "s") {
              newHeight = Math.max(1, layerStart.height + dy);
              onUpdate({ y: layerStart.y + dy / 2 });
            } else if (isResizing === "n") {
              newHeight = Math.max(1, layerStart.height - dy);
              onUpdate({ y: layerStart.y + dy / 2 });
            }
          }
        }

        const updates: Partial<Layer> = { width: newWidth, height: newHeight };
        if (
          layer.type === "text" &&
          Math.abs(newFontSize - layerStart.fontSize) > 0.1
        ) {
          (updates as any).data = { ...layer.data, fontSize: newFontSize };
        }
        onUpdate(updates);
      }
    },
    [
      isDragging,
      isResizing,
      isRotating,
      dragStart,
      layerStart,
      canvasWidth,
      canvasHeight,
      scale,
      onUpdate,
      layer.type,
      layer.data,
    ]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
    setIsRotating(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing || isRotating) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      // Touch listeners (passive: false is implicit usually but we want to prevent default)
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [
    isDragging,
    isResizing,
    isRotating,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (layer.type === "text" && !layer.locked) {
      setIsEditing(true);
    }
  };

  // Render based on layer type
  const renderContent = () => {
    if (isEditing && layer.type === "text") {
      const textLayer = layer as TextLayer;
      return (
        <textarea
          autoFocus
          className="w-full h-full bg-transparent resize-none border-none outline-none overflow-hidden p-0 m-0"
          style={{
            fontFamily: textLayer.data.fontFamily,
            fontSize: textLayer.data.fontSize * scale,
            fontWeight: textLayer.data.fontWeight,
            fontStyle: textLayer.data.fontStyle,
            color: textLayer.data.color,
            textAlign: textLayer.data.textAlign,
            lineHeight: 1.2,
          }}
          value={textLayer.data.text}
          onChange={(e) =>
            onUpdate({
              data: { ...textLayer.data, text: e.target.value },
            } as any)
          }
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              setIsEditing(false);
            }
          }}
        />
      );
    }

    switch (layer.type) {
      case "video":
      case "image": {
        const asset = assets.find((a) => a.id === layer.assetId);
        if (!asset) return null;

        if (layer.type === "video") {
          return (
            <VideoLayerContent
              src={asset.url}
              layerStartMs={layer.startMs}
              volume={(layer as VideoLayer).data.volume}
            />
          );
        }
        return (
          <img
            src={asset.url}
            alt=""
            className={clsx(
              "w-full h-full pointer-events-none",
              (layer as ImageLayer).data.fit === "cover"
                ? "object-cover"
                : "object-contain"
            )}
          />
        );
      }
      case "text": {
        const textLayer = layer as TextLayerType;
        const animation = textLayer.data.animation;

        // Animation variants
        const variants = {
          initial: { opacity: 0, y: 0 },
          animate: { opacity: 1, y: 0 },
        };

        if (animation === "fade") {
          variants.initial = { opacity: 0, y: 0 };
        } else if (animation === "slide-up") {
          variants.initial = { opacity: 0, y: 20 };
        } else if (animation === "slide-down") {
          variants.initial = { opacity: 0, y: -20 };
        } else if (animation === "typewriter") {
          // Simplified typewriter (just fade for now as placeholder or width anim)
          variants.initial = { opacity: 0, y: 0 };
        }

        // Only if 'none', we handle differently? Or just animate nothing.
        if (animation === "none") {
          variants.initial = { opacity: 1, y: 0 };
        }

        return (
          <motion.div
            initial={animation !== "none" ? variants.initial : undefined}
            animate={variants.animate}
            transition={{ duration: 0.5 }}
            className="w-full h-full flex items-center justify-center overflow-hidden whitespace-pre-wrap break-words"
            style={{
              fontFamily: textLayer.data.fontFamily,
              fontSize: textLayer.data.fontSize * scale,
              fontWeight: textLayer.data.fontWeight,
              fontStyle: textLayer.data.fontStyle,
              color: textLayer.data.color,
              backgroundColor: textLayer.data.backgroundColor,
              textAlign: textLayer.data.textAlign,
              lineHeight: 1.2,
            }}
          >
            {textLayer.data.text}
          </motion.div>
        );
      }
      case "audio":
        return null;
      default:
        return null;
    }
  };

  // Don't render audio layers on canvas
  if (layer.type === "audio") return null;

  return (
    <div
      ref={layerRef}
      style={getStyle()}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={clsx("select-none group", isResizing && "pointer-events-none")}
    >
      {renderContent()}

      {/* Selection & Resize & Rotation handles */}
      {isSelected && !layer.locked && !isEditing && (
        <>
          {/* Main Bounding Box */}
          <div className="absolute inset-0 border border-[#0099ff] pointer-events-none" />

          {/* Rotation Handle */}
          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-move group/rotate pointer-events-auto"
            onMouseDown={handleRotateStart}
            onTouchStart={handleRotateTouchStart}
          >
            <div className="bg-white text-black p-1 rounded-full shadow-md border border-gray-200 hover:scale-110 transition-transform hover:bg-gray-50">
              <RotateCw size={12} strokeWidth={2.5} />
            </div>
            <div className="w-px h-4 bg-[#0099ff]" />
          </div>

          {/* Delete Button */}
          <button
            type="button"
            className="absolute -top-10 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 hover:scale-110 transition-all pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete layer"
          >
            <X size={12} strokeWidth={2.5} />
          </button>

          {/* RESIZE HANDLES */}
          {/* Styling: White circles with blue border, shadow, hover scale */}

          {/* Corner Handles */}
          <div
            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-[#0099ff] rounded-full cursor-nw-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-10"
            onMouseDown={(e) => handleResizeStart(e, "nw")}
            onTouchStart={(e) => handleResizeTouchStart(e, "nw")}
          />
          <div
            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-[#0099ff] rounded-full cursor-ne-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-10"
            onMouseDown={(e) => handleResizeStart(e, "ne")}
            onTouchStart={(e) => handleResizeTouchStart(e, "ne")}
          />
          <div
            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-[#0099ff] rounded-full cursor-sw-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-10"
            onMouseDown={(e) => handleResizeStart(e, "sw")}
            onTouchStart={(e) => handleResizeTouchStart(e, "sw")}
          />
          <div
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-[#0099ff] rounded-full cursor-se-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-10"
            onMouseDown={(e) => handleResizeStart(e, "se")}
            onTouchStart={(e) => handleResizeTouchStart(e, "se")}
          />

          {/* Side Handles */}
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-2 bg-white border border-[#0099ff] rounded-full cursor-n-resize pointer-events-auto shadow-sm hover:bg-[#0099ff] transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "n")}
            onTouchStart={(e) => handleResizeTouchStart(e, "n")}
          />
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-2 bg-white border border-[#0099ff] rounded-full cursor-s-resize pointer-events-auto shadow-sm hover:bg-[#0099ff] transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "s")}
            onTouchStart={(e) => handleResizeTouchStart(e, "s")}
          />
          <div
            className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-5 bg-white border border-[#0099ff] rounded-full cursor-w-resize pointer-events-auto shadow-sm hover:bg-[#0099ff] transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "w")}
            onTouchStart={(e) => handleResizeTouchStart(e, "w")}
          />
          <div
            className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-5 bg-white border border-[#0099ff] rounded-full cursor-e-resize pointer-events-auto shadow-sm hover:bg-[#0099ff] transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "e")}
            onTouchStart={(e) => handleResizeTouchStart(e, "e")}
          />
        </>
      )}
    </div>
  );
}
