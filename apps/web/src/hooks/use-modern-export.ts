import type { ModernProject } from '@vibe-creator/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { compileModernProject } from '@/lib/modern-compiler';
import { buildModernExportTimelineData } from '@/lib/modern-export-payload';
import { authFetch } from '@/services/api';
import {
  type ExportCacheState,
  type ExportEvent,
  type ExportJobResponse,
  type ExportStatusResponse,
  exportApi,
} from '@/services/export-api';
import type { EditorAsset } from '@/stores/editor-store';
import { useModernEditorStore } from '@/stores/modern-editor-store';

const PREPARED_PROGRESS = 0.03;
const UPLOAD_PROGRESS_START = 0.03;
const UPLOAD_PROGRESS_END = 0.1;
const QUEUED_PROGRESS = 0.12;
const SERVER_PROGRESS_END = 0.96;
const PREVIEW_READY_PROGRESS = 0.98;

export type ModernExportPhase =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'queueing'
  | 'processing'
  | 'downloading'
  | 'completed'
  | 'failed';

export interface ModernExportResult {
  readonly jobId: string;
  readonly filename: string;
  readonly previewUrl: string;
  readonly downloadUrl: string;
  readonly completedAt?: string;
  readonly urlExpiresAt?: string;
  readonly cacheState?: ExportCacheState;
}

type CompiledTimeline = Extract<
  ReturnType<typeof compileModernProject>,
  { success: true }
>['timeline'];

function processClip(
  clip: CompiledTimeline['tracks'][0]['clips'][0],
  trackType: string,
  mediaAssetsById: Map<string, EditorAsset>,
  counts: { visual: number; audio: number },
) {
  const asset = clip.asset;
  if (!asset) return;

  const isVisualClip = trackType === 'VIDEO' && (asset.type === 'VIDEO' || asset.type === 'IMAGE');
  const isStandaloneAudioClip = trackType === 'AUDIO' && asset.type === 'AUDIO';

  if (isVisualClip || isStandaloneAudioClip) {
    mediaAssetsById.set(asset.id, asset);
  }

  if (isVisualClip) counts.visual++;
  if (isStandaloneAudioClip) counts.audio++;
}

function extractAssetsFromTimeline(timeline: CompiledTimeline) {
  const mediaAssetsById = new Map<string, EditorAsset>();
  const counts = { visual: 0, audio: 0 };

  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      processClip(clip, track.type, mediaAssetsById, counts);
    }
  }

  return { mediaAssetsById, visualClipCount: counts.visual, audioTrackCount: counts.audio };
}

function prepareMediaAssets(
  timeline: CompiledTimeline,
  project: ModernProject,
  assets: EditorAsset[],
) {
  const { mediaAssetsById, visualClipCount, audioTrackCount } = extractAssetsFromTimeline(timeline);

  const visibleTextCount = project.layers.filter(
    (layer) => layer.type === 'text' && layer.visible && layer.endMs > layer.startMs,
  ).length;

  if (visualClipCount === 0 && audioTrackCount === 0 && visibleTextCount === 0) {
    throw new Error('Export requires at least one timed content layer.');
  }

  if (project.settings.backgroundMode === 'image') {
    const backgroundAsset = assets.find(
      (asset) => asset.id === project.settings.backgroundImageAssetId && asset.type === 'IMAGE',
    );
    if (!backgroundAsset) {
      throw new Error('Background image asset is unavailable.');
    }
    mediaAssetsById.set(backgroundAsset.id, backgroundAsset);
  }

  return mediaAssetsById;
}

async function uploadMediaAssets(
  assetsToUpload: EditorAsset[],
  setExportProgress: (p: number) => void,
) {
  const assetPathById = new Map<string, string>();
  let processedCount = 0;

  for (const asset of assetsToUpload) {
    let remotePath = getModernExportAssetReference(asset);

    if (!asset.serverAssetId && !asset.studioAssetId && asset.file) {
      const uploadResult = await exportApi.uploadMedia(asset.file);
      remotePath = uploadResult.uploadToken;
    }

    assetPathById.set(asset.id, remotePath);

    processedCount++;
    const uploadProgress =
      UPLOAD_PROGRESS_START +
      (processedCount / assetsToUpload.length) * (UPLOAD_PROGRESS_END - UPLOAD_PROGRESS_START);
    setExportProgress(uploadProgress);
  }

  if (assetsToUpload.length === 0) {
    setExportProgress(UPLOAD_PROGRESS_END);
  }

  return assetPathById;
}

