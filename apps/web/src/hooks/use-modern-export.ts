import type { ModernProject } from '@vibe-creator/shared';
import { useCallback, useState } from 'react';
import { logger } from '@/lib/logger';
import { compileModernProject } from '@/lib/modern-compiler';
import { buildModernExportTimelineData } from '@/lib/modern-export-payload';
import { exportApi } from '@/services/export-api';
import type { EditorAsset, EditorClip } from '@/stores/editor-store';
import { useModernEditorStore } from '@/stores/modern-editor-store';

interface ClipToProcess {
  clip: EditorClip;
  asset: EditorAsset;
}

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
        throw new Error(`Compilation failed: ${result.errors.map((e) => e.message).join(', ')}`);
      }

      const { timeline } = result;
      setExportProgress(0.1);

      // 2. Prepare upload tasks for video/audio clips
      // We need to map timeline clips to backend format
      const clipsToProcess: ClipToProcess[] = [];

      for (const track of timeline.tracks) {
        if (track.type !== 'VIDEO') continue;

        for (const clip of track.clips) {
          const asset = clip.asset;
          if (!asset) continue;
          if (asset.type !== 'VIDEO' && asset.type !== 'IMAGE') continue;

          clipsToProcess.push({
            clip,
            asset,
          });
        }
      }

      if (clipsToProcess.length === 0) {
        throw new Error('Export requires at least one video or image layer.');
      }

      const assetPathById = new Map<string, string>();
      let processedCount = 0;

      // 3. Upload files if needed
      for (const item of clipsToProcess) {
        const { asset } = item;
        if (assetPathById.has(asset.id)) {
          continue;
        }

        let remotePath = asset.url;

        // If we have a local file, upload it
        if (asset.file) {
          const uploadResult = await exportApi.uploadMedia(asset.file);
          remotePath = uploadResult.uploadToken;
        }

        assetPathById.set(asset.id, remotePath);

        processedCount++;
        setExportProgress(0.1 + (processedCount / clipsToProcess.length) * 0.3);
      }

      const timelineData = buildModernExportTimelineData({
        project,
        timeline,
        assetPathById,
      });

      // 4. Create Export Job
      const job = await exportApi.createExportJob({
        projectId: project.id,
        format: 'MP4',
        resolution: getExportResolution(project),
        addWatermark: false,
        timelineData,
      });

      setExportProgress(0.5);

      // 5. Poll for completion
      const finalStatus = await exportApi.waitForCompletion(job.jobId, (p) =>
        setExportProgress(0.5 + p * 0.5),
      );

      // 6. Download
      if (!finalStatus.downloadUrl) {
        throw new Error('Download URL not available');
      }

      const { authFetch } = await import('@/services/api');
      const response = await authFetch(finalStatus.downloadUrl);
      if (!response.ok) throw new Error('Failed to download export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${project.title.replace(/\s+/g, '_')}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportProgress(1);
    } catch (err) {
      logger.error('Modern Export Failed', err);
      setExportError(err instanceof Error ? err.message : 'Export failed');
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

function getExportResolution(project: ModernProject): 'SD' | 'HD' | 'UHD' {
  const maxDimension = Math.max(project.settings.width, project.settings.height);
  if (maxDimension >= 2160) return 'UHD';
  if (maxDimension >= 1080) return 'HD';
  return 'SD';
}
