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
          {!hasLayers
            ? 'Tambahkan media/template'
            : hasSelection
              ? `${selectedCount} layer dipilih`
              : 'Drag, trim, split, snap'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Zoom timeline out"
          className="h-9 w-9 rounded-xl"
          disabled={pxPerSecond <= TIMELINE_MIN_PX_PER_SECOND}
          onClick={onZoomOut}
        >
          <ZoomOut size={16} />
        </Button>
        <span className="w-14 text-center text-[11px] font-black text-muted-foreground">
          {Math.round(pxPerSecond)}px/s
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Zoom timeline in"
          className="h-9 w-9 rounded-xl"
          disabled={pxPerSecond >= TIMELINE_MAX_PX_PER_SECOND}
          onClick={onZoomIn}
        >
          <ZoomIn size={16} />
        </Button>
        {hasLayers && (
          <>
            <div className="mx-1 h-7 w-px bg-border/60" />
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
