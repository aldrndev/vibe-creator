import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { authFetch } from '@/services/api';

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

    void (async () => {
      try {
        const response = await authFetch(sourceUrl, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Authenticated media request failed: ${response.status}`);
        }

        const blob = await response.blob();
        const nextUrl = URL.createObjectURL(blob);

        if (!isActive) {
          URL.revokeObjectURL(nextUrl);
          return;
        }

        if (currentUrlRef.current) {
          URL.revokeObjectURL(currentUrlRef.current);
        }
        currentUrlRef.current = nextUrl;
        setObjectUrl(nextUrl);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        logger.error('Authenticated media fetch failed', error);
        if (currentUrlRef.current) {
          URL.revokeObjectURL(currentUrlRef.current);
          currentUrlRef.current = null;
        }
        setObjectUrl(null);
      }
    })();

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
