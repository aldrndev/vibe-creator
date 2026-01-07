import { clsx } from "clsx";
import { motion } from "framer-motion";
import type {
  Layer,
  TextLayer,
  ImageLayer,
  VideoLayer,
} from "@vibe-creator/shared";
import { useLayerInteraction } from "@/hooks/useLayerInteraction";
import { VideoLayerContent } from "./VideoLayerContent";
import { LayerHandles } from "./LayerHandles";

interface LayerRendererProps {
  layer: Layer;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Layer>) => void;
  onDelete: () => void;
  assets: Array<{ id: string; url: string; type: string }>;
}

export function LayerRenderer({
  layer,
  scale,
  canvasWidth,
  canvasHeight,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  assets,
}: LayerRendererProps) {
  const {
    layerRef,
    isResizing,
    isEditing,
    setIsEditing,
    handleMouseDown,
    handleTouchStart,
    handleClick,
    handleDoubleClick,
    handleResizeStart,
    handleResizeTouchStart,
    handleRotateStart,
    handleRotateTouchStart,
  } = useLayerInteraction({
    layer,
    scale,
    canvasWidth,
    canvasHeight,
    onUpdate,
    onSelect,
    onDelete,
  });

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
      zIndex: isEditing ? 100 : undefined,
    };
  };

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
            } as Partial<TextLayer>)
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
        const textLayer = layer as TextLayer;
        const animation = textLayer.data.animation;

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
          variants.initial = { opacity: 0, y: 0 };
        }

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
        return null; // Should be handled by AudioLayerContent list outside
      default:
        return null;
    }
  };

  // Skip audio layers in renderer
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

      {/* Handles */}
      {isSelected && !layer.locked && !isEditing && (
        <LayerHandles
          onRotateMouseDown={handleRotateStart}
          onRotateTouchStart={handleRotateTouchStart}
          onResizeMouseDown={handleResizeStart}
          onResizeTouchStart={handleResizeTouchStart}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
