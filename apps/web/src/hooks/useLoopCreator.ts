import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { authFetch, downloadAuthenticatedFile } from '@/services/api';
import { type ExportEvent, exportApi } from '@/services/export-api';
import {
  createDefaultLoopDocument,
  createLoopPreview,
  createLoopProject,
  createLoopProjectTitle,
  getLoopPreviewStatus,
  getLoopSourceInfo,
  type LoopCreatorProjectDocument,
  type LoopPreviewEvent,
  type LoopSourceInfo,
  loadLoopPreviewBlob as loadLoopCyclePreviewBlob,
  loadLoopProject,
  saveLoopProject,
  subscribeToLoopPreviewEvents,
  uploadLoopSource,
} from '@/services/loop-creator-project-api';
import { useAuthStore } from '@/stores/auth-store';

export type LoopRenderPhase = 'idle' | 'queued' | 'rendering' | 'ready' | 'failed';
export type LoopPreviewPhase = 'idle' | 'queued' | 'rendering' | 'ready' | 'failed';

export interface LoopRenderResult {
  readonly jobId: string;
  readonly filename: string;
  readonly previewUrl: string;
  readonly urlExpiresAt?: string;
}

const MAX_SOURCE_SIZE_BYTES = 200 * 1024 * 1024;

export function useLoopCreator(sessionId?: string) {
  const [projectId, setProjectId] = useState<string | undefined>(sessionId);
  const [title, setTitle] = useState('Loop Baru');
  const [document, setDocument] = useState<LoopCreatorProjectDocument>(createDefaultLoopDocument);
  const [sourceInfo, setSourceInfo] = useState<LoopSourceInfo | undefined>();
  const [videoUrl, setVideoUrl] = useState('');
  const [loopPreviewUrl, setLoopPreviewUrl] = useState('');
  const [loopPreviewPhase, setLoopPreviewPhase] = useState<LoopPreviewPhase>('idle');
  const [loopPreviewError, setLoopPreviewError] = useState<string | null>(null);
  const [previewRefreshToken, setPreviewRefreshToken] = useState(0);
  const [isLoading, setIsLoading] = useState(Boolean(sessionId));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [renderOpen, setRenderOpen] = useState(false);
  const [renderPhase, setRenderPhase] = useState<LoopRenderPhase>('idle');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderNotice, setRenderNotice] = useState<string | null>(null);
  const [renderResult, setRenderResult] = useState<LoopRenderResult | null>(null);
  const [renderSummary, setRenderSummary] = useState<{
    actualDurationMs: number;
    cycleCount: number;
    adjustedToTier: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string | null>(null);
  const loopPreviewUrlRef = useRef<string | null>(null);
  const stopPreviewEventsRef = useRef<(() => void) | null>(null);
  const previewRequestRef = useRef(0);
  const titleRef = useRef(title);
  const resultUrlRef = useRef<string | null>(null);
  const stopEventsRef = useRef<(() => void) | null>(null);
  const saveReadyRef = useRef(false);
  const { subscription, user } = useAuthStore();

  const replaceVideoUrl = useCallback((url?: string) => {
    if (videoUrlRef.current?.startsWith('blob:')) URL.revokeObjectURL(videoUrlRef.current);
    videoUrlRef.current = url ?? null;
    setVideoUrl(url ?? '');
  }, []);

  const clearLoopPreview = useCallback(() => {
    previewRequestRef.current += 1;
    stopPreviewEventsRef.current?.();
    stopPreviewEventsRef.current = null;
    if (loopPreviewUrlRef.current) URL.revokeObjectURL(loopPreviewUrlRef.current);
    loopPreviewUrlRef.current = null;
    setLoopPreviewUrl('');
    setLoopPreviewPhase('idle');
    setLoopPreviewError(null);
  }, []);

  const retryLoopPreview = useCallback(() => {
    setPreviewRefreshToken((value) => value + 1);
  }, []);

  const resetResult = useCallback(() => {
    stopEventsRef.current?.();
    stopEventsRef.current = null;
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setRenderResult(null);
    setRenderPhase('idle');
    setRenderProgress(0);
    setRenderError(null);
    setRenderNotice(null);
    setRenderSummary(null);
  }, []);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    return () => {
      stopEventsRef.current?.();
      stopPreviewEventsRef.current?.();
      if (videoUrlRef.current?.startsWith('blob:')) URL.revokeObjectURL(videoUrlRef.current);
      if (loopPreviewUrlRef.current) URL.revokeObjectURL(loopPreviewUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      saveReadyRef.current = true;
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    saveReadyRef.current = false;
    loadLoopProject(sessionId)
      .then((session) => {
        if (cancelled) return;
        setProjectId(session.id);
        setTitle(session.title);
        setDocument(session.document);
        setSourceInfo(session.sourceInfo);
        replaceVideoUrl(session.videoUrl);
        saveReadyRef.current = true;
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Gagal memuat draft.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [replaceVideoUrl, sessionId]);

  useEffect(() => {
    if (!projectId || !saveReadyRef.current) return;
    const timeout = window.setTimeout(() => {
      setIsSaving(true);
      saveLoopProject(projectId, title, document)
        .catch((error: unknown) => {
          setMessage(error instanceof Error ? error.message : 'Autosave gagal.');
        })
        .finally(() => setIsSaving(false));
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [document, projectId, title]);

  const updateDocument = useCallback(
    (next: LoopCreatorProjectDocument) => {
      setDocument({ ...next, savedAt: new Date().toISOString() });
      resetResult();
    },
    [resetResult],
  );

  const startNew = useCallback(() => {
    saveReadyRef.current = false;
    setProjectId(undefined);
    setTitle('Loop Baru');
    setSourceInfo(undefined);
    replaceVideoUrl();
    clearLoopPreview();
    setDocument(createDefaultLoopDocument());
    resetResult();
    setMessage(null);
    saveReadyRef.current = true;
  }, [clearLoopPreview, replaceVideoUrl, resetResult]);

  const selectVideo = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('video/')) {
        setMessage('Pilih file video untuk Loop Creator.');
        return;
      }
      if (file.size > MAX_SOURCE_SIZE_BYTES) {
        setMessage('File terlalu besar. Maksimal 200 MB.');
        return;
      }

      setMessage(null);
      setIsSaving(true);
      replaceVideoUrl(URL.createObjectURL(file));
      clearLoopPreview();
      resetResult();
      try {
        const session = projectId
          ? { id: projectId, title }
          : await createLoopProject(createLoopProjectTitle(file.name));
        const nextTitle = projectId ? title : session.title;
        const assetId = await uploadLoopSource(session.id, file);
        const nextDocument: LoopCreatorProjectDocument = {
          ...createDefaultLoopDocument(),
          sourceAssetId: assetId,
        };
        await saveLoopProject(session.id, nextTitle, nextDocument);
        const nextSource = await getLoopSourceInfo(session.id);
        setProjectId(session.id);
        setTitle(nextTitle);
        setDocument(nextDocument);
        setSourceInfo(nextSource);
        saveReadyRef.current = true;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Upload video gagal.');
      } finally {
        setIsSaving(false);
      }
    },
    [clearLoopPreview, projectId, replaceVideoUrl, resetResult, title],
  );

  useEffect(() => {
    clearLoopPreview();
    if (!projectId || !document.sourceAssetId || document.transition.mode !== 'smooth') {
      return;
    }

    const requestNumber = previewRequestRef.current;
    let cancelled = false;
    const setReadyPreview = async (previewId: string) => {
      const url = await loadLoopCyclePreviewBlob(previewId);
      if (cancelled || requestNumber !== previewRequestRef.current) {
        URL.revokeObjectURL(url);
        return;
      }
      if (loopPreviewUrlRef.current) URL.revokeObjectURL(loopPreviewUrlRef.current);
      loopPreviewUrlRef.current = url;
      setLoopPreviewUrl(url);
      setLoopPreviewPhase('ready');
      setLoopPreviewError(null);
    };
    const failPreview = (messageText: string) => {
      if (cancelled || requestNumber !== previewRequestRef.current) return;
      setLoopPreviewPhase('failed');
      setLoopPreviewError(messageText);
    };
    const handlePreviewEvent = (event: LoopPreviewEvent) => {
      if (cancelled || requestNumber !== previewRequestRef.current) return;
      if (event.type === 'snapshot' || event.type === 'progress') {
        setLoopPreviewPhase(event.status === 'QUEUED' ? 'queued' : 'rendering');
      }
      if (event.type === 'completed') {
        stopPreviewEventsRef.current?.();
        stopPreviewEventsRef.current = null;
        void setReadyPreview(event.previewId).catch(() =>
          failPreview('Preview loop belum dapat dimuat.'),
        );
      }
      if (event.type === 'failed' || event.type === 'expired') {
        failPreview(event.errorMessage);
      }
    };
    const pollPreview = async (previewId: string) => {
      while (!cancelled && requestNumber === previewRequestRef.current) {
        const status = await getLoopPreviewStatus(previewId);
        if (status.status === 'COMPLETED') {
          await setReadyPreview(previewId);
          return;
        }
        if (status.status === 'FAILED' || status.status === 'EXPIRED') {
          failPreview(status.errorMessage ?? 'Preview loop belum dapat dibuat.');
          return;
        }
        setLoopPreviewPhase(status.status === 'QUEUED' ? 'queued' : 'rendering');
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
    };
    const timer = window.setTimeout(
      () => {
        setLoopPreviewPhase('queued');
        void saveLoopProject(projectId, titleRef.current, document)
          .then(() => createLoopPreview(projectId))
          .then(async (preview) => {
            if (cancelled || requestNumber !== previewRequestRef.current) return;
            if (preview.status === 'COMPLETED') {
              await setReadyPreview(preview.previewId);
              return;
            }
            stopPreviewEventsRef.current = subscribeToLoopPreviewEvents(preview.previewId, {
              onEvent: handlePreviewEvent,
              onError: () => {
                stopPreviewEventsRef.current = null;
                void pollPreview(preview.previewId).catch(() =>
                  failPreview('Preview loop belum dapat dibuat.'),
                );
              },
            });
          })
          .catch(() => failPreview('Preview loop belum dapat dibuat.'));
      },
      previewRefreshToken > 0 ? 0 : 800,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopPreviewEventsRef.current?.();
      stopPreviewEventsRef.current = null;
    };
  }, [clearLoopPreview, document, previewRefreshToken, projectId]);

  const loadPreviewBlob = useCallback(async (jobId: string, filename: string, expiry?: string) => {
    const response = await authFetch(exportApi.getDownloadUrl(jobId));
    if (!response.ok) throw new Error('Preview hasil belum dapat dimuat.');
    const previewUrl = URL.createObjectURL(await response.blob());
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = previewUrl;
    setRenderResult({ jobId, filename, previewUrl, urlExpiresAt: expiry });
    setRenderPhase('ready');
    setRenderProgress(100);
  }, []);

  const handleExportEvent = useCallback(
    (event: ExportEvent) => {
      if (event.type === 'progress' || event.type === 'snapshot') {
        setRenderPhase(event.status === 'QUEUED' ? 'queued' : 'rendering');
        setRenderProgress(event.progress);
      }
      if (event.type === 'completed') {
        stopEventsRef.current?.();
        void loadPreviewBlob(event.jobId, event.filename, event.urlExpiresAt).catch((error) => {
          setRenderPhase('failed');
          setRenderError(error instanceof Error ? error.message : 'Preview hasil gagal dimuat.');
        });
      }
      if (event.type === 'failed' || event.type === 'expired') {
        setRenderPhase('failed');
        setRenderError(event.errorMessage);
      }
    },
    [loadPreviewBlob],
  );

  const render = useCallback(async () => {
    if (!projectId || !document.sourceAssetId) return;
    setRenderOpen(true);
    setRenderPhase('queued');
    setRenderProgress(0);
    setRenderError(null);
    setRenderNotice(null);
    try {
      await saveLoopProject(projectId, title, document);
      const job = await exportApi.createLoopRenderJob(projectId);
      setRenderSummary(
        job.actualDurationMs && job.cycleCount
          ? {
              actualDurationMs: job.actualDurationMs,
              cycleCount: job.cycleCount,
              adjustedToTier: Boolean(job.adjustedToTier),
            }
          : null,
      );
      if (job.cacheState === 'completed-result' && job.filename) {
        setRenderNotice('Menggunakan hasil terakhir karena video dan pengaturan belum berubah.');
        await loadPreviewBlob(job.jobId, job.filename, job.urlExpiresAt);
        return;
      }
      if (job.cacheState === 'active-job') {
        setRenderNotice('Render yang sama sedang berjalan.');
      }
      stopEventsRef.current = exportApi.subscribeToExportEvents(job.jobId, {
        onEvent: handleExportEvent,
        onError: () => {
          stopEventsRef.current?.();
          void exportApi
            .waitForCompletion(job.jobId, (progress) => setRenderProgress(progress * 100))
            .then((status) =>
              loadPreviewBlob(
                job.jobId,
                status.filename ?? 'loop-creator-result.mp4',
                status.urlExpiresAt,
              ),
            )
            .catch((error: unknown) => {
              setRenderPhase('failed');
              setRenderError(error instanceof Error ? error.message : 'Render gagal.');
            });
        },
      });
    } catch (error) {
      logger.error('Loop render failed', error);
      setRenderPhase('failed');
      setRenderError(error instanceof Error ? error.message : 'Render gagal.');
    }
  }, [document, handleExportEvent, loadPreviewBlob, projectId, title]);

  const downloadResult = useCallback(() => {
    if (!renderResult) return;
    void downloadAuthenticatedFile(
      exportApi.getDownloadUrl(renderResult.jobId),
      renderResult.filename,
    );
  }, [renderResult]);

  return {
    projectId,
    title,
    setTitle,
    document,
    updateDocument,
    sourceInfo,
    videoUrl,
    loopPreviewUrl,
    loopPreviewPhase,
    loopPreviewError,
    retryLoopPreview,
    videoRef,
    fileInputRef,
    isLoading,
    isSaving,
    message,
    selectVideo,
    startNew,
    render,
    renderOpen,
    setRenderOpen,
    renderPhase,
    renderProgress,
    renderError,
    renderNotice,
    renderResult,
    renderSummary,
    downloadResult,
    tier: user?.role === 'ADMIN' ? 'PRO' : (subscription?.tier ?? 'FREE'),
  };
}