async function fetchExportDownloadUrl(finalStatus: ExportStatusResponse) {
  if (!finalStatus.downloadUrl) {
    throw new Error('Download URL not available');
  }

  const { authFetch } = await import('@/services/api');
  const response = await authFetch(finalStatus.downloadUrl);
  if (!response.ok) throw new Error('Failed to download export');

  const blob = await response.blob();
  return window.URL.createObjectURL(blob);
}

export function useModernExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [exportPhase, setExportPhase] = useState<ModernExportPhase>('idle');
  const [exportResult, setExportResult] = useState<ModernExportResult | null>(null);
  const exportPreviewUrlRef = useRef<string | null>(null);

  const revokeExportPreviewUrl = useCallback(() => {
    if (!exportPreviewUrlRef.current) {
      return;
    }

    window.URL.revokeObjectURL(exportPreviewUrlRef.current);
    exportPreviewUrlRef.current = null;
  }, []);

  useEffect(() => revokeExportPreviewUrl, [revokeExportPreviewUrl]);

  const resetExportState = useCallback(() => {
    if (isExporting) {
      return;
    }

    revokeExportPreviewUrl();
    setExportResult(null);
    setExportError(null);
    setExportNotice(null);
    setExportProgress(0);
    setExportPhase('idle');
  }, [isExporting, revokeExportPreviewUrl]);

  const downloadExportResult = useCallback(async () => {
    if (!exportResult) {
      return;
    }

    const link = document.createElement('a');
    link.href = exportResult.previewUrl;
    link.download = exportResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const store = useModernEditorStore.getState();
    if (store.projectId) {
      await authFetch(`/api/v1/workspaces/video-studio/${store.projectId}/complete`, {
        method: 'POST',
      }).catch((err) => {
        logger.warn('Failed to mark workspace as completed', err);
      });
    }
  }, [exportResult]);

  const exportProject = useCallback(
    async (project: ModernProject) => {
      try {
        revokeExportPreviewUrl();
        setIsExporting(true);
        setExportError(null);
        setExportNotice(null);
        setExportResult(null);
        setExportPhase('preparing');
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
        setExportProgress(PREPARED_PROGRESS);

        // 2. Prepare upload tasks for visual clips and standalone audio layers.
        const mediaAssetsById = prepareMediaAssets(timeline, project, assets);
        const assetsToUpload = Array.from(mediaAssetsById.values());

        // 3. Upload files if needed
        setExportPhase('uploading');
        const assetPathById = await uploadMediaAssets(assetsToUpload, setExportProgress);

        const timelineData = buildModernExportTimelineData({
          project,
          timeline,
          assetPathById,
        });

        // 4. Create Export Job
        setExportPhase('queueing');
        setExportProgress(QUEUED_PROGRESS);
        const job = await exportApi.createExportJob({
          projectId: project.id,
          format: 'MP4',
          resolution: getExportResolution(project),
          addWatermark: false,
          timelineData,
        });

        if (job.cacheState === 'completed-result') {
          setExportNotice('Menggunakan export terakhir karena project belum berubah.');
        } else if (job.cacheState === 'active-job') {
          setExportNotice('Export yang sama sedang berjalan.');
        }

        // 5. Wait for completion through SSE, with adaptive polling fallback.
        setExportPhase('processing');
        const finalStatus =
          job.cacheState === 'completed-result' && job.downloadUrl
            ? createCompletedStatusFromJob(job)
            : await waitForModernExportCompletion(job.jobId, (progress) => {
                setExportPhase('processing');
                setExportProgress((currentProgress) =>
                  Math.max(currentProgress, getModernExportOverallProgress(progress)),
                );
              });

        // 6. Download
        setExportPhase('downloading');
        setExportProgress(PREVIEW_READY_PROGRESS);

        const url = await fetchExportDownloadUrl(finalStatus);
        exportPreviewUrlRef.current = url;

        setExportResult({
          jobId: job.jobId,
          filename: finalStatus.filename ?? job.filename ?? getModernExportFilename(project),
          previewUrl: url,
          downloadUrl: finalStatus.downloadUrl ?? '',
          completedAt: finalStatus.completedAt,
          urlExpiresAt: finalStatus.urlExpiresAt,
          cacheState: job.cacheState,
        });
        setExportPhase('completed');
        setExportProgress(1);
      } catch (err) {
        logger.error('Modern Export Failed', err);
        setExportPhase('failed');
        setExportError(getModernExportErrorMessage(err));
      } finally {
        setIsExporting(false);
      }
    },
    [revokeExportPreviewUrl],
  );

  return {
    isExporting,
    exportProgress,
    exportError,
    exportNotice,
    exportPhase,
    exportResult,
    exportProject,
    downloadExportResult,
    resetExportState,
  };
}

