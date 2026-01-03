/**
 * useUrlDownload - URL video download hook
 * Handles downloading videos from URLs and adding to timeline
 */

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { downloadApi } from '@/services/download-api';
import { authFetch } from '@/services/api';
import toast from 'react-hot-toast';

interface Asset {
  id: string;
  name: string;
  type: 'VIDEO' | 'AUDIO' | 'IMAGE';
  url: string;
  file: File;
  durationMs: number;
}

interface ClipInput {
  assetId: string;
  startMs: number;
  endMs: number;
  trimStartMs: number;
  trimEndMs: number;
  transforms: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
  };
  effects: {
    filters: string[];
    speed: number;
    volume: number;
    fadeIn: number;
    fadeOut: number;
  };
}

interface UseUrlDownloadOptions {
  addAsset: (asset: Asset) => void;
  addClip: (trackId: string, clip: ClipInput) => void;
  getVideoTrackId: () => string | undefined;
  getLastClipEndMs: () => number;
  onClose?: () => void;
}

export function useUrlDownload(options: UseUrlDownloadOptions) {
  const { addAsset, addClip, getVideoTrackId, getLastClipEndMs, onClose } = options;
  
  const [urlInput, setUrlInput] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStep, setDownloadStep] = useState(0);

  const handleUrlDownload = useCallback(async () => {
    if (!urlInput.trim()) {
      toast.error('Masukkan URL video');
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadStep(1);
      
      const job = await downloadApi.requestDownload(urlInput);
      setDownloadStep(2);
      
      await downloadApi.waitForCompletion(job.jobId);
      
      const result = await downloadApi.getStatus(job.jobId);
      setDownloadStep(3);
      
      const fileUrl = downloadApi.getFileUrl(job.jobId);
      const fileResponse = await authFetch(fileUrl);
      
      if (!fileResponse.ok) {
        throw new Error('Gagal mengambil file video');
      }
      
      const blob = await fileResponse.blob();
      const fileName = result.title || `download-${Date.now()}.mp4`;
      const file = new File([blob], fileName, { type: 'video/mp4' });
      
      // Get video duration
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      const videoUrl = URL.createObjectURL(blob);
      videoEl.src = videoUrl;
      
      await new Promise<void>((resolve) => {
        videoEl.onloadedmetadata = () => resolve();
        videoEl.onerror = () => resolve();
      });
      
      const durationMs = (videoEl.duration || 10) * 1000;
      setDownloadStep(4);
      
      // Create asset
      const assetId = `video-${Date.now()}`;
      addAsset({
        id: assetId,
        name: fileName,
        type: 'VIDEO',
        url: videoUrl,
        file,
        durationMs,
      });
      
      // Add to video track
      const trackId = getVideoTrackId();
      if (trackId) {
        const startMs = getLastClipEndMs();
        addClip(trackId, {
          assetId,
          startMs,
          endMs: startMs + durationMs,
          trimStartMs: 0,
          trimEndMs: 0,
          transforms: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
          effects: { filters: [], speed: 1, volume: 1, fadeIn: 0, fadeOut: 0 },
        });
      }
      
      toast.success(`"${fileName}" ditambahkan ke timeline!`);
      onClose?.();
      setUrlInput('');
      setDownloadStep(0);
      
    } catch (e) {
      logger.error('URL download failed', e);
      setDownloadStep(0);
      toast.error(`Download gagal: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  }, [urlInput, addAsset, addClip, getVideoTrackId, getLastClipEndMs, onClose]);

  const resetDownload = useCallback(() => {
    setUrlInput('');
    setDownloadStep(0);
    setIsDownloading(false);
  }, []);

  return {
    urlInput,
    setUrlInput,
    isDownloading,
    downloadStep,
    handleUrlDownload,
    resetDownload,
  };
}
