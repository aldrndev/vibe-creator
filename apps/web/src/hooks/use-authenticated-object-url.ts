import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { authFetch } from '@/services/api';

async function fetchObjectUrl(sourceUrl: string, signal: AbortSignal): Promise<string> {
  const response = await authFetch(sourceUrl, { signal });
  if (!response.ok) {
    throw new Error(`Authenticated media request failed: ${response.status}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function useAuthenticatedObjectUrl(sourceUrl: string | null | undefined): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sourceUrl) {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
      setObjectUrl(null);
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    fetchObjectUrl(sourceUrl, controller.signal)
      .then((nextUrl) => {
        if (!isActive) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        if (currentUrlRef.current) {
          URL.revokeObjectURL(currentUrlRef.current);
        }
        currentUrlRef.current = nextUrl;
        setObjectUrl(nextUrl);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        logger.error('Authenticated media fetch failed', error);
        if (currentUrlRef.current) {
          URL.revokeObjectURL(currentUrlRef.current);
          currentUrlRef.current = null;
        }
        setObjectUrl(null);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [sourceUrl]);

  useEffect(() => {
    return () => {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
    };
  }, []);

  return objectUrl;
}
