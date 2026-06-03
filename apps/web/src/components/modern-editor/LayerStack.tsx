/**
 * Layer Stack Panel
 *
 * Visual z-order display with drag-to-reorder, visibility toggle, and lock.
 * Similar to Figma/Photoshop layer panel.
 */

import type { Layer } from '@vibe-creator/shared';
import {
  Clock3,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Lock,
  MoreHorizontal,
  Trash2,
  Type,
  Unlock,
  Video,
  Volume2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Button,
  Card,
  CardBody,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { useModernEditorStore } from '@/stores/modern-editor-store';
import { formatLayerTime, getLayerStackTitle, getLayerTypeLabel } from './layer-panel-utils';
import { MediaAssetThumbnail } from './media-asset-thumbnail';

interface LayerStackProps {
  className?: string;
  onMenuOpenChange?: (open: boolean) => void;
}

export function LayerStack({ className, onMenuOpenChange }: LayerStackProps) {
  const {
    layerOrder,
    layersById,
    selectedLayerId,
    selectedLayerIds,
    selectLayer,
    toggleLayerSelection,
    updateLayer,
    removeLayer,
    duplicateLayer,
    reorderLayer,
    assets,
  } = useModernEditorStore();

  // Reverse order for display (top layer first)
  const displayOrder = [...layerOrder].reverse();

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
      <Card className={cn('border-dashed border-border/50 bg-card/50', className)}>
        <CardBody className="flex min-h-36 flex-col items-center justify-center gap-3 p-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <ImageIcon size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-foreground">Canvas masih kosong</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Layer akan muncul di sini.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className={cn('border-border/35 bg-card/35 backdrop-blur-xl', className)}>
      <CardBody
        role="listbox"
        aria-label="Layer stack"
        className="max-h-60 space-y-1.5 overflow-y-auto p-1.5 pr-2"
      >
        {displayOrder.map((layerId) => {
          const layer = layersById[layerId];
          if (!layer) return null;

          const isSelected = selectedLayerId === layerId || selectedLayerIds.includes(layerId);
          const asset = layer.assetId ? assets.find((item) => item.id === layer.assetId) : null;

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
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey) {
                  toggleLayerSelection(layerId);
                } else {
                  selectLayer(layerId);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectLayer(layerId);
                }
              }}
              className={cn(
                'group relative min-h-12 cursor-pointer overflow-hidden rounded-xl border px-2 py-1.5 transition-all',
                isSelected
                  ? 'z-10 border-primary/45 bg-primary/5 shadow-sm shadow-primary/5'
                  : 'border-border/15 bg-background/20 hover:border-primary/25 hover:bg-background/35',
                (!layer.visible || layer.locked) && 'opacity-80',
              )}
            >
              {isSelected && (
                <div className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-r-full bg-primary" />
              )}

              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'hidden w-4 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100 md:flex',
                    isSelected && 'opacity-100',
                  )}
                >
                  <GripVertical size={14} />
                </div>

                <MediaAssetThumbnail
                  asset={asset}
                  className="h-8 w-8 rounded-lg"
                  layer={layer}
                  variant="layer"
                />

                <div className="min-w-0 flex-1 pr-1">
                  <LayerTitle title={getLayerStackTitle(layer, assets)} visible={layer.visible} />
                  <LayerMeta layer={layer} />
                </div>

                <LayerActionsMenu
                  isSelected={isSelected}
                  layer={layer}
                  onDelete={() => removeLayer(layerId)}
                  onDuplicate={() => duplicateLayer(layerId)}
                  onOpenChange={onMenuOpenChange}
                  onToggleLock={() => updateLayer(layerId, { locked: !layer.locked })}
                  onToggleVisibility={() => updateLayer(layerId, { visible: !layer.visible })}
                />
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function LayerTitle({ title, visible }: Readonly<{ title: string; visible: boolean }>) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          'truncate text-xs font-black tracking-tight text-foreground',
          !visible && 'text-muted-foreground/60',
        )}
      >
        {title}
      </p>
    </div>
  );
}

function LayerMeta({ layer }: Readonly<{ layer: Layer }>) {
  return (
    <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[9px] font-black text-muted-foreground/65">
      <LayerTypeIcon layer={layer} />
      <span className="uppercase tracking-widest">{getLayerTypeLabel(layer.type)}</span>
      <span className="text-muted-foreground/25">•</span>
      <span className="flex min-w-0 items-center gap-1 font-mono">
        <Clock3 size={11} className="shrink-0" />
        <span className="truncate">
          {formatLayerTime(layer.startMs)} - {formatLayerTime(layer.endMs)}
        </span>
      </span>
      {layer.locked && <LayerStatusBadge>Locked</LayerStatusBadge>}
      {!layer.visible && <LayerStatusBadge>Hidden</LayerStatusBadge>}
    </div>
  );
}

function LayerStatusBadge({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="rounded-full bg-background/45 px-1.5 py-0.5 uppercase tracking-widest text-muted-foreground">
      {children}
    </span>
  );
}

function LayerTypeIcon({ layer }: Readonly<{ layer: Layer }>) {
  if (layer.type === 'audio') {
    return <Volume2 size={13} className="shrink-0 text-sky-200" />;
  }

  if (layer.type === 'text') {
    return <Type size={13} className="shrink-0 text-primary" />;
  }

  if (layer.type === 'image') {
    return <ImageIcon size={13} className="shrink-0 text-violet-200" />;
  }

  return <Video size={13} className="shrink-0 text-emerald-200" />;
}

function LayerActionsMenu({
  isSelected,
  layer,
  onDelete,
  onDuplicate,
  onOpenChange,
  onToggleLock,
  onToggleVisibility,
}: Readonly<{
  isSelected: boolean;
  layer: Layer;
  onDelete: () => void;
  onDuplicate: () => void;
  onOpenChange?: (open: boolean) => void;
  onToggleLock: () => void;
  onToggleVisibility: () => void;
}>) {
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Layer actions"
          className={cn(
            'h-8 w-8 shrink-0 rounded-lg text-muted-foreground transition-opacity hover:bg-primary/15 hover:text-primary',
            isSelected
              ? 'opacity-100'
              : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[80] w-44">
        <LayerMenuItem onSelect={onToggleVisibility}>
          {layer.visible ? <EyeOff size={15} /> : <Eye size={15} />}
          {layer.visible ? 'Hide Layer' : 'Show Layer'}
        </LayerMenuItem>
        <LayerMenuItem onSelect={onToggleLock}>
          {layer.locked ? <Unlock size={15} /> : <Lock size={15} />}
          {layer.locked ? 'Unlock Layer' : 'Lock Layer'}
        </LayerMenuItem>
        <LayerMenuItem onSelect={onDuplicate}>
          <Copy size={15} />
          Duplicate
        </LayerMenuItem>
        <DropdownMenuSeparator />
        <LayerMenuItem destructive onSelect={onDelete}>
          <Trash2 size={15} />
          Delete
        </LayerMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LayerMenuItem({
  children,
  destructive = false,
  onSelect,
}: Readonly<{
  children: ReactNode;
  destructive?: boolean;
  onSelect: () => void;
}>) {
  return (
    <DropdownMenuItem
      className={cn(
        'gap-2 text-xs font-bold',
        destructive && 'text-destructive focus:text-destructive',
      )}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {children}
    </DropdownMenuItem>
  );
}
