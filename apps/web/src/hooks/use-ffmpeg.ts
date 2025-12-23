import { useState, useCallback, useEffect } from 'react';
import { ffmpegService } from '@/services/ffmpeg';

interface UseFFmpegReturn {
  isLoading: boolean;
  isReady: boolean;
  progress: number;
  error: string | null;
  load: () => Promise<void>;
  getVideoInfo: (file: File) => Promise<{
    duration: number;
    width: number;
    height: number;
    codec: string;
  }>;
  extractThumbnail: (file: File, time: number) => Promise<string>;
  extractTimelineThumbnails: (file: File, count?: number) => Promise<string[]>;
  trimVideo: (file: File, startTime: number, endTime: number) => Promise<Blob>;
  concatenateClips: (
    clips: Array<{ file: File; startTime: number; endTime: number }>
  ) => Promise<Blob>;
}

/**
 * React hook for FFmpeg.wasm operations
 */
export function useFFmpeg(): UseFFmpegReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(ffmpegService.isReady());
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Check ready state on mount
  useEffect(() => {
    setIsReady(ffmpegService.isReady());
  }, []);

  const load = useCallback(async () => {
    if (ffmpegService.isReady()) {
      setIsReady(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await ffmpegService.load();
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FFmpeg');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getVideoInfo = useCallback(async (file: File) => {
    if (!ffmpegService.isReady()) {
      await load();
    }
    return ffmpegService.getVideoInfo(file);
  }, [load]);

  const extractThumbnail = useCallback(async (file: File, time: number) => {
    if (!ffmpegService.isReady()) {
      await load();
    }
    const blob = await ffmpegService.extractThumbnail(file, { time });
    return URL.createObjectURL(blob);
  }, [load]);

  const extractTimelineThumbnails = useCallback(async (
    file: File, 
    count: number = 10
  ) => {
    if (!ffmpegService.isReady()) {
      await load();
    }
    setProgress(0);
    
    const thumbnails = await ffmpegService.extractTimelineThumbnails(file, count);
    
    setProgress(1);
    return thumbnails;
  }, [load]);

  const trimVideo = useCallback(async (
    file: File,
    startTime: number,
    endTime: number
  ) => {
    if (!ffmpegService.isReady()) {
      await load();
    }
    setProgress(0);
    setError(null);

    try {
      const result = await ffmpegService.trimVideo(file, {
        startTime,
        endTime,
        onProgress: setProgress,
      });
      setProgress(1);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trim failed');
      throw err;
    }
  }, [load]);

  const concatenateClips = useCallback(async (
    clips: Array<{ file: File; startTime: number; endTime: number }>
  ) => {
    if (!ffmpegService.isReady()) {
      await load();
    }
    setProgress(0);
    setError(null);

    try {
      const result = await ffmpegService.concatenateClips(clips, setProgress);
      setProgress(1);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Concatenation failed');
      throw err;
    }
  }, [load]);

  return {
    isLoading,
    isReady,
    progress,
    error,
    load,
    getVideoInfo,
    extractThumbnail,
    extractTimelineThumbnails,
    trimVideo,
    concatenateClips,
  };
}
