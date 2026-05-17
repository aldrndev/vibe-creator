import type { Layer } from '@vibe-creator/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildTimelineClipViewModels,
  buildTimelineRulerTicks,
  calculateMovedLayerTiming,
  calculateTrimmedLayerTiming,
  clampTimelineZoom,
  collectTimelineSnapPoints,
  getTimelineDurationMs,
  getTimelineReorderTargetLayerId,
  TIMELINE_DEFAULT_PX_PER_SECOND,
  timelineMsToPx,
  timelinePxToMs,
} from '@/lib/modern-timeline-utils';
import { cn } from '@/lib/utils';
import { useModernEditorStore } from '@/stores/modern-editor-store';
import { CompactMobileTimeline } from './timeline/compact-mobile-timeline';
import { TimelineLayerHeader } from './timeline/timeline-layer-header';
import { TimelineLayerRows } from './timeline/timeline-layer-rows';
import { TimelineRuler } from './timeline/timeline-ruler';
import { TimelineToolbar } from './timeline/timeline-toolbar';

type TimelinePointerMode = 'move' | 'trim-start' | 'trim-end';

interface TimelineDragTiming {
  readonly startMs: number;
  readonly endMs: number;
}

interface TimelineDragState {
  readonly layerId: string;
  readonly mode: TimelinePointerMode;
  readonly pointerStartX: number;
  readonly pointerStartY: number;
  readonly originalByLayerId: Record<string, TimelineDragTiming>;
  readonly previewByLayerId: Record<string, TimelineDragTiming>;
  readonly snapGuideMs: number | null;
  readonly reorderTargetLayerId: string | null;
}

interface ModernTimelineProps {
  readonly className?: string;
  readonly isFocusMode?: boolean;
}

const TIMELINE_ROW_HEIGHT_PX = 48;
const TIMELINE_RULER_HEIGHT_PX = 36;
const TIMELINE_HEADER_WIDTH_CLASS = 'w-[124px]';
const TIMELINE_ZOOM_STEP = 8;

function getLayerById(layers: readonly Layer[], layerId: string): Layer | null {
  return layers.find((layer) => layer.id === layerId) ?? null;
}

function createOriginalTimings(layers: readonly Layer[], layerIds: readonly string[]) {
  return Object.fromEntries(
    layerIds.flatMap((layerId) => {
      const layer = getLayerById(layers, layerId);
      return layer ? [[layerId, { startMs: layer.startMs, endMs: layer.endMs }]] : [];
    }),
  );
}

function isTrimMode(mode: TimelinePointerMode): mode is 'trim-start' | 'trim-end' {
  return mode === 'trim-start' || mode === 'trim-end';
}

function hasTimingChanged(original: TimelineDragTiming, preview: TimelineDragTiming): boolean {
  return (
    Math.abs(original.startMs - preview.startMs) >= 1 ||
    Math.abs(original.endMs - preview.endMs) >= 1
  );
}

