import type { Layer } from '@vibe-creator/shared';
import type { RefObject } from 'react';
import { type TimelineClipViewModel, timelineMsToPx } from '@/lib/modern-timeline-utils';
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
  readonly timelineWidthPx: number;
  readonly pxPerSecond: number;
  readonly rowHeightPx: number;
  readonly rowsRef: RefObject<HTMLDivElement | null>;
  readonly onSeekToClientX: (clientX: number, element: HTMLElement) => void;
  readonly onSelectLayer: (event: React.MouseEvent<HTMLButtonElement>, layerId: string) => void;
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
  timelineWidthPx,
  pxPerSecond,
  rowHeightPx,
  rowsRef,
  onSeekToClientX,
  onSelectLayer,
  onPointerStart,
}: TimelineLayerRowsProps) {
  return (
    <div ref={rowsRef} className="relative">
      <div
        className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-primary"
        style={{ left: currentTimeLeftPx, height: layers.length * rowHeightPx }}
      />
      {snapGuideLeftPx !== null && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-primary/60"
          style={{ left: snapGuideLeftPx, height: layers.length * rowHeightPx }}
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
            className={cn(
              'relative border-t border-border/30 bg-background/20 hover:bg-muted/10',
              isReorderTarget &&
                'bg-primary/10 outline outline-1 -outline-offset-1 outline-primary/45',
              reorderingLayerId &&
                reorderingLayerId !== layer.id &&
                'outline outline-1 -outline-offset-1 outline-primary/20',
            )}
            style={{ height: rowHeightPx, width: timelineWidthPx }}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                onSeekToClientX(event.clientX, event.currentTarget);
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
        );
      })}
    </div>
  );
}
