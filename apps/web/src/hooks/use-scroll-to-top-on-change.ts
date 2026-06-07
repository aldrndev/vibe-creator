import { useEffect, useRef } from 'react';

type ScrollResetDependency = boolean | number | string | null | undefined;

interface ScrollToTopOptions {
  readonly skipInitial?: boolean;
}

function resetScrollPosition(): void {
  if (typeof globalThis.window === 'undefined' || typeof globalThis.document === 'undefined') {
    return;
  }

  globalThis.window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

  for (const scrollRoot of globalThis.document.querySelectorAll<HTMLElement>(
    '[data-scroll-root="true"]',
  )) {
    scrollRoot.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
}

/**
 * Resets the page scroll instantly when a route, page, or wizard step changes.
 */
export function useScrollToTopOnChange(
  dependency: ScrollResetDependency,
  options: ScrollToTopOptions = {},
): void {
  const isFirstRunRef = useRef(true);
  const skipInitial = options.skipInitial ?? true;

  useEffect(() => {
    void dependency;

    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      if (skipInitial) {
        return;
      }
    }

    if (typeof globalThis.window === 'undefined') {
      return;
    }

    const frameId = globalThis.window.requestAnimationFrame(resetScrollPosition);
    return () => globalThis.window.cancelAnimationFrame(frameId);
  }, [dependency, skipInitial]);
}
