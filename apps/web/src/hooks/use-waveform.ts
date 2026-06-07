import { useCallback, useEffect, useRef, useState } from 'react';

interface WaveformData {
  waveform: Float32Array;
  duration: number;
}

interface WaveformCache {
  [assetId: string]: WaveformData;
}

// Global cache for waveforms
const waveformCache: WaveformCache = {};

// Worker instance (singleton)
let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/waveform.worker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return worker;
}

interface UseWaveformOptions {
  samplesPerSecond?: number;
}

interface UseWaveformReturn {
  waveform: Float32Array | null;
  duration: number;
  isLoading: boolean;
  error: string | null;
  generate: (audioUrl: string, assetId: string) => Promise<void>;
}

/**
 * Hook for generating and caching audio waveforms
 * Uses Web Worker to avoid blocking main thread
 */
export function useWaveform(options: UseWaveformOptions = {}): UseWaveformReturn {
  const { samplesPerSecond = 100 } = options;

  const [waveform, setWaveform] = useState<Float32Array | null>(null);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingAssetId = useRef<string | null>(null);

  // Handle worker messages
  useEffect(() => {
    const workerInstance = getWorker();

    const handleMessage = (event: MessageEvent) => {
      const { type, assetId, waveform: wf, duration: dur, error: err } = event.data;

      // Only process if this is the asset we're waiting for
      if (assetId !== pendingAssetId.current) return;

      if (type === 'complete' && wf) {
        // Cache the result
        waveformCache[assetId] = { waveform: wf, duration: dur };

        setWaveform(wf);
        setDuration(dur);
        setIsLoading(false);
        pendingAssetId.current = null;
      } else if (type === 'error') {
        setError(err || 'Failed to generate waveform');
        setIsLoading(false);
        pendingAssetId.current = null;
      }
    };

    workerInstance.addEventListener('message', handleMessage);

    return () => {
      workerInstance.removeEventListener('message', handleMessage);
    };
  }, []);

  // Generate waveform for audio URL
  const generate = useCallback(
    async (audioUrl: string, assetId: string) => {
      // Check cache first
      if (waveformCache[assetId]) {
        const cached = waveformCache[assetId];
        if (cached) {
          setWaveform(cached.waveform);
          setDuration(cached.duration);
          return;
        }
      }

      setIsLoading(true);
      setError(null);
      pendingAssetId.current = assetId;

      try {
        // Fetch audio data
        const response = await fetch(audioUrl);
        const audioData = await response.arrayBuffer();

        // Send to worker
        const workerInstance = getWorker();
        workerInstance.postMessage(
          {
            type: 'generate',
            audioData,
            assetId,
            samplesPerSecond,
          },
          [audioData],
        ); // Transfer ownership for performance
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audio');
        setIsLoading(false);
        pendingAssetId.current = null;
      }
    },
    [samplesPerSecond],
  );

  return {
    waveform,
    duration,
    isLoading,
    error,
    generate,
  };
}

/**
 * Get cached waveform if available
 */
export function getCachedWaveform(assetId: string): WaveformData | null {
  return waveformCache[assetId] || null;
}

/**
 * Clear waveform cache
 */
export function clearWaveformCache() {
  for (const key of Object.keys(waveformCache)) {
    delete waveformCache[key];
  }
}
