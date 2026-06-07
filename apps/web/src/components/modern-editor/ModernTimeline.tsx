import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildTimelineClipViewModels,
  buildTimelineRulerTicks,
  clampTimelineZoom,
  getTimelineAutoScrollDelta,
  getTimelineDurationMs,
  TIMELINE_DEFAULT_PX_PER_SECOND,
  timelineMsToPx,
  timelinePxToMs,
} from '@/lib/modern-timeline-utils';
import { cn } from '@/lib/utils';
import { useModernEditorStore } from '@/stores/modern-editor-store';
import { CompactMobileTimeline } from './timeline/compact-mobile-timeline';
import { TimelineLayerRows } from './timeline/timeline-layer-rows';
import { TimelineNavigator } from './timeline/timeline-navigator';
import { TimelineRuler } from './timeline/timeline-ruler';
import { TimelineToolbar } from './timeline/timeline-toolbar';
import { useTimelineLayerInteractions } from './timeline/use-timeline-layer-interactions';
import { useTimelineThumbnailBackfill } from './timeline/use-timeline-thumbnail-backfill';
import { useTimelineViewport } from './timeline/use-timeline-viewport';

interface ModernTimelineProps {
  readonly className?: string;
  readonly isFocusMode?: boolean;
}

const TIMELINE_ROW_HEIGHT_PX = 48;
const TIMELINE_RULER_HEIGHT_PX = 36;
const TIMELINE_HEADER_WIDTH_PX = 124;
const TIMELINE_ZOOM_STEP = 8;

