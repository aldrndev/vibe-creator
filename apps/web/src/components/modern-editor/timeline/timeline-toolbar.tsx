import { Copy, Scissors, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  TIMELINE_MAX_PX_PER_SECOND,
  TIMELINE_MIN_PX_PER_SECOND,
} from '@/lib/modern-timeline-utils';

interface TimelineToolbarProps {
  readonly layerCount: number;
  readonly selectedCount: number;
  readonly pxPerSecond: number;
  readonly canFitTimeline: boolean;
  readonly onFitTimeline: () => void;
  readonly onResetZoom: () => void;
  readonly onZoomOut: () => void;
  readonly onZoomIn: () => void;
  readonly onSplit: () => void;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
}

export function TimelineToolbar({
  layerCount,
  selectedCount,
  pxPerSecond,
  canFitTimeline,
  onFitTimeline,
  onResetZoom,
  onZoomOut,
  onZoomIn,
  onSplit,
  onDuplicate,
  onDelete,
}: TimelineToolbarProps) {
  const hasLayers = layerCount > 0;
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border/40 px-4">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          Timeline
        </p>
        <p className="text-xs font-bold text-muted-foreground">
          {(() => {
            if (!hasLayers) return 'Tambahkan media/template';
            if (hasSelection) return `${selectedCount} layer dipilih`;
            return 'Drag, trim, split, snap';
          })()}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-1 rounded-2xl border border-border/40 bg-background/25 p-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="hidden h-8 rounded-xl px-2.5 text-xs font-bold lg:inline-flex"
            disabled={!canFitTimeline}
            onClick={onFitTimeline}
          >
            Fit
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Zoom timeline out"
            className="h-8 w-8 rounded-xl"
            disabled={pxPerSecond <= TIMELINE_MIN_PX_PER_SECOND}
            onClick={onZoomOut}
          >
            <ZoomOut size={15} />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Zoom timeline in"
            className="h-8 w-8 rounded-xl"
            disabled={pxPerSecond >= TIMELINE_MAX_PX_PER_SECOND}
            onClick={onZoomIn}
          >
            <ZoomIn size={15} />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="hidden h-8 rounded-xl px-2.5 text-xs font-bold xl:inline-flex"
            onClick={onResetZoom}
          >
            100%
          </Button>
        </div>
        {hasLayers && (
          <>
            <div className="h-7 w-px bg-border/60" />
            <Button
              type="button"
              size="sm"
              variant={hasSelection ? 'outline' : 'ghost'}
              className="h-9 rounded-xl px-3 text-xs font-bold"
              disabled={!hasSelection}
              onClick={onSplit}
            >
              <Scissors size={14} />
              Split
            </Button>
            <Button
              type="button"
              size="icon"
              variant={hasSelection ? 'outline' : 'ghost'}
              aria-label="Duplicate selected layers"
              className="h-9 w-9 rounded-xl"
              disabled={!hasSelection}
              onClick={onDuplicate}
            >
              <Copy size={15} />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={hasSelection ? 'outline' : 'ghost'}
              aria-label="Delete selected layers"
              className="h-9 w-9 rounded-xl hover:border-destructive/40 hover:text-destructive"
              disabled={!hasSelection}
              onClick={onDelete}
            >
              <Trash2 size={15} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
