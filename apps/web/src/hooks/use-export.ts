/**
 * useExport - Export video functionality hook
 * Handles client-side FFmpeg export, server-side export, and cancellation
 */

import { useState, useCallback } from "react";
import { logger } from "@/lib/logger";
import { exportApi } from "@/services/export-api";

// Full clip data with transforms and effects for server-side processing
export interface ClipTransforms {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface ClipEffects {
  filters: string[];
  speed: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
}

export interface ClipData {
  file: File;
  startTime: number;
  endTime: number;
  transforms?: ClipTransforms;
  effects?: ClipEffects;
}

// Text overlay data for export
export interface TextOverlayData {
  id: string;
  content: string;
  startMs: number;
  endMs: number;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
}

interface UseExportOptions {
  projectId?: string;
  onPause?: () => void;
  concatenateClips?: (clips: ClipData[]) => Promise<Blob>;
}

export function useExport(options: UseExportOptions = {}) {
  const { projectId, onPause, concatenateClips } = options;

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  /**
   * Client-side FFmpeg export
   */
  const handleLocalExport = useCallback(
    async (clips: ClipData[]) => {
      setExportError(null);
      setExportSuccess(false);

      if (clips.length === 0) {
        setExportError("Tidak ada klip untuk di-export");
        return;
      }

      if (!concatenateClips) {
        setExportError("FFmpeg tidak tersedia");
        return;
      }

      try {
        onPause?.();
        setIsExporting(true);
        setExportProgress(0);

        const blob = await concatenateClips(clips);

        setExportProgress(1);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `export-${Date.now()}.mp4`;
        a.click();
        URL.revokeObjectURL(url);

        setExportSuccess(true);
      } catch (e) {
        logger.error("Export failed", e);
        setExportError("Export gagal. Coba lagi.");
      } finally {
        setIsExporting(false);
      }
    },
    [concatenateClips, onPause]
  );

  /**
   * Server-side export with full timeline data
   */
  const handleServerExport = useCallback(
    async (
      clips: ClipData[],
      textOverlays?: TextOverlayData[],
      exportOptions?: {
        format: "MP4" | "WEBM" | "MOV";
        resolution: "SD" | "HD" | "UHD";
        width?: number;
        height?: number;
        fps?: number;
      }
    ) => {
      setExportError(null);
      setExportSuccess(false);

      if (clips.length === 0) {
        setExportError("Tidak ada file video untuk diupload");
        return;
      }

      try {
        onPause?.();
        setIsExporting(true);
        setExportProgress(0);

        // Step 1: Upload video files with transforms/effects
        const uploadedFiles: Array<{
          localPath: string;
          startTime: number;
          endTime: number;
          transforms?: ClipTransforms;
          effects?: ClipEffects;
        }> = [];

        for (let i = 0; i < clips.length; i++) {
          const clipFile = clips[i];
          if (!clipFile) continue;

          setExportProgress((i / clips.length) * 0.3);
          const uploaded = await exportApi.uploadVideo(clipFile.file);
          uploadedFiles.push({
            localPath: uploaded.filepath,
            startTime: clipFile.startTime,
            endTime: clipFile.endTime,
            transforms: clipFile.transforms,
            effects: clipFile.effects,
          });
        }

        setExportProgress(0.3);

        // Step 2: Create export job with backend-compatible settings
        const job = await exportApi.createExportJob({
          projectId: projectId || "default",
          format: exportOptions?.format || "MP4",
          resolution: exportOptions?.resolution || "HD",
          addWatermark: false, // No watermark by default
          timelineData: {
            clips: uploadedFiles,
            textOverlays: textOverlays || [],
            settings: {
              width: exportOptions?.width || 1920,
              height: exportOptions?.height || 1080,
              fps: exportOptions?.fps || 30,
            },
          },
        });

        setExportJobId(job.jobId);
        setExportProgress(0.4);

        // Step 3: Poll for completion
        const finalStatus = await exportApi.waitForCompletion(
          job.jobId,
          (progress) => setExportProgress(0.4 + progress * 0.5)
        );

        setExportProgress(1);

        // Step 4: Download using authenticated fetch (href doesn't include auth)
        if (!finalStatus.downloadUrl) {
          throw new Error("Download URL not available");
        }

        // Use authFetch to get the file with authentication
        const { authFetch } = await import("@/services/api");
        const response = await authFetch(finalStatus.downloadUrl);

        if (!response.ok) {
          throw new Error("Failed to download export file");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `export-${Date.now()}.mp4`;
        a.click();
        window.URL.revokeObjectURL(url);

        setExportSuccess(true);
      } catch (e) {
        logger.error("Server export failed", e);
        setExportError(
          `Server export gagal: ${
            e instanceof Error ? e.message : "Unknown error"
          }`
        );
      } finally {
        setIsExporting(false);
        setExportJobId(null);
      }
    },
    [projectId, onPause]
  );

  /**
   * Cancel export job
   */
  const handleCancelExport = useCallback(async () => {
    if (!exportJobId) return;

    try {
      await exportApi.cancelExportJob(exportJobId);
      setExportSuccess(false);
      setIsExporting(false);
      setExportJobId(null);
    } catch (e) {
      logger.error("Cancel export failed", e);
      setExportError("Gagal membatalkan export");
    }
  }, [exportJobId]);

  const clearExportStatus = useCallback(() => {
    setExportError(null);
    setExportSuccess(false);
  }, []);

  return {
    isExporting,
    exportProgress,
    exportJobId,
    exportError,
    exportSuccess,
    handleLocalExport,
    handleServerExport,
    handleCancelExport,
    clearExportStatus,
  };
}
