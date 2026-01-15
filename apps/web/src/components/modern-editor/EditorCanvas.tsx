/**
 * Editor Canvas
 *
 * Main editing canvas showing layer previews with click-to-select.
 * Displays video/image/text layers with proper z-ordering.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { logger } from "@/lib/logger";
import { useModernEditorStore } from "@/stores/modern-editor-store";
import type { Layer, AudioLayer } from "@vibe-creator/shared";
import { cn } from "@/lib/utils";
import { LayerRenderer } from "./canvas/LayerRenderer";
import { AudioLayerContent } from "./canvas/AudioLayerContent";

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
      logger.debug("Layers exist but none visible", {
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
      className={cn(
        "flex-1 flex items-center justify-center bg-muted/20 overflow-hidden p-6 relative",
        "bg-[radial-gradient(hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] [background-size:24px_24px]",
        className
      )}
      onClick={handleCanvasClick}
    >
      {/* Canvas */}
      <div
        className="relative bg-black"
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
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
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
