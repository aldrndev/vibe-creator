/**
 * Layer Stack Panel
 *
 * Visual z-order display with drag-to-reorder, visibility toggle, and lock.
 * Similar to Figma/Photoshop layer panel.
 */

import { Card, CardBody, Button } from "@heroui/react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  GripVertical,
  Video,
  Image as ImageIcon,
  Type,
  Music,
} from "lucide-react";
import { useModernEditorStore } from "@/stores/modern-editor-store";
import type { Layer } from "@vibe-creator/shared";
import { clsx } from "clsx";

interface LayerStackProps {
  className?: string;
}

export function LayerStack({ className }: LayerStackProps) {
  const {
    layerOrder,
    layersById,
    selectedLayerId,
    selectLayer,
    updateLayer,
    removeLayer,
    duplicateLayer,
    reorderLayer,
  } = useModernEditorStore();

  // Reverse order for display (top layer first)
  const displayOrder = [...layerOrder].reverse();

  const getLayerIcon = (type: Layer["type"]) => {
    switch (type) {
      case "video":
        return <Video size={16} />;
      case "image":
        return <ImageIcon size={16} />;
      case "text":
        return <Type size={16} />;
      case "audio":
        return <Music size={16} />;
    }
  };

  const getLayerLabel = (layer: Layer) => {
    switch (layer.type) {
      case "text":
        return layer.data.text.slice(0, 20) || "Text";
      default:
        return `${
          layer.type.charAt(0).toUpperCase() + layer.type.slice(1)
        } Layer`;
    }
  };

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    e.dataTransfer.setData("layerId", layerId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    const draggedLayerId = e.dataTransfer.getData("layerId");
    if (draggedLayerId === targetLayerId) return;

    const targetIndex = layerOrder.indexOf(targetLayerId);
    reorderLayer(draggedLayerId, targetIndex);
  };

  if (displayOrder.length === 0) {
    return (
      <Card className={clsx("bg-content1/50", className)}>
        <CardBody className="p-4 text-center text-foreground/50 text-sm">
          <p>Belum ada layer.</p>
          <p className="text-xs mt-1">Tambahkan video, gambar, atau text.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className={clsx("bg-content1/50", className)}>
      <CardBody className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
        {displayOrder.map((layerId) => {
          const layer = layersById[layerId];
          if (!layer) return null;

          const isSelected = selectedLayerId === layerId;

          return (
            <div
              key={layerId}
              draggable
              onDragStart={(e) => handleDragStart(e, layerId)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, layerId)}
              onClick={() => selectLayer(layerId)}
              className={clsx(
                "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group",
                isSelected
                  ? "bg-primary/20 border border-primary"
                  : "hover:bg-content2 border border-transparent"
              )}
            >
              {/* Drag handle */}
              <GripVertical
                size={14}
                className="text-foreground/30 cursor-grab active:cursor-grabbing"
              />

              {/* Type icon */}
              <div
                className={clsx(
                  "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
                  layer.visible
                    ? "bg-content3 text-foreground/70"
                    : "bg-content3/50 text-foreground/30"
                )}
              >
                {getLayerIcon(layer.type)}
              </div>

              {/* Layer name */}
              <div className="flex-1 min-w-0">
                <p
                  className={clsx(
                    "text-sm font-medium truncate",
                    !layer.visible && "text-foreground/50"
                  )}
                >
                  {getLayerLabel(layer)}
                </p>
                <p className="text-xs text-foreground/40">
                  {(layer.startMs / 1000).toFixed(1)}s -{" "}
                  {(layer.endMs / 1000).toFixed(1)}s
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() =>
                    updateLayer(layerId, { visible: !layer.visible })
                  }
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() =>
                    updateLayer(layerId, { locked: !layer.locked })
                  }
                >
                  {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => duplicateLayer(layerId)}
                >
                  <Copy size={14} />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  onPress={() => removeLayer(layerId)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
