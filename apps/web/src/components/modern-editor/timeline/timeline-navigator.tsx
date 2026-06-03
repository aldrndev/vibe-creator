import { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatTimelineTick,
  getTimelineNavigatorThumbMetrics,
  getTimelineScrollLeftFromNavigatorPoint,
  getTimelineScrollLeftFromNavigatorThumbDrag,
  timelinePxToMs,
} from '@/lib/modern-timeline-utils';
import { cn } from '@/lib/utils';

const NAVIGATOR_MIN_THUMB_WIDTH_PX = 34;

interface TimelineNavigatorProps {
  readonly currentTimeLeftPx: number;
  readonly durationMs: number;
  readonly pxPerSecond: number;
  readonly scrollLeftPx: number;
  readonly scrollWidthPx: number;
  readonly viewportWidthPx: number;
  readonly onScrollLeftChange: (scrollLeftPx: number) => void;
  readonly onInteractionStart: () => void;
  readonly onInteractionEnd: () => void;
}

interface NavigatorDragState {
  readonly pointerStartX: number;
  readonly scrollLeftStartPx: number;
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

/**
 * Small timeline map used to pan long projects without moving the playhead.
 */
export function TimelineNavigator({
  currentTimeLeftPx,
  durationMs,
  onInteractionEnd,
  onInteractionStart,
  onScrollLeftChange,
  pxPerSecond,
  scrollLeftPx,
  scrollWidthPx,
  viewportWidthPx,
}: TimelineNavigatorProps) {
  const trackRef = useRef<HTMLButtonElement>(null);
  const dragStateRef = useRef<NavigatorDragState | null>(null);
  const [trackWidthPx, setTrackWidthPx] = useState(0);

  useEffect(() => {
    const element = trackRef.current;
    if (!element) {
      return;
    }

    const updateTrackWidth = () => setTrackWidthPx(element.clientWidth);
    updateTrackWidth();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(updateTrackWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const thumb = useMemo(
    () =>
      getTimelineNavigatorThumbMetrics({
        scrollLeftPx,
        scrollWidthPx,
        viewportWidthPx,
        trackWidthPx,
        minThumbWidthPx: NAVIGATOR_MIN_THUMB_WIDTH_PX,
      }),
    [scrollLeftPx, scrollWidthPx, trackWidthPx, viewportWidthPx],
  );

  const visibleStartMs = Math.min(durationMs, timelinePxToMs(scrollLeftPx, pxPerSecond));
  const visibleEndMs = Math.min(
    durationMs,
    timelinePxToMs(scrollLeftPx + viewportWidthPx, pxPerSecond),
  );
  const playheadLeftPx = clampRatio(currentTimeLeftPx / Math.max(1, scrollWidthPx)) * trackWidthPx;

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }

    const trackElement = trackRef.current;
    if (!trackElement) {
      return;
    }

    event.preventDefault();
    onInteractionStart();
    onScrollLeftChange(
      getTimelineScrollLeftFromNavigatorPoint({
        pointerX: event.clientX,
        scrollWidthPx,
        trackLeftPx: trackElement.getBoundingClientRect().left,
        trackWidthPx,
        viewportWidthPx,
        minThumbWidthPx: NAVIGATOR_MIN_THUMB_WIDTH_PX,
      }),
    );
    window.setTimeout(onInteractionEnd, 0);
  };

  const handleThumbPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !thumb.scrollable) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onInteractionStart();

    dragStateRef.current = {
      pointerStartX: event.clientX,
      scrollLeftStartPx: scrollLeftPx,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      onScrollLeftChange(
        getTimelineScrollLeftFromNavigatorThumbDrag({
          deltaX: moveEvent.clientX - dragState.pointerStartX,
          startScrollLeftPx: dragState.scrollLeftStartPx,
          scrollWidthPx,
          trackWidthPx,
          viewportWidthPx,
          minThumbWidthPx: NAVIGATOR_MIN_THUMB_WIDTH_PX,
        }),
      );
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      onInteractionEnd();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  return (
    <div className="flex h-6 shrink-0 items-center gap-2.5 border-t border-border/35 bg-card/45 px-4 text-[8px] font-black text-muted-foreground/65 backdrop-blur">
      <span className="hidden w-12 shrink-0 tabular-nums sm:block">
        {formatTimelineTick(visibleStartMs)}
      </span>

      <div className="relative min-w-0 flex-1">
        <button
          ref={trackRef}
          type="button"
          aria-label="Pindahkan viewport timeline"
          className="relative h-1.5 w-full overflow-hidden rounded-full border border-border/20 bg-background/55 outline-none transition-colors hover:border-primary/20 focus-visible:ring-2 focus-visible:ring-primary"
          onPointerDown={handleTrackPointerDown}
        >
          <span className="absolute inset-y-0 left-0 right-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.02),rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
          <span
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary/70"
            style={{ left: playheadLeftPx }}
          />
        </button>

        <button
          type="button"
          aria-label="Geser timeline ke waktu lain"
          className={cn(
            'absolute top-1/2 h-3 -translate-y-1/2 rounded-full border border-primary/35 bg-primary/15 shadow-[0_0_10px_rgba(255,79,18,0.12)] backdrop-blur transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-primary',
            thumb.scrollable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-60',
          )}
          style={{
            left: thumb.thumbLeftPx,
            width: thumb.thumbWidthPx,
          }}
          disabled={!thumb.scrollable}
          onPointerDown={handleThumbPointerDown}
        >
          <span className="mx-auto block h-full w-5 max-w-[58%] rounded-full bg-primary/25" />
        </button>
      </div>

      <span className="w-20 shrink-0 text-right tabular-nums">
        {formatTimelineTick(visibleEndMs)} / {formatTimelineTick(durationMs)}
      </span>
    </div>
  );
}
