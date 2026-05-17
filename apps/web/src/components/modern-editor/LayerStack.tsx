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
import {
  formatLayerTime,
  getLayerDisplayName,
  getLayerTypeLabel,
  getTextLayerPreviewLabel,
} from './layer-panel-utils';

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
      <CardBody className="max-h-[320px] space-y-1.5 overflow-y-auto p-1.5 scrollbar-hide">
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
                'group relative min-h-16 cursor-pointer overflow-hidden rounded-xl border px-2.5 py-2 transition-all',
                isSelected
                  ? 'z-10 border-primary/45 bg-primary/5 shadow-sm shadow-primary/5'
                  : 'border-border/15 bg-background/20 hover:border-primary/25 hover:bg-background/35',
                (!layer.visible || layer.locked) && 'opacity-80',
              )}
            >
              {isSelected && (
                <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-primary" />
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

                <LayerThumbnail layer={layer} assetUrl={asset?.thumbnailUrl ?? asset?.url} />

                <div className="min-w-0 flex-1 pr-1">
                  <LayerTitle title={getLayerDisplayName(layer, assets)} visible={layer.visible} />
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

function LayerThumbnail({
  assetUrl,
  layer,
}: Readonly<{
  assetUrl?: string;
  layer: Layer;
}>) {
  const canUseImage = layer.type === 'image' && assetUrl;

  if (canUseImage) {
    return (
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/30 bg-muted/20">
        <img src={assetUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  if (layer.type === 'video' && assetUrl) {
    return (
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-emerald-400/25 bg-emerald-400/10">
        <video src={assetUrl} muted preload="metadata" className="h-full w-full object-cover" />
      </div>
    );
  }

  if (layer.type === 'audio') {
    const barClasses = ['h-4', 'h-7', 'h-5', 'h-8', 'h-6'] as const;

    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center gap-0.5 rounded-lg border border-sky-400/20 bg-sky-400/10 text-sky-200">
        {barClasses.map((className) => (
          <span key={className} className={cn('w-1.5 rounded-full bg-current', className)} />
        ))}
      </div>
    );
  }

  if (layer.type === 'text') {
    return (
      <div className="flex h-10 w-10 shrink-0 flex-col justify-center overflow-hidden rounded-lg border border-primary/25 bg-primary/10 px-1.5 text-primary">
        <span className="text-xs font-black leading-none">Aa</span>
        <span className="mt-1 line-clamp-2 max-w-full text-[7px] font-black leading-tight text-primary/70">
          {getTextLayerPreviewLabel(layer)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
      <Video size={18} />
    </div>
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
    <div className="mt-1 flex min-w-0 items-center gap-1 text-[9px] font-black text-muted-foreground/65">
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