export function ModernTimeline({ className, isFocusMode = false }: ModernTimelineProps) {
  const timelineRowsRef = useRef<HTMLDivElement>(null);
  const [pxPerSecond, setPxPerSecond] = useState(TIMELINE_DEFAULT_PX_PER_SECOND);
  const [dragState, setDragState] = useState<TimelineDragState | null>(null);
  const [reorderingLayerId, setReorderingLayerId] = useState<string | null>(null);
  const {
    layerOrder,
    currentTimeMs,
    setCurrentTime,
    pause,
    getMaxEndMs,
    getLayersSorted,
    assets,
    selectedLayerId,
    selectedLayerIds,
    selectLayer,
    toggleLayerSelection,
    clearLayerSelection,
    moveLayerTiming,
    trimLayerTiming,
    reorderLayer,
    splitLayerAtPlayhead,
    duplicateSelectedLayers,
    deleteSelectedLayers,
  } = useModernEditorStore();

  const layers = getLayersSorted();
  const hasLayers = layers.length > 0;
  const displayLayers = useMemo(() => layers.slice().reverse(), [layers]);
  const displayLayerIds = useMemo(() => displayLayers.map((layer) => layer.id), [displayLayers]);
  const displayLayerIndexById = useMemo(
    () => new Map(displayLayerIds.map((layerId, index) => [layerId, index])),
    [displayLayerIds],
  );
  const durationMs = getTimelineDurationMs(getMaxEndMs());
  const timelineWidthPx = Math.max(360, timelineMsToPx(durationMs, pxPerSecond));
  const currentTimeLeftPx = timelineMsToPx(currentTimeMs, pxPerSecond);
  const snapGuideLeftPx =
    dragState?.snapGuideMs != null ? timelineMsToPx(dragState.snapGuideMs, pxPerSecond) : null;
  const selectedCount = selectedLayerIds.length;

  const ticks = useMemo(
    () => buildTimelineRulerTicks(durationMs, pxPerSecond),
    [durationMs, pxPerSecond],
  );
  const clipViewModels = useMemo(
    () =>
      buildTimelineClipViewModels({
        layers,
        assets,
        selectedLayerIds,
        pxPerSecond,
      }),
    [assets, layers, pxPerSecond, selectedLayerIds],
  );
  const clipViewModelById = useMemo(
    () => new Map(clipViewModels.map((viewModel) => [viewModel.layerId, viewModel])),
    [clipViewModels],
  );

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();

      const anchorLayer = getLayerById(layers, dragState.layerId);
      const anchorTiming = dragState.originalByLayerId[dragState.layerId];
      if (!anchorLayer || !anchorTiming) return;

      const deltaMs = timelinePxToMs(event.clientX - dragState.pointerStartX, pxPerSecond);
      const selectedIds = Object.keys(dragState.originalByLayerId);
      const selectedSet = new Set(selectedIds);
      const snapPoints = collectTimelineSnapPoints(layers, currentTimeMs, selectedSet);

      if (dragState.mode === 'move') {
        const rowsElement = timelineRowsRef.current;
        const reorderTargetLayerId = rowsElement
          ? getTimelineReorderTargetLayerId({
              clientY: event.clientY,
              containerTopPx: rowsElement.getBoundingClientRect().top,
              rowHeightPx: TIMELINE_ROW_HEIGHT_PX,
              layerIds: displayLayerIds,
              draggedLayerId: dragState.layerId,
              pointerStartY: dragState.pointerStartY,
            })
          : null;
        const anchorForCalculation = {
          ...anchorLayer,
          startMs: anchorTiming.startMs,
          endMs: anchorTiming.endMs,
        } as Layer;
        const rawStartMs = anchorTiming.startMs + deltaMs;
        const moved = calculateMovedLayerTiming({
          layer: anchorForCalculation,
          deltaMs,
          snapPoints,
        });
        const appliedDeltaMs = moved.startMs - anchorTiming.startMs;
        const previewByLayerId = Object.fromEntries(
          selectedIds.flatMap((layerId) => {
            const timing = dragState.originalByLayerId[layerId];
            return timing
              ? [
                  [
                    layerId,
                    {
                      startMs: Math.max(0, timing.startMs + appliedDeltaMs),
                      endMs: Math.max(0, timing.endMs + appliedDeltaMs),
                    },
                  ],
                ]
              : [];
          }),
        );

        setDragState({
          ...dragState,
          previewByLayerId,
          snapGuideMs: moved.startMs !== rawStartMs ? moved.startMs : null,
          reorderTargetLayerId,
        });
        return;
      }

      if (isTrimMode(dragState.mode)) {
        const edge = dragState.mode === 'trim-start' ? 'start' : 'end';
        const rawTargetMs =
          edge === 'start' ? anchorTiming.startMs + deltaMs : anchorTiming.endMs + deltaMs;
        const trimmed = calculateTrimmedLayerTiming({
          layer: { ...anchorLayer, startMs: anchorTiming.startMs, endMs: anchorTiming.endMs },
          edge,
          targetMs: rawTargetMs,
          snapPoints,
        });
        const snappedTargetMs = edge === 'start' ? trimmed.startMs : trimmed.endMs;

        setDragState({
          ...dragState,
          previewByLayerId: { [dragState.layerId]: trimmed },
          snapGuideMs: snappedTargetMs !== rawTargetMs ? snappedTargetMs : null,
        });
      }
    };

    const handlePointerUp = () => {
      const anchorTiming = dragState.originalByLayerId[dragState.layerId];
      const previewTiming = dragState.previewByLayerId[dragState.layerId];

      if (anchorTiming && previewTiming && hasTimingChanged(anchorTiming, previewTiming)) {
        if (dragState.mode === 'move') {
          moveLayerTiming(dragState.layerId, previewTiming.startMs - anchorTiming.startMs);
        } else if (dragState.mode === 'trim-start') {
          trimLayerTiming(dragState.layerId, 'start', previewTiming.startMs);
        } else {
          trimLayerTiming(dragState.layerId, 'end', previewTiming.endMs);
        }
      }

      if (dragState.mode === 'move' && dragState.reorderTargetLayerId) {
        const targetIndex = layerOrder.indexOf(dragState.reorderTargetLayerId);
        if (targetIndex !== -1) {
          reorderLayer(dragState.layerId, targetIndex);
        }
      }

      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    currentTimeMs,
    displayLayerIds,
    dragState,
    layerOrder,
    layers,
    moveLayerTiming,
    pxPerSecond,
    reorderLayer,
    trimLayerTiming,
  ]);

  const selectRangeToLayer = (layerId: string) => {
    if (!selectedLayerId) {
      selectLayer(layerId);
      return;
    }

    const startIndex = displayLayerIds.indexOf(selectedLayerId);
    const endIndex = displayLayerIds.indexOf(layerId);
    if (startIndex === -1 || endIndex === -1) {
      selectLayer(layerId);
      return;
    }

    const [from, to] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
    clearLayerSelection();
    displayLayerIds.slice(from, to + 1).forEach((id) => {
      toggleLayerSelection(id);
    });
  };

  const handleSelectLayer = (event: React.MouseEvent<HTMLButtonElement>, layerId: string) => {
    event.stopPropagation();

    if (event.shiftKey) {
      selectRangeToLayer(layerId);
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      toggleLayerSelection(layerId);
      return;
    }

    selectLayer(layerId);
  };

  const handlePointerStart = (
    event: React.PointerEvent<HTMLButtonElement>,
    layer: Layer,
    mode: TimelinePointerMode,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (layer.locked) return;

    const selectedIds = selectedLayerIds.includes(layer.id) ? selectedLayerIds : [layer.id];
    if (!selectedLayerIds.includes(layer.id)) {
      selectLayer(layer.id);
    }

    const originalByLayerId = createOriginalTimings(layers, selectedIds);
    setDragState({
      layerId: layer.id,
      mode,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      originalByLayerId,
      previewByLayerId: originalByLayerId,
      snapGuideMs: null,
      reorderTargetLayerId: null,
    });
  };

  const handleLayerDragStart = (event: React.DragEvent<HTMLElement>, layerId: string) => {
    event.dataTransfer.setData('layerId', layerId);
    event.dataTransfer.effectAllowed = 'move';
    setReorderingLayerId(layerId);
    selectLayer(layerId);
  };

  const handleLayerDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleLayerDrop = (event: React.DragEvent<HTMLElement>, targetLayerId: string) => {
    event.preventDefault();

    const draggedLayerId = event.dataTransfer.getData('layerId') || reorderingLayerId;
    setReorderingLayerId(null);

    if (!draggedLayerId || draggedLayerId === targetLayerId) return;

    const targetIndex = layerOrder.indexOf(targetLayerId);
    if (targetIndex === -1) return;

    reorderLayer(draggedLayerId, targetIndex);
  };

  const seekToClientX = (clientX: number, rulerElement: HTMLElement) => {
    const rect = rulerElement.getBoundingClientRect();
    const nextTimeMs = timelinePxToMs(clientX - rect.left, pxPerSecond);
    pause();
    setCurrentTime(Math.max(0, Math.min(durationMs, nextTimeMs)));
  };

  const handleScrubStart = (event: React.PointerEvent<HTMLElement>) => {
    const rulerElement = event.currentTarget;
    seekToClientX(event.clientX, rulerElement);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      seekToClientX(moveEvent.clientX, rulerElement);
    };
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const changeZoom = (delta: number) => {
    setPxPerSecond((value) => clampTimelineZoom(value + delta));
  };

  return (
    <section
      className={cn(
        'h-24 border-t border-border/50 bg-card/70 backdrop-blur-xl',
        hasLayers ? 'md:h-[220px]' : isFocusMode ? 'md:h-[156px]' : 'md:h-[172px]',
        className,
      )}
      aria-label="Video studio timeline"
    >
      <div className="hidden h-full min-h-0 flex-col md:flex">
        <TimelineToolbar
          layerCount={layers.length}
          selectedCount={selectedCount}
          pxPerSecond={pxPerSecond}
          onZoomOut={() => changeZoom(-TIMELINE_ZOOM_STEP)}
          onZoomIn={() => changeZoom(TIMELINE_ZOOM_STEP)}
          onSplit={() => splitLayerAtPlayhead()}
          onDuplicate={() => duplicateSelectedLayers()}
          onDelete={() => deleteSelectedLayers()}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <TimelineLayerHeader
            layers={displayLayers}
            selectedLayerIds={selectedLayerIds}
            reorderingLayerId={reorderingLayerId}
            rowHeightPx={TIMELINE_ROW_HEIGHT_PX}
            rulerHeightPx={TIMELINE_RULER_HEIGHT_PX}
            className={TIMELINE_HEADER_WIDTH_CLASS}
            onSelectLayer={handleSelectLayer}
            onDragStart={handleLayerDragStart}
            onDragOver={handleLayerDragOver}
            onDrop={handleLayerDrop}
            onDragEnd={() => setReorderingLayerId(null)}
          />

          <div className="min-w-0 flex-1 overflow-auto bg-background/30">
            <div
              className="relative min-h-full"
              style={{
                width: timelineWidthPx,
                minHeight: TIMELINE_RULER_HEIGHT_PX + displayLayers.length * TIMELINE_ROW_HEIGHT_PX,
              }}
            >
              <TimelineRuler
                ticks={ticks}
                widthPx={timelineWidthPx}
                currentTimeLeftPx={currentTimeLeftPx}
                onScrubStart={handleScrubStart}
              />

              {layers.length === 0 ? (
                <div className="m-3 rounded-xl border border-dashed border-border/40 bg-background/20 px-4 py-3 text-center text-xs font-bold text-muted-foreground">
                  Timeline siap. Tambahkan media atau template.
                </div>
              ) : (
                <TimelineLayerRows
                  layers={displayLayers}
                  clipViewModelById={clipViewModelById}
                  previewByLayerId={dragState?.previewByLayerId ?? null}
                  dragLayerId={dragState?.layerId ?? null}
                  dragMode={dragState?.mode ?? null}
                  snapGuideLeftPx={snapGuideLeftPx}
                  reorderTargetLayerId={dragState?.reorderTargetLayerId ?? null}
                  reorderingLayerId={reorderingLayerId}
                  displayLayerIndexById={displayLayerIndexById}
                  currentTimeLeftPx={currentTimeLeftPx}
                  timelineWidthPx={timelineWidthPx}
                  pxPerSecond={pxPerSecond}
                  rowHeightPx={TIMELINE_ROW_HEIGHT_PX}
                  rowsRef={timelineRowsRef}
                  onSeekToClientX={seekToClientX}
                  onSelectLayer={handleSelectLayer}
                  onPointerStart={handlePointerStart}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <CompactMobileTimeline
        layers={displayLayers}
        clipViewModelById={clipViewModelById}
        currentTimeLeftPx={currentTimeLeftPx}
        timelineWidthPx={timelineWidthPx}
        onScrubStart={handleScrubStart}
        onSelectLayer={selectLayer}
      />
    </section>
  );
}
