import { type UIEvent, useCallback, useEffect, useRef, useState, type WheelEvent } from 'react';
import {
  clampTimelineScrollLeft,
  getTimelineScrollLeftToShowTime,
} from '@/lib/modern-timeline-utils';

const PLAYHEAD_VISIBILITY_PADDING_PX = 80;

interface UseTimelineViewportInput {
  readonly headerWidthPx: number;
  readonly timelineWidthPx: number;
  readonly currentTimeLeftPx: number;
  readonly isPlaying: boolean;
  readonly isUserInteracting: boolean;
}

/**
 * Keeps horizontal timeline scroll state in sync with the native scroll container.
 */
export function useTimelineViewport({
  currentTimeLeftPx,
  headerWidthPx,
  isPlaying,
  isUserInteracting,
  timelineWidthPx,
}: UseTimelineViewportInput) {
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const [timelineScrollLeft, setTimelineScrollLeftState] = useState(0);
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);

  const setTimelineScrollLeft = useCallback(
    (nextScrollLeftPx: number) => {
      const element = timelineScrollRef.current;
      const clampedScrollLeft = clampTimelineScrollLeft(
        nextScrollLeftPx,
        timelineWidthPx,
        timelineViewportWidth,
      );

      if (element) {
        element.scrollLeft = clampedScrollLeft;
      }

      setTimelineScrollLeftState(clampedScrollLeft);
    },
    [timelineViewportWidth, timelineWidthPx],
  );

  const ensureTimeVisible = useCallback(
    (timeLeftPx: number, paddingPx = PLAYHEAD_VISIBILITY_PADDING_PX) => {
      setTimelineScrollLeft(
        getTimelineScrollLeftToShowTime({
          timeLeftPx,
          scrollLeftPx: timelineScrollRef.current?.scrollLeft ?? timelineScrollLeft,
          scrollWidthPx: timelineWidthPx,
          viewportWidthPx: timelineViewportWidth,
          paddingPx,
        }),
      );
    },
    [setTimelineScrollLeft, timelineScrollLeft, timelineViewportWidth, timelineWidthPx],
  );

  const handleTimelineScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      setTimelineScrollLeftState(
        clampTimelineScrollLeft(
          event.currentTarget.scrollLeft,
          timelineWidthPx,
          timelineViewportWidth,
        ),
      );
    },
    [timelineViewportWidth, timelineWidthPx],
  );

  const handleTimelineWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const scrollElement = event.currentTarget;
    const canScrollHorizontally = scrollElement.scrollWidth > scrollElement.clientWidth + 1;
    if (!canScrollHorizontally || !event.shiftKey || Math.abs(event.deltaX) > 0) {
      return;
    }

    event.preventDefault();
    scrollElement.scrollLeft += event.deltaY;
  }, []);

  useEffect(() => {
    const element = timelineScrollRef.current;
    if (!element) {
      return;
    }

    const updateViewportWidth = () => {
      const nextViewportWidth = Math.max(0, element.clientWidth - headerWidthPx);
      setTimelineViewportWidth(nextViewportWidth);
      setTimelineScrollLeftState(
        clampTimelineScrollLeft(element.scrollLeft, timelineWidthPx, nextViewportWidth),
      );
    };

    updateViewportWidth();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(updateViewportWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, [headerWidthPx, timelineWidthPx]);

  useEffect(() => {
    const element = timelineScrollRef.current;
    if (!element) {
      return;
    }

    const clampedScrollLeft = clampTimelineScrollLeft(
      element.scrollLeft,
      timelineWidthPx,
      timelineViewportWidth,
    );
    if (Math.abs(clampedScrollLeft - element.scrollLeft) > 0.5) {
      element.scrollLeft = clampedScrollLeft;
    }
    setTimelineScrollLeftState(clampedScrollLeft);
  }, [timelineViewportWidth, timelineWidthPx]);

  useEffect(() => {
    if (!isPlaying || isUserInteracting) {
      return;
    }

    ensureTimeVisible(currentTimeLeftPx);
  }, [currentTimeLeftPx, ensureTimeVisible, isPlaying, isUserInteracting]);

  return {
    timelineScrollRef,
    timelineScrollLeft,
    timelineViewportWidth,
    setTimelineScrollLeft,
    ensureTimeVisible,
    handleTimelineScroll,
    handleTimelineWheel,
  };
}