export function ModernTimeline({ className, isFocusMode = false }: ModernTimelineProps) {
  const timelineWheelIdleTimerRef = useRef<number | null>(null);
  const timelineScrollLeftValueRef = useRef(0);
  const timelineEdgeAutoScrollRef = useRef<(clientX: number) => void>(() => {});
  const [pxPerSecond, setPxPerSecond] = useState(TIMELINE_DEFAULT_PX_PER_SECOND);
  const [isTimelineInteracting, setIsTimelineInteracting] = useState(false);
  const getTimelineScrollLeft = useCallback(() => timelineScrollLeftValueRef.current, []);
  const handleTimelineEdgeAutoScroll = useCallback((clientX: number) => {
    timelineEdgeAutoScrollRef.current(clientX);
  }, []);
  const {
    layerOrder,
    currentTimeMs,
    isPlaying,
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
  const {
    rowsRef: timelineRowsRef,
    dragState,
    reorderingLayerId,
    isLayerInteracting,
    handlePointerStart,
    handleLayerDragStart,
    handleLayerDragOver,
    handleLayerDrop,
    handleLayerDragEnd,
  } = useTimelineLayerInteractions({
    currentTimeMs,
    displayLayerIds,
    getTimelineScrollLeft,
    layerOrder,
    layers,
    moveLayerTiming,
    onTimelineEdgeAutoScroll: handleTimelineEdgeAutoScroll,
    pxPerSecond,
    reorderLayer,
    rowHeightPx: TIMELINE_ROW_HEIGHT_PX,
    selectedLayerIds,
    selectLayer,
    trimLayerTiming,
  });
  const durationMs = getTimelineDurationMs(getMaxEndMs());
  const timelineWidthPx = Math.max(360, timelineMsToPx(durationMs, pxPerSecond));
  const currentTimeLeftPx = timelineMsToPx(currentTimeMs, pxPerSecond);
  const snapGuideLeftPx =
    dragState?.snapGuideMs == null ? null : timelineMsToPx(dragState.snapGuideMs, pxPerSecond);
  const selectedCount = selectedLayerIds.length;
  const isUserInteractingWithTimeline = isTimelineInteracting || isLayerInteracting;
  const {
    timelineScrollRef,
    timelineScrollLeft,
    timelineViewportWidth,
    setTimelineScrollLeft,
    handleTimelineScroll,
    handleTimelineWheel,
  } = useTimelineViewport({
    headerWidthPx: TIMELINE_HEADER_WIDTH_PX,
    timelineWidthPx,
    currentTimeLeftPx,
    isPlaying,
    isUserInteracting: isUserInteractingWithTimeline,
  });
  timelineScrollLeftValueRef.current = timelineScrollRef.current?.scrollLeft ?? timelineScrollLeft;

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

  useTimelineThumbnailBackfill(assets);

  useEffect(
    () => () => {
      if (timelineWheelIdleTimerRef.current !== null) {
        window.clearTimeout(timelineWheelIdleTimerRef.current);
      }
    },
    [],
  );

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
    for (const id of displayLayerIds.slice(from, to + 1)) {
      toggleLayerSelection(id);
    }
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

  const scrollTimelineDuringScrub = (clientX: number) => {
    const scrollElement = timelineScrollRef.current;
    if (!scrollElement) {
      return;
    }

    const scrollRect = scrollElement.getBoundingClientRect();
    const scrollDeltaPx = getTimelineAutoScrollDelta({
      pointerClientX: clientX,
      viewportLeftPx: scrollRect.left + TIMELINE_HEADER_WIDTH_PX,
      viewportRightPx: scrollRect.right,
    });

    if (scrollDeltaPx !== 0) {
      setTimelineScrollLeft(scrollElement.scrollLeft + scrollDeltaPx);
      timelineScrollLeftValueRef.current = scrollElement.scrollLeft;
    }
  };
  timelineEdgeAutoScrollRef.current = scrollTimelineDuringScrub;

  const seekToClientX = (
    clientX: number,
    rulerElement: HTMLElement,
    options: Readonly<{ autoScroll?: boolean }> = {},
  ) => {
    if (options.autoScroll) {
      scrollTimelineDuringScrub(clientX);
    }

    const rect = rulerElement.getBoundingClientRect();
    const nextTimeMs = timelinePxToMs(clientX - rect.left, pxPerSecond);
    pause();
    setCurrentTime(Math.max(0, Math.min(durationMs, nextTimeMs)));
  };

  const handleTrackBackgroundPointerDown = (
    event: React.PointerEvent<HTMLElement>,
    trackElement: HTMLElement,
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsTimelineInteracting(true);
    seekToClientX(event.clientX, trackElement, { autoScroll: true });

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      seekToClientX(moveEvent.clientX, trackElement, { autoScroll: true });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      setIsTimelineInteracting(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const handleTimelineViewportPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    setIsTimelineInteracting(true);
    window.addEventListener('pointerup', () => setIsTimelineInteracting(false), { once: true });
  };

  const handleTimelineViewportWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    setIsTimelineInteracting(true);
    if (timelineWheelIdleTimerRef.current !== null) {
      window.clearTimeout(timelineWheelIdleTimerRef.current);
    }
    timelineWheelIdleTimerRef.current = window.setTimeout(() => {
      setIsTimelineInteracting(false);
      timelineWheelIdleTimerRef.current = null;
    }, 650);
    handleTimelineWheel(event);
  };

  const handleScrubStart = (event: React.PointerEvent<HTMLElement>) => {
    const rulerElement = event.currentTarget;
    setIsTimelineInteracting(true);
    seekToClientX(event.clientX, rulerElement, { autoScroll: true });

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      seekToClientX(moveEvent.clientX, rulerElement, { autoScroll: true });
    };
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      setIsTimelineInteracting(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const changeZoom = (delta: number) => {
    setPxPerSecond((value) => clampTimelineZoom(value + delta));
  };

  const fitTimelineToViewport = () => {
    const durationSeconds = Math.max(1, durationMs / 1000);
    const fitPxPerSecond = timelineViewportWidth / durationSeconds;
    setPxPerSecond(clampTimelineZoom(fitPxPerSecond));
    setTimelineScrollLeft(0);
  };

  const resetTimelineZoom = () => {
    setPxPerSecond(TIMELINE_DEFAULT_PX_PER_SECOND);
  };

  return (
    <section
      className={cn(
        'h-24 border-t border-border/50 bg-card/70 backdrop-blur-xl',
        (() => {
          if (hasLayers) return 'md:h-[220px]';
          if (isFocusMode) return 'md:h-[156px]';
          return 'md:h-[172px]';
        })(),
        className,
      )}
      aria-label="Video studio timeline"
    >
      <div className="hidden h-full min-h-0 flex-col md:flex">
        <TimelineToolbar
          layerCount={layers.length}
          selectedCount={selectedCount}
          pxPerSecond={pxPerSecond}
          canFitTimeline={timelineViewportWidth > 0}
          onFitTimeline={fitTimelineToViewport}
          onResetZoom={resetTimelineZoom}
          onZoomOut={() => changeZoom(-TIMELINE_ZOOM_STEP)}
          onZoomIn={() => changeZoom(TIMELINE_ZOOM_STEP)}
          onSplit={() => splitLayerAtPlayhead()}
          onDuplicate={() => duplicateSelectedLayers()}
          onDelete={() => deleteSelectedLayers()}
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            ref={timelineScrollRef}
            className="scrollbar-hide h-full min-w-0 overflow-auto bg-background/30"
            onScroll={handleTimelineScroll}
            onPointerDown={handleTimelineViewportPointerDown}
            onWheel={handleTimelineViewportWheel}
          >
            <div
              className="relative min-h-full"
              style={{
                width: TIMELINE_HEADER_WIDTH_PX + timelineWidthPx,
                minHeight: TIMELINE_RULER_HEIGHT_PX + displayLayers.length * TIMELINE_ROW_HEIGHT_PX,
              }}
            >
              <div className="sticky top-0 z-40 flex h-9">
                <div
                  className="sticky left-0 z-50 flex shrink-0 items-center border-r border-b border-border/50 bg-card/95 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 backdrop-blur"
                  style={{ width: TIMELINE_HEADER_WIDTH_PX, height: TIMELINE_RULER_HEIGHT_PX }}
                >
                  Layer
                </div>
                <TimelineRuler
                  ticks={ticks}
                  widthPx={timelineWidthPx}
                  currentTimeLeftPx={currentTimeLeftPx}
                  onScrubStart={handleScrubStart}
                />
              </div>

              {layers.length === 0 ? (
                <div
                  className="m-3 rounded-xl border border-dashed border-border/40 bg-background/20 px-4 py-3 text-center text-xs font-bold text-muted-foreground"
                  style={{ marginLeft: TIMELINE_HEADER_WIDTH_PX + 12 }}
                >
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
                  headerWidthPx={TIMELINE_HEADER_WIDTH_PX}
                  timelineWidthPx={timelineWidthPx}
                  pxPerSecond={pxPerSecond}
                  rowHeightPx={TIMELINE_ROW_HEIGHT_PX}
                  rowsRef={timelineRowsRef}
                  selectedLayerIds={selectedLayerIds}
                  onTrackBackgroundPointerDown={handleTrackBackgroundPointerDown}
                  onSelectLayer={handleSelectLayer}
                  onDragStart={handleLayerDragStart}
                  onDragOver={handleLayerDragOver}
                  onDrop={handleLayerDrop}
                  onDragEnd={handleLayerDragEnd}
                  onPointerStart={handlePointerStart}
                />
              )}
            </div>
          </div>
        </div>

        <TimelineNavigator
          currentTimeLeftPx={currentTimeLeftPx}
          durationMs={durationMs}
          pxPerSecond={pxPerSecond}
          scrollLeftPx={timelineScrollLeft}
          scrollWidthPx={timelineWidthPx}
          viewportWidthPx={timelineViewportWidth}
          onScrollLeftChange={setTimelineScrollLeft}
          onInteractionStart={() => setIsTimelineInteracting(true)}
          onInteractionEnd={() => setIsTimelineInteracting(false)}
        />
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
