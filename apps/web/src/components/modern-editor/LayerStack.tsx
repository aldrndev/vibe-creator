/**
 * Layer Stack Panel
 *
 * Visual z-order display with drag-to-reorder, visibility toggle, and lock.
 * Similar to Figma/Photoshop layer panel.
 */

import type { Layer } from '@vibe-creator/shared';
import {
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Lock,
  Music,
  Trash2,
  Type,
  Unlock,
  Video,
} from 'lucide-react';
import { Button, Card, CardBody } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useModernEditorStore } from '@/stores/modern-editor-store';

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
    assets,
  } = useModernEditorStore();

  // Reverse order for display (top layer first)
  const displayOrder = [...layerOrder].reverse();

  const getLayerIcon = (type: Layer['type']) => {
    switch (type) {
      case 'video':
        return <Video size={16} />;
      case 'image':
        return <ImageIcon size={16} />;
      case 'text':
        return <Type size={16} />;
      case 'audio':
        return <Music size={16} />;
    }
  };

  const getLayerLabel = (layer: Layer) => {
    if (layer.type === 'text') {
      return layer.data.text.slice(0, 30) || 'Text Layer';
    }

    if ('assetId' in layer && layer.assetId) {
      const asset = assets.find((a) => a.id === layer.assetId);
      if (asset) return asset.name;
    }

    return `${layer.type.charAt(0).toUpperCase() + layer.type.slice(1)} Layer`;
  };

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    e.dataTransfer.setData('layerId', layerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    const draggedLayerId = e.dataTransfer.getData('layerId');
    if (draggedLayerId === targetLayerId) return;

    const targetIndex = layerOrder.indexOf(targetLayerId);
    reorderLayer(draggedLayerId, targetIndex);
  };

  if (displayOrder.length === 0) {
    return (
      <Card className={cn('bg-card/70', className)}>
        <CardBody className="p-4 text-center text-muted-foreground text-sm">
          <p>Belum ada layer.</p>
          <p className="text-xs mt-1">Tambahkan video, gambar, atau text.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className={cn('bg-card/70', className)}>
      <CardBody className="p-2 space-y-1 max-h-[400px] overflow-y-auto scrollbar-hide">
        {displayOrder.map((layerId) => {
          const layer = layersById[layerId];
          if (!layer) return null;

          const isSelected = selectedLayerId === layerId;

          return (
            <div
              key={layerId}
              role="option"
              tabIndex={0}
              aria-selected={isSelected}
              draggable
              onDragStart={(e) => handleDragStart(e, layerId)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, layerId)}
              onClick={() => selectLayer(layerId)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectLayer(layerId);
                }
              }}
              className={cn(
                'flex flex-col gap-2 p-3 rounded-xl cursor-pointer transition-all group relative border',
                isSelected
                  ? 'bg-primary/15 border-primary z-10'
                  : 'bg-card/50 border-transparent hover:bg-card/70 hover:border-border/60',
              )}
            >
              {/* Top Row: Icon, Name/Time, and Status Flags */}
              <div className="flex items-center gap-3">
                {/* Drag handle */}
                <div
                  className={cn(
                    'opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0',
                    isSelected && 'opacity-100',
                  )}
                >
                  <GripVertical size={14} className="text-muted-foreground/40" />
                </div>

                {/* Type icon */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors bg-muted/60 text-primary',
                    !layer.visible && 'text-muted-foreground/50 bg-muted/20',
                  )}
                >
                  {getLayerIcon(layer.type)}
                </div>

                {/* Info Container */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p
                    className={cn(
                      'text-sm font-bold line-clamp-1 tracking-tight mb-1',
                      !layer.visible && 'text-muted-foreground/60',
                    )}
                  >
                    {getLayerLabel(layer)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-black font-mono text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded">
                      {(layer.startMs / 1000).toFixed(1)}s
                    </p>
                    <span className="text-[10px] text-muted-foreground/20">—</span>
                    <p className="text-[10px] font-black font-mono text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded">
                      {(layer.endMs / 1000).toFixed(1)}s
                    </p>
                    {layer.locked && <Lock size={10} className="text-primary/60 ml-1" />}
                    {!layer.visible && (
                      <EyeOff size={10} className="text-muted-foreground/40 ml-1" />
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Actions - Always visible */}
              <div className="flex items-center gap-1 pt-2 border-t border-border/10">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                  className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(layerId, { visible: !layer.visible });
                  }}
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(layerId, { locked: !layer.locked });
                  }}
                >
                  {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Duplicate layer"
                  className="h-8 w-8 hover:bg-muted-foreground/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateLayer(layerId);
                  }}
                >
                  <Copy size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete layer"
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive ml-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLayer(layerId);
                  }}
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
