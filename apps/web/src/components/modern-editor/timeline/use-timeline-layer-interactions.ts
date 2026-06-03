import type { Layer } from '@vibe-creator/shared';
import { useEffect, useRef, useState } from 'react';
import {
  calculateMovedLayerTiming,
  calculateTrimmedLayerTiming,
  collectTimelineSnapPoints,
  getTimelineReorderTargetLayerId,
  type TimelineTrimEdge,
  timelinePxToMs,
} from '@/lib/modern-timeline-utils';

export type TimelinePointerMode = 'move' | 'trim-start' | 'trim-end';

interface TimelineDragTiming {
  readonly startMs: number;
  readonly endMs: number;
}

interface TimelineDragState {
  readonly layerId: string;
  readonly mode: TimelinePointerMode;
  readonly pointerStartX: number;
  readonly pointerStartY: number;
  readonly scrollStartLeftPx: number;
  readonly originalByLayerId: Record<string, TimelineDragTiming>;
  readonly previewByLayerId: Record<string, TimelineDragTiming>;
  readonly snapGuideMs: number | null;
  readonly reorderTargetLayerId: string | null;
}

interface UseTimelineLayerInteractionsInput {
  readonly currentTimeMs: number;
  readonly displayLayerIds: readonly string[];
  readonly layerOrder: readonly string[];
  readonly layers: readonly Layer[];
  readonly pxPerSecond: number;
  readonly rowHeightPx: number;
  readonly selectedLayerIds: readonly string[];
  readonly getTimelineScrollLeft: () => number;
  readonly moveLayerTiming: (layerId: string, deltaMs: number) => void;
  readonly onTimelineEdgeAutoScroll: (clientX: number) => void;
  readonly reorderLayer: (layerId: string, newZIndex: number) => void;
  readonly selectLayer: (layerId: string | null) => void;
  readonly trimLayerTiming: (layerId: string, edge: TimelineTrimEdge, targetMs: number) => void;
}

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

/**
 * Owns layer timing drag, trim, and vertical reorder interactions for the timeline.
 */
export function useTimelineLayerInteractions({
  currentTimeMs,
  displayLayerIds,
  getTimelineScrollLeft,
  layerOrder,
  layers,
  moveLayerTiming,
  onTimelineEdgeAutoScroll,
  pxPerSecond,
  reorderLayer,
  rowHeightPx,
  selectedLayerIds,
  selectLayer,
  trimLayerTiming,
}: UseTimelineLayerInteractionsInput) {
  const rowsRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<TimelineDragState | null>(null);
  const [reorderingLayerId, setReorderingLayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();

      const anchorLayer = getLayerById(layers, dragState.layerId);
      const anchorTiming = dragState.originalByLayerId[dragState.layerId];
      if (!anchorLayer || !anchorTiming) return;

      onTimelineEdgeAutoScroll(event.clientX);
      const scrollDeltaPx = getTimelineScrollLeft() - dragState.scrollStartLeftPx;
      const deltaMs = timelinePxToMs(
        event.clientX - dragState.pointerStartX + scrollDeltaPx,
        pxPerSecond,
      );
      const selectedIds = Object.keys(dragState.originalByLayerId);
      const selectedSet = new Set(selectedIds);
      const snapPoints = collectTimelineSnapPoints(layers, currentTimeMs, selectedSet);

      if (dragState.mode === 'move') {
        const rowsElement = rowsRef.current;
        const reorderTargetLayerId = rowsElement
          ? getTimelineReorderTargetLayerId({
              clientY: event.clientY,
              containerTopPx: rowsElement.getBoundingClientRect().top,
              rowHeightPx,
              layerIds: displayLayerIds,
              draggedLayerId: dragState.layerId,
              pointerStartY: dragState.pointerStartY,
            })
          : null;
        const rawStartMs = anchorTiming.startMs + deltaMs;
        const moved = calculateMovedLayerTiming({
          layer: { ...anchorLayer, startMs: anchorTiming.startMs, endMs: anchorTiming.endMs },
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
    getTimelineScrollLeft,
    layerOrder,
    layers,
    moveLayerTiming,
    onTimelineEdgeAutoScroll,
    pxPerSecond,
    reorderLayer,
    rowHeightPx,
    trimLayerTiming,
  ]);

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
      scrollStartLeftPx: getTimelineScrollLeft(),
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

  return {
    rowsRef,
    dragState,
    reorderingLayerId,
    isLayerInteracting: dragState !== null || reorderingLayerId !== null,
    handlePointerStart,
    handleLayerDragStart,
    handleLayerDragOver,
    handleLayerDrop,
    handleLayerDragEnd: () => setReorderingLayerId(null),
  };
}
