import type { Layer } from '@vibe-creator/shared';
import { GripVertical } from 'lucide-react';
import { getTimelineLayerLabel } from '@/lib/modern-timeline-utils';
import { cn } from '@/lib/utils';

interface TimelineLayerHeaderProps {
  readonly layers: readonly Layer[];
  readonly selectedLayerIds: readonly string[];
  readonly reorderingLayerId: string | null;
  readonly rowHeightPx: number;
  readonly rulerHeightPx: number;
  readonly className?: string;
  readonly onSelectLayer: (event: React.MouseEvent<HTMLButtonElement>, layerId: string) => void;
  readonly onDragStart: (event: React.DragEvent<HTMLElement>, layerId: string) => void;
  readonly onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  readonly onDrop: (event: React.DragEvent<HTMLElement>, targetLayerId: string) => void;
  readonly onDragEnd: () => void;
}

export function TimelineLayerHeader({
  layers,
  selectedLayerIds,
  reorderingLayerId,
  rowHeightPx,
  rulerHeightPx,
  className,
  onSelectLayer,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TimelineLayerHeaderProps) {
  return (
    <div className={cn('shrink-0 border-r border-border/50 bg-card/80', className)}>
      <div
        className="flex items-center px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"
        style={{ height: rulerHeightPx }}
      >
        Layer
      </div>
      <div className="max-h-[132px] overflow-y-auto scrollbar-hide">
        {layers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            draggable
            className={cn(
              'group flex w-full items-center gap-2 border-t border-border/30 px-2.5 text-left text-[11px] font-black transition-colors',
              selectedLayerIds.includes(layer.id)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
              reorderingLayerId === layer.id && 'opacity-55',
            )}
            style={{ height: rowHeightPx }}
            onClick={(event) => onSelectLayer(event, layer.id)}
            onDragStart={(event) => onDragStart(event, layer.id)}
            onDragOver={onDragOver}
            onDrop={(event) => onDrop(event, layer.id)}
            onDragEnd={onDragEnd}
            aria-label={`Geser urutan layer ${getTimelineLayerLabel(layer)}`}
          >
            <GripVertical
              size={14}
              className="shrink-0 text-muted-foreground/35 transition-colors group-hover:text-muted-foreground"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">{getTimelineLayerLabel(layer)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
