import type { Layer } from '@vibe-creator/shared';
import { GripVertical } from 'lucide-react';
import type { RefObject } from 'react';
import {
  getTimelineLayerLabel,
  type TimelineClipViewModel,
  timelineMsToPx,
} from '@/lib/modern-timeline-utils';
import { cn } from '@/lib/utils';
import { TimelineClip } from './timeline-clip';

type TimelinePointerMode = 'move' | 'trim-start' | 'trim-end';

interface TimelineDragTiming {
  readonly startMs: number;
  readonly endMs: number;
}

interface TimelineLayerRowsProps {
  readonly layers: readonly Layer[];
  readonly clipViewModelById: ReadonlyMap<string, TimelineClipViewModel>;
  readonly previewByLayerId: Record<string, TimelineDragTiming> | null;
  readonly dragLayerId: string | null;
  readonly dragMode: TimelinePointerMode | null;
  readonly snapGuideLeftPx: number | null;
  readonly reorderTargetLayerId: string | null;
  readonly reorderingLayerId: string | null;
  readonly displayLayerIndexById: ReadonlyMap<string, number>;
  readonly currentTimeLeftPx: number;
  readonly headerWidthPx: number;
  readonly timelineWidthPx: number;
  readonly pxPerSecond: number;
  readonly rowHeightPx: number;
  readonly rowsRef: RefObject<HTMLDivElement | null>;
  readonly selectedLayerIds: readonly string[];
  readonly onTrackBackgroundPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    element: HTMLElement,
  ) => void;
  readonly onSelectLayer: (event: React.MouseEvent<HTMLButtonElement>, layerId: string) => void;
  readonly onDragStart: (event: React.DragEvent<HTMLElement>, layerId: string) => void;
  readonly onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  readonly onDrop: (event: React.DragEvent<HTMLElement>, targetLayerId: string) => void;
  readonly onDragEnd: () => void;
  readonly onPointerStart: (
    event: React.PointerEvent<HTMLButtonElement>,
    layer: Layer,
    mode: TimelinePointerMode,
  ) => void;
}

export function TimelineLayerRows({
  layers,
  clipViewModelById,
  previewByLayerId,
  dragLayerId,
  dragMode,
  snapGuideLeftPx,
  reorderTargetLayerId,
  reorderingLayerId,
  displayLayerIndexById,
  currentTimeLeftPx,
  headerWidthPx,
  timelineWidthPx,
  pxPerSecond,
  rowHeightPx,
  rowsRef,
  selectedLayerIds,
  onTrackBackgroundPointerDown,
  onSelectLayer,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onPointerStart,
}: TimelineLayerRowsProps) {
  return (
    <div ref={rowsRef} className="relative">
      <div
        className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-primary"
        style={{ left: headerWidthPx + currentTimeLeftPx, height: layers.length * rowHeightPx }}
      />
      {snapGuideLeftPx !== null && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-primary/60"
          style={{ left: headerWidthPx + snapGuideLeftPx, height: layers.length * rowHeightPx }}
        />
      )}
      {layers.map((layer) => {
        const viewModel = clipViewModelById.get(layer.id);
        const preview = previewByLayerId?.[layer.id] ?? null;
        if (!viewModel) return null;

        const isReorderTarget = reorderTargetLayerId === layer.id;
        const sourceIndex = displayLayerIndexById.get(layer.id) ?? 0;
        const targetIndex = reorderTargetLayerId
          ? displayLayerIndexById.get(reorderTargetLayerId)
          : null;
        const previewTranslateYPx =
          dragMode === 'move' &&
          dragLayerId === layer.id &&
          targetIndex !== null &&
          targetIndex !== undefined
            ? (targetIndex - sourceIndex) * rowHeightPx
            : 0;

        return (
          <div
            key={layer.id}
            className="relative isolate flex"
            style={{ height: rowHeightPx, width: headerWidthPx + timelineWidthPx }}
          >
            <button
              type="button"
              draggable
              className={cn(
                'sticky left-0 z-[70] flex shrink-0 items-center gap-2 overflow-hidden border-r border-t border-border/30 bg-card/95 px-2.5 text-left text-[11px] font-black shadow-[8px_0_18px_rgba(0,0,0,0.18)] backdrop-blur transition-colors',
                selectedLayerIds.includes(layer.id)
                  ? 'text-primary'
                  : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                reorderingLayerId === layer.id && 'opacity-55',
              )}
              style={{ width: headerWidthPx, height: rowHeightPx }}
              onClick={(event) => onSelectLayer(event, layer.id)}
              onDragStart={(event) => onDragStart(event, layer.id)}
              onDragOver={onDragOver}
              onDrop={(event) => onDrop(event, layer.id)}
              onDragEnd={onDragEnd}
              aria-label={`Geser urutan layer ${getTimelineLayerLabel(layer)}`}
            >
              <GripVertical
                size={14}
                className="shrink-0 text-muted-foreground/35 transition-colors"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">{getTimelineLayerLabel(layer)}</span>
            </button>

            <div
              className={cn(
                'relative z-0 cursor-ew-resize overflow-hidden border-t border-border/30 bg-background/20 hover:bg-muted/10',
                isReorderTarget &&
                  'bg-primary/10 outline outline-1 -outline-offset-1 outline-primary/45',
                reorderingLayerId &&
                  reorderingLayerId !== layer.id &&
                  'outline outline-1 -outline-offset-1 outline-primary/20',
              )}
              style={{ height: rowHeightPx, width: timelineWidthPx }}
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) {
                  onTrackBackgroundPointerDown(event, event.currentTarget);
                }
              }}
            >
              <TimelineClip
                layer={layer}
                viewModel={viewModel}
                previewLeftPx={preview ? timelineMsToPx(preview.startMs, pxPerSecond) : null}
                previewWidthPx={
                  preview ? timelineMsToPx(preview.endMs - preview.startMs, pxPerSecond) : null
                }
                previewTranslateYPx={previewTranslateYPx}
                onSelect={(event) => onSelectLayer(event, layer.id)}
                onPointerStart={(event, mode) => onPointerStart(event, layer, mode)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
