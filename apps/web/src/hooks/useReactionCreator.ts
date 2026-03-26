import { useEffect, useState } from 'react';
import { authFetch } from '@/services/api';

export type LayoutMode = 'pip' | 'side-by-side';
export type PipPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type SideBySideLayout = 'horizontal' | 'vertical';

export function useReactionCreator() {
  const [mainVideoFile, setMainVideoFile] = useState<File | null>(null);
  const [mainVideoUrl, setMainVideoUrl] = useState<string>('');
  const [reactionVideoFile, setReactionVideoFile] = useState<File | null>(null);
  const [reactionVideoUrl, setReactionVideoUrl] = useState<string>('');

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('side-by-side');
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [smoothBorder, setSmoothBorder] = useState(false);
  const [overlayMode, setOverlayMode] = useState(false);
  const [pipPosition] = useState<PipPosition>('top-right');
  const [pipScale, setPipScale] = useState(0.3);
  const [reactionVolume, setReactionVolume] = useState(0.8);
  const [mainVolume, setMainVolume] = useState(1.0);
  const [customPosition, setCustomPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [sideBySideLayout, setSideBySideLayout] = useState<SideBySideLayout>('horizontal');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [circular, setCircular] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [results, setResults] = useState<Record<string, string>>({});
  const [mainVideoError, setMainVideoError] = useState<string | null>(null);
  const [reactionVideoError, setReactionVideoError] = useState<string | null>(null);

  const handleMainVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setMainVideoError(null);
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        setMainVideoError('Ukuran file maksimal 200MB');
        return;
      }

      // Check duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => resolve();
      });

      if (video.duration > 300) {
        setMainVideoError('Durasi video maksimal 5 menit');
        URL.revokeObjectURL(video.src);
        return;
      }

      setMainVideoFile(file);
      setMainVideoUrl(video.src);
      setResults({});
    }
  };

  const handleReactionVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setReactionVideoError(null);
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        setReactionVideoError('Ukuran file maksimal 200MB');
        return;
      }

      // Check duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => resolve();
      });

      if (video.duration > 300) {
        setReactionVideoError('Durasi video maksimal 5 menit');
        URL.revokeObjectURL(video.src);
        return;
      }

      setReactionVideoFile(file);
      setReactionVideoUrl(video.src);
      setResults({});
    }
  };

  const handleProcess = async () => {
    if (!mainVideoFile || !reactionVideoFile) return;

    try {
      setIsProcessing(true);
      setProcessingStatus('Mengupload video utama...');

      const mainFormData = new FormData();
      mainFormData.append('video', mainVideoFile);

      const mainUploadRes = await authFetch('/api/v1/upload/video', {
        method: 'POST',
        body: mainFormData,
      });
      if (!mainUploadRes.ok) throw new Error('Main video upload failed');
      const mainData = await mainUploadRes.json();

      setProcessingStatus('Mengupload video reaksi...');
      const reactionFormData = new FormData();
      reactionFormData.append('video', reactionVideoFile);
      const reactionUploadRes = await authFetch('/api/v1/upload/video', {
        method: 'POST',
        body: reactionFormData,
      });
      if (!reactionUploadRes.ok) throw new Error('Reaction video upload failed');
      const reactionData = await reactionUploadRes.json();

      setProcessingStatus('Memproses video...');

      if (layoutMode === 'pip') {
        const payload = {
          mainVideoPath: mainData.data.uploadToken,
          reactionVideoPath: reactionData.data.uploadToken,
          layout: layoutMode,
          position: pipPosition,
          customPosition: customPosition, // Add custom position
          scale: pipScale,
          margin: 20,
          aspectRatio,
          splitRatio: (layoutMode as string) === 'side-by-side' ? splitRatio : undefined,
          smoothBorder: (layoutMode as string) === 'side-by-side' ? smoothBorder : undefined,
          overlayMode: (layoutMode as string) === 'side-by-side' ? overlayMode : undefined,
          reactionVolume,
          mainVolume,
          circular,
        };

        const res = await authFetch('/api/v1/reaction/create-mixed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.data) {
          const filename = data.data.outputPath.split('/').pop();
          setProcessingStatus('Mendownload hasil...');
          const downloadRes = await authFetch(`/api/v1/reaction/download/${filename}`);
          if (!downloadRes.ok) throw new Error('Gagal mengambil video hasil');
          const blob = await downloadRes.blob();
          const url = URL.createObjectURL(blob);
          setResults((prev) => ({ ...prev, [layoutMode]: url }));
        } else {
          throw new Error(data.error?.message || 'Gagal memproses video');
        }
      } else {
        // Side-by-Side
        const payload = {
          leftVideoPath: mainData.data.uploadToken, // Main is Left/Top
          rightVideoPath: reactionData.data.uploadToken, // Reaction is Right/Bottom
          layout: sideBySideLayout,
          aspectRatio,
          reactionVolume,
          mainVolume,
          splitRatio,
          smoothBorder,
          overlayMode,
        };

        const res = await authFetch('/api/v1/reaction/create-side-by-side', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.data) {
          const filename = data.data.outputPath.split('/').pop();
          setProcessingStatus('Mendownload hasil...');
          const downloadRes = await authFetch(`/api/v1/reaction/download/${filename}`);
          if (!downloadRes.ok) throw new Error('Gagal mengambil video hasil');
          const blob = await downloadRes.blob();
          const url = URL.createObjectURL(blob);
          setResults((prev) => ({ ...prev, [layoutMode]: url }));
        } else {
          throw new Error(data.error?.message || 'Gagal memproses video');
        }
      }
      setProcessingStatus('Selesai!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setProcessingStatus(`Gagal: ${message}`);
      setIsProcessing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup blob URL on unmount or change
  useEffect(() => {
    return () => {
      Object.values(results).forEach((url) => {
        if (url?.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [results]);

  return {
    state: {
      mainVideoFile,
      mainVideoUrl,
      reactionVideoFile,
      reactionVideoUrl,
      layoutMode,
      splitRatio,
      smoothBorder,
      overlayMode,
      pipPosition,
      pipScale,
      reactionVolume,
      mainVolume,
      customPosition,
      sideBySideLayout,
      aspectRatio,
      circular,
      isProcessing,
      processingStatus,
      results,
      mainVideoError,
      reactionVideoError,
    },
    actions: {
      setMainVideoFile,
      setMainVideoUrl,
      setReactionVideoFile,
      setReactionVideoUrl,
      setLayoutMode,
      setSplitRatio,
      setSmoothBorder,
      setOverlayMode,
      setPipScale,
      setReactionVolume,
      setMainVolume,
      setCustomPosition,
      setSideBySideLayout,
      setAspectRatio,
      setCircular,
      setResults,
      handleMainVideoSelect,
      handleReactionVideoSelect,
      handleProcess,
    },
  };
}