function createCompletedStatusFromJob(job: ExportJobResponse): ExportStatusResponse {
  return {
    id: job.jobId,
    status: 'COMPLETED',
    progress: 100,
    phase: 'COMPLETED',
    downloadUrl: job.downloadUrl,
    filename: job.filename,
    urlExpiresAt: job.urlExpiresAt,
    cacheState: job.cacheState,
  };
}

async function waitForModernExportCompletion(
  jobId: string,
  onProgress: (progress: number) => void,
): Promise<ExportStatusResponse> {
  if (typeof EventSource === 'undefined') {
    return exportApi.waitForCompletion(jobId, onProgress);
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let unsubscribe: (() => void) | null = null;
    let connectTimeout: number | null = window.setTimeout(() => {
      fallbackToPolling();
    }, 5000);

    const cleanup = () => {
      if (connectTimeout) {
        window.clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };

    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      callback();
    };

    const fallbackToPolling = () => {
      if (settled) {
        return;
      }
      cleanup();
      exportApi.waitForCompletion(jobId, onProgress).then(
        (status) => settle(() => resolve(status)),
        (error: unknown) => settle(() => reject(error)),
      );
    };

    const handleEvent = (event: ExportEvent) => {
      if (connectTimeout) {
        window.clearTimeout(connectTimeout);
        connectTimeout = null;
      }

      if (event.type === 'snapshot' || event.type === 'progress') {
        onProgress(event.progress / 100);
        return;
      }

      if (event.type === 'completed') {
        settle(() =>
          resolve({
            id: event.jobId,
            status: 'COMPLETED',
            progress: 100,
            phase: 'COMPLETED',
            downloadUrl: event.downloadUrl,
            filename: event.filename,
            completedAt: event.completedAt,
            urlExpiresAt: event.urlExpiresAt,
          }),
        );
        return;
      }

      settle(() => reject(new Error(event.errorMessage)));
    };

    try {
      unsubscribe = exportApi.subscribeToExportEvents(jobId, {
        onEvent: handleEvent,
        onError: () => fallbackToPolling(),
      });
    } catch {
      fallbackToPolling();
    }
  });
}

export function getModernExportAssetReference(asset: EditorAsset): string {
  if (asset.serverAssetId) {
    return `project-asset:${asset.serverAssetId}`;
  }

  if (asset.studioAssetId) {
    return `studio-asset:${asset.studioAssetId}`;
  }

  return asset.url;
}

export function getModernExportErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('at least one timed content')) {
    return 'Tambahkan minimal satu layer text, audio, video, atau gambar sebelum export.';
  }

  if (message.includes('Background image asset is unavailable')) {
    return 'Gambar background sudah tidak tersedia. Pilih background image kembali.';
  }

  if (message.includes('Compilation failed')) {
    return 'Project belum siap diexport. Cek lagi asset, timing, dan layer yang masih kosong.';
  }

  if (message.includes('Export quota exceeded') || message.includes('QUOTA_EXCEEDED')) {
    return 'Kuota export kamu habis. Coba akun dengan quota tersedia atau upgrade plan.';
  }

  if (message.includes('Failed to download')) {
    return 'Export selesai, tapi file gagal diunduh. Coba export ulang sebentar lagi.';
  }

  if (message.includes('Download URL not available')) {
    return 'Export belum menyediakan file download. Coba lagi setelah proses selesai.';
  }

  return 'Export gagal diproses. Coba lagi atau cek asset yang digunakan.';
}

export function getModernExportOverallProgress(serverProgress: number): number {
  const normalizedServerProgress = Math.min(1, Math.max(0, serverProgress));
  return normalizedServerProgress * SERVER_PROGRESS_END;
}

export function getModernExportPhaseLabel(phase: ModernExportPhase): string {
  switch (phase) {
    case 'preparing':
      return 'Menyiapkan project';
    case 'uploading':
      return 'Mengupload asset';
    case 'queueing':
      return 'Membuat job export';
    case 'processing':
      return 'Merender video';
    case 'downloading':
      return 'Menyiapkan preview hasil';
    case 'completed':
      return 'Export selesai';
    case 'failed':
      return 'Export gagal';
    case 'idle':
      return 'Siap export';
  }
}

function getModernExportFilename(project: ModernProject): string {
  const safeTitle = project.title.trim().replace(/\s+/g, '_') || 'video-studio';
  return `export-${safeTitle}-${Date.now()}.mp4`;
}

function getExportResolution(project: ModernProject): 'SD' | 'HD' | 'UHD' {
  const maxDimension = Math.max(project.settings.width, project.settings.height);
  if (maxDimension >= 2160) return 'UHD';
  if (maxDimension >= 1080) return 'HD';
  return 'SD';
}
