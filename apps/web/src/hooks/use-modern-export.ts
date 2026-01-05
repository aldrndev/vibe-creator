import { useState, useCallback } from "react";
import { logger } from "@/lib/logger";
import { exportApi } from "@/services/export-api";
import { compileModernProject } from "@/lib/modern-compiler";
import type { ModernProject } from "@vibe-creator/shared";
import { useModernEditorStore } from "@/stores/modern-editor-store";

export function useModernExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportProject = useCallback(async (project: ModernProject) => {
    try {
      setIsExporting(true);
      setExportError(null);
      setExportProgress(0);

      const store = useModernEditorStore.getState();
      const assets = store.assets;

      // 1. Compile Project
      // assets is EditorAsset[], which matches the signature of compileModernProject
      const result = compileModernProject(project, assets);

      if (!result.success) {
        throw new Error(
          "Compilation failed: " +
            result.errors.map((e) => e.message).join(", ")
        );
      }

      const { timeline } = result;
      setExportProgress(0.1);

      // 2. Prepare upload tasks for video/audio clips
      // We need to map timeline clips to backend format
      const clipsToProcess = [];

      // Flatten tracks to find all clips
      for (const track of timeline.tracks) {
        if (track.type !== "VIDEO" && track.type !== "AUDIO") continue;

        for (const clip of track.clips) {
          const asset = clip.asset;
          if (!asset) continue;

          clipsToProcess.push({
            clip,
            asset,
            trackType: track.type,
          });
        }
      }

      const uploadedClips = [];
      let processedCount = 0;

      // 3. Upload files if needed
      for (const item of clipsToProcess) {
        const { clip, asset } = item;

        let remotePath = asset.url;

        // If we have a local file, upload it
        if (asset.file) {
          const uploadResult = await exportApi.uploadVideo(asset.file);
          remotePath = uploadResult.filepath;
        }

        // Map to backend clip structure
        uploadedClips.push({
          localPath: remotePath, // Backend uses this field for the source path
          startTime: clip.startMs,
          endTime: clip.startMs + (clip.endMs - clip.startMs), // Duration logic
          // Apply transforms if video
          transforms: clip.transforms,
          effects: clip.effects,
        });

        processedCount++;
        setExportProgress(0.1 + (processedCount / clipsToProcess.length) * 0.3);
      }

      // 4. Create Export Job
      const job = await exportApi.createExportJob({
        projectId: project.id,
        format: "MP4",
        resolution: "HD", // TODO: Use project settings
        addWatermark: false,
        timelineData: {
          clips: uploadedClips,
          textOverlays: [], // TODO: map text overlays if needed
          settings: {
            width: project.settings.width,
            height: project.settings.height,
            fps: project.settings.fps,
          },
        },
      });

      setExportProgress(0.5);

      // 5. Poll for completion
      const finalStatus = await exportApi.waitForCompletion(job.jobId, (p) =>
        setExportProgress(0.5 + p * 0.5)
      );

      // 6. Download
      if (!finalStatus.downloadUrl) {
        throw new Error("Download URL not available");
      }

      const { authFetch } = await import("@/services/api");
      const response = await authFetch(finalStatus.downloadUrl);
      if (!response.ok) throw new Error("Failed to download export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${project.title.replace(
        /\s+/g,
        "_"
      )}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportProgress(1);
    } catch (err) {
      logger.error("Modern Export Failed", err);
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    isExporting,
    exportProgress,
    exportError,
    exportProject,
  };
}
