import { Download, MonitorPlay, RefreshCcw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LivePreviewMedia } from '@/components/director/steps/editing-live-preview-media';
import {
  canPlayFinalPreview,
  estimatePreviewProgressPercent,
  type PreviewStatus,
  resolvePreviewStatus,
} from '@/components/director/steps/editing-live-preview-state';
import { deriveLivePreviewScene } from '@/components/director/steps/editing-live-preview-utils';
import { Badge, Button, Modal, ModalBody, ModalContent } from '@/components/ui';
import { useAuthenticatedObjectUrl } from '@/hooks/use-authenticated-object-url';
import { getEffectiveRefineSettings } from '@/lib/director-refine-settings';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { authFetch, downloadAuthenticatedFile } from '@/services/api';
import {
  type DirectorSession,
  type ExportSettings,
  type RefineSettings,
  type SelectedClip,
  type SubtitleStyle,
  useDirectorStore,
} from '@/stores/director-store';

interface EditingLivePreviewProps {
  readonly activeSession: DirectorSession | null;
  readonly exportSettings: ExportSettings;
  readonly subtitleStyle: SubtitleStyle;
  readonly selectedClips: SelectedClip[];
  readonly refineSettings: Record<string, RefineSettings>;
}

type FinalPreviewJobStatus = 'READY' | 'QUEUED' | 'PROCESSING' | 'FAILED';

const FINAL_PREVIEW_POLL_INTERVAL_MS = 1400;
const FINAL_PREVIEW_PROGRESS_TICK_MS = 220;

interface FinalPreviewJobData {
  readonly status: FinalPreviewJobStatus;
  readonly previewFileName: string;
  readonly previewUrl?: string;
  readonly downloadUrl?: string;
  readonly progress?: number;
}

function parseFinalPreviewJobData(payload: unknown): FinalPreviewJobData | null {
  if (typeof payload !== 'object' || payload === null || !('data' in payload)) {
    return null;
  }

  const data = payload.data;
  if (typeof data !== 'object' || data === null || !('status' in data)) {
    return null;
  }

  const status = data.status;
  if (status !== 'READY' && status !== 'QUEUED' && status !== 'PROCESSING' && status !== 'FAILED') {
    return null;
  }

  if (!('previewFileName' in data) || typeof data.previewFileName !== 'string') {
    return null;
  }

  return {
    status,
    previewFileName: data.previewFileName,
    previewUrl:
      'previewUrl' in data && typeof data.previewUrl === 'string' ? data.previewUrl : undefined,
    downloadUrl:
      'downloadUrl' in data && typeof data.downloadUrl === 'string' ? data.downloadUrl : undefined,
    progress: 'progress' in data && typeof data.progress === 'number' ? data.progress : undefined,
  };
}

async function readFinalPreviewJobData(
  url: string,
  init?: RequestInit,
): Promise<FinalPreviewJobData> {
  const response = await authFetch(url, init);
  const payload = (await response.json()) as {
    success?: boolean;
    error?: { message?: string };
  };

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error?.message || 'Preview belum dapat dibuat');
  }

  const data = parseFinalPreviewJobData(payload);
  if (!data) {
    throw new Error('Preview belum dapat dibuat');
  }

  return data;
}

function waitForPreviewPoll(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

function buildFinalPreviewStatusUrl(activeSessionId: string, previewFileName: string): string {
  return `/api/v1/director/sessions/${activeSessionId}/export/preview/status?previewFileName=${encodeURIComponent(
    previewFileName,
  )}`;
}

async function startFinalPreviewJob(
  activeSessionId: string,
  previewPayloadJson: string,
): Promise<FinalPreviewJobData> {
  return readFinalPreviewJobData(`/api/v1/director/sessions/${activeSessionId}/export/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: previewPayloadJson,
  });
}

async function pollFinalPreviewJob(params: {
  readonly activeSessionId: string;
  readonly previewFileName: string;
  readonly onProgress: (progress: number) => void;
  readonly shouldContinue: () => boolean;
}): Promise<FinalPreviewJobData> {
  const { activeSessionId, previewFileName, onProgress, shouldContinue } = params;

  while (shouldContinue()) {
    await waitForPreviewPoll(FINAL_PREVIEW_POLL_INTERVAL_MS);
    if (!shouldContinue()) {
      throw new Error('Preview request cancelled');
    }

    const status = await readFinalPreviewJobData(
      buildFinalPreviewStatusUrl(activeSessionId, previewFileName),
    );

    if (status.status === 'READY') {
      return status;
    }

    if (status.status === 'FAILED') {
      throw new Error('Preview belum dapat dibuat');
    }

    if (typeof status.progress === 'number') {
      onProgress(status.progress);
    }
  }

  throw new Error('Preview request cancelled');
}

function resolveReadyFinalPreviewUrls(data: FinalPreviewJobData): {
  readonly previewUrl: string;
  readonly downloadUrl: string;
} {
  if (!data.previewUrl || !data.downloadUrl) {
    throw new Error('Preview belum dapat dibuat');
  }

  return {
    previewUrl: data.previewUrl,
    downloadUrl: data.downloadUrl,
  };
}

function applyReadyFinalPreviewState(params: {
  readonly data: FinalPreviewJobData;
  readonly latestPayload: string | null;
  readonly requestedPayload: string;
  readonly setLastGeneratedPayloadKey: (value: string) => void;
  readonly setPreviewDownloadPath: (value: string) => void;
  readonly setPreviewError: (value: string | null) => void;
  readonly setPreviewFileName: (value: string) => void;
  readonly setPreviewProgressPercent: (value: number) => void;
  readonly setPreviewStatus: (value: PreviewStatus) => void;
  readonly setRenderPreviewPath: (value: string) => void;
}): void {
  const readyUrls = resolveReadyFinalPreviewUrls(params.data);

  params.setPreviewProgressPercent(100);
  params.setRenderPreviewPath(readyUrls.previewUrl);
  params.setPreviewDownloadPath(readyUrls.downloadUrl);
  params.setPreviewFileName(params.data.previewFileName);
  params.setPreviewError(null);

  if (params.requestedPayload === params.latestPayload) {
    params.setLastGeneratedPayloadKey(params.requestedPayload);
    params.setPreviewStatus('ready');
    return;
  }

  params.setPreviewStatus('dirty');
}

async function generateAndInstallFinalPreview(params: {
  readonly activeSessionId: string;
  readonly isCurrentRequest: () => boolean;
  readonly requestedPayload: string;
  readonly setLastGeneratedPayloadKey: (value: string) => void;
  readonly setPreviewDownloadPath: (value: string) => void;
  readonly setPreviewError: (value: string | null) => void;
  readonly setPreviewFileName: (value: string) => void;
  readonly setPreviewProgressPercent: (value: number) => void;
  readonly setPreviewStatus: (value: PreviewStatus) => void;
  readonly setRenderPreviewPath: (value: string) => void;
  readonly updatePreviewProgress: (progress: number) => void;
  readonly getLatestPayload: () => string | null;
}): Promise<void> {
  const initialPreview = await startFinalPreviewJob(
    params.activeSessionId,
    params.requestedPayload,
  );
  if (!params.isCurrentRequest()) {
    return;
  }

  params.setPreviewFileName(initialPreview.previewFileName);

  if (initialPreview.status === 'READY') {
    applyReadyFinalPreviewState({
      data: initialPreview,
      latestPayload: params.getLatestPayload(),
      requestedPayload: params.requestedPayload,
      setLastGeneratedPayloadKey: params.setLastGeneratedPayloadKey,
      setPreviewDownloadPath: params.setPreviewDownloadPath,
      setPreviewError: params.setPreviewError,
      setPreviewFileName: params.setPreviewFileName,
      setPreviewProgressPercent: params.setPreviewProgressPercent,
      setPreviewStatus: params.setPreviewStatus,
      setRenderPreviewPath: params.setRenderPreviewPath,
    });
    return;
  }

  params.updatePreviewProgress(initialPreview.progress ?? 0);
  const readyPreview = await pollFinalPreviewJob({
    activeSessionId: params.activeSessionId,
    previewFileName: initialPreview.previewFileName,
    onProgress: params.updatePreviewProgress,
    shouldContinue: params.isCurrentRequest,
  });
  applyReadyFinalPreviewState({
    data: readyPreview,
    latestPayload: params.getLatestPayload(),
    requestedPayload: params.requestedPayload,
    setLastGeneratedPayloadKey: params.setLastGeneratedPayloadKey,
    setPreviewDownloadPath: params.setPreviewDownloadPath,
    setPreviewError: params.setPreviewError,
    setPreviewFileName: params.setPreviewFileName,
    setPreviewProgressPercent: params.setPreviewProgressPercent,
    setPreviewStatus: params.setPreviewStatus,
    setRenderPreviewPath: params.setRenderPreviewPath,
  });
}

export function EditingLivePreview({
  activeSession,
  exportSettings,
  subtitleStyle,
  selectedClips,
  refineSettings,
}: Readonly<EditingLivePreviewProps>) {
  const setStep = useDirectorStore((state) => state.setStep);
  const [renderPreviewPath, setRenderPreviewPath] = useState<string | null>(null);
  const [previewDownloadPath, setPreviewDownloadPath] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle');
  const [isPlayingModalOpen, setIsPlayingModalOpen] = useState(false);
  const [previewProgressPercent, setPreviewProgressPercent] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [lastGeneratedPayloadKey, setLastGeneratedPayloadKey] = useState<string | null>(null);
  const [lastAttemptPayloadKey, setLastAttemptPayloadKey] = useState<string | null>(null);
  const requestVersionRef = useRef(0);
  const latestPayloadRef = useRef<string | null>(null);
  const autoStartedPayloadRef = useRef<string | null>(null);

  const primaryClip = selectedClips[0];
  const effectiveExportSettings: ExportSettings = useMemo(
    () => ({
      ...exportSettings,
      aspectRatio: '9:16',
    }),
    [exportSettings],
  );
  const activeRefineSettings = primaryClip
    ? getEffectiveRefineSettings(primaryClip, refineSettings[primaryClip.id])
    : undefined;
  const scene = deriveLivePreviewScene(
    effectiveExportSettings,
    subtitleStyle,
    primaryClip,
    activeRefineSettings,
  );
  const previewPayload = useMemo(
    () =>
      buildPreviewPayload(
        primaryClip,
        activeRefineSettings,
        effectiveExportSettings,
        subtitleStyle,
      ),
    [activeRefineSettings, effectiveExportSettings, primaryClip, subtitleStyle],
  );
  const previewPayloadJson = previewPayload ? JSON.stringify(previewPayload) : null;

  const activeSessionId = activeSession?.id;

  useEffect(() => {
    latestPayloadRef.current = previewPayloadJson;
  }, [previewPayloadJson]);

  useEffect(() => {
    requestVersionRef.current += 1;
    if (!activeSessionId) {
      setRenderPreviewPath(null);
      setPreviewDownloadPath(null);
      setPreviewFileName(null);
      setPreviewStatus('idle');
      setLastGeneratedPayloadKey(null);
      setLastAttemptPayloadKey(null);
      autoStartedPayloadRef.current = null;
      setPreviewProgressPercent(0);
      setPreviewError(null);
      setDownloadError(null);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (!previewPayloadJson) {
      setPreviewStatus('idle');
      setLastGeneratedPayloadKey(null);
      setLastAttemptPayloadKey(null);
      autoStartedPayloadRef.current = null;
      setPreviewProgressPercent(0);
      setPreviewError(null);
      setDownloadError(null);
      setRenderPreviewPath(null);
      setPreviewDownloadPath(null);
      setPreviewFileName(null);
      return;
    }

    if (previewStatus === 'generating') {
      return;
    }

    setPreviewStatus(
      resolvePreviewStatus({
        previewPayloadJson,
        previewStatus,
        renderPreviewPath,
        previewDownloadPath,
        lastGeneratedPayloadKey,
        lastAttemptPayloadKey,
      }),
    );
  }, [
    lastAttemptPayloadKey,
    lastGeneratedPayloadKey,
    previewDownloadPath,
    previewPayloadJson,
    previewStatus,
    renderPreviewPath,
  ]);

  const handleGeneratePreview = useCallback(async () => {
    if (!activeSessionId || !previewPayloadJson) {
      return;
    }

    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    const startTimestamp = Date.now();
    const requestedPayload = previewPayloadJson;

    setPreviewStatus('generating');
    setLastAttemptPayloadKey(requestedPayload);
    setPreviewProgressPercent(2);
    setPreviewError(null);
    setDownloadError(null);

    const bumpPreviewProgress = () => {
      const elapsedMs = Date.now() - startTimestamp;
      const estimatedProgress = estimatePreviewProgressPercent(elapsedMs);

      setPreviewProgressPercent((previous) => Math.max(previous, estimatedProgress));
    };

    const progressIntervalId = globalThis.setInterval(() => {
      bumpPreviewProgress();
    }, FINAL_PREVIEW_PROGRESS_TICK_MS);

    try {
      await generateAndInstallFinalPreview({
        activeSessionId,
        getLatestPayload: () => latestPayloadRef.current,
        isCurrentRequest: () => requestVersionRef.current === requestVersion,
        requestedPayload,
        setLastGeneratedPayloadKey,
        setPreviewDownloadPath,
        setPreviewError,
        setPreviewFileName,
        setPreviewProgressPercent,
        setPreviewStatus,
        setRenderPreviewPath,
        updatePreviewProgress: (progress) => {
          setPreviewProgressPercent((previous) => Math.max(previous, progress));
        },
      });
    } catch (error) {
      if (requestVersionRef.current !== requestVersion) {
        return;
      }

      logger.error('Generate preview failed', error);
      setPreviewProgressPercent(0);
      setPreviewStatus('failed');
      setPreviewError(error instanceof Error ? error.message : 'Preview belum dapat dibuat');
    } finally {
      globalThis.clearInterval(progressIntervalId);
    }
  }, [activeSessionId, previewPayloadJson]);

  useEffect(() => {
    if (!activeSessionId || !previewPayloadJson) {
      return;
    }

    if (previewStatus !== 'idle' && previewStatus !== 'dirty') {
      return;
    }

    if (autoStartedPayloadRef.current === previewPayloadJson) {
      return;
    }

    autoStartedPayloadRef.current = previewPayloadJson;
    void handleGeneratePreview();
  }, [activeSessionId, handleGeneratePreview, previewPayloadJson, previewStatus]);

  const handleDownloadPreview = useCallback(async () => {
    if (!previewDownloadPath || previewStatus !== 'ready') {
      return;
    }

    try {
      setDownloadError(null);
      await downloadAuthenticatedFile(
        previewDownloadPath,
        previewFileName ?? `short-video-${activeSession?.id ?? Date.now()}.mp4`,
      );
    } catch (error) {
      logger.error('Preview download failed', error);
      setDownloadError('Download gagal. Coba generate ulang lalu download lagi.');
    }
  }, [activeSession?.id, previewDownloadPath, previewFileName, previewStatus]);

  const previewVideoUrl = useAuthenticatedObjectUrl(
    activeSession && primaryClip && renderPreviewPath && previewStatus === 'ready'
      ? renderPreviewPath
      : null,
  );
  const posterUrl = useAuthenticatedObjectUrl(
    activeSession && primaryClip
      ? `/api/v1/director/sessions/${activeSession.id}/clips/${primaryClip.candidate.id}/poster`
      : null,
  );
  const showGeneratingState = previewStatus === 'generating';
  const shouldEnableDownload = previewStatus === 'ready' && Boolean(previewDownloadPath);
  const shouldShowRegenerateButton = previewStatus === 'dirty' || previewStatus === 'failed';
  const canPlayPreview = canPlayFinalPreview(previewStatus, previewVideoUrl);
  const handleBackToEdit = useCallback(() => {
    setStep('EDITING');
  }, [setStep]);

  useEffect(() => {
    if (!canPlayPreview && isPlayingModalOpen) {
      setIsPlayingModalOpen(false);
    }
  }, [canPlayPreview, isPlayingModalOpen]);

  const mediaProps = {
    previewVideoUrl,
    posterUrl,
    previewError,
    showGeneratingState,
    previewProgressPercent,
    mediaClass: scene.mediaClass,
    canPlayPreview,
    onPlay: () => {
      if (canPlayPreview) {
        setIsPlayingModalOpen(true);
      }
    },
  };

  return (
    <div className="space-y-4 rounded-3xl border border-border/40 bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-9 w-9 shrink-0 rounded-xl border border-primary/20 bg-primary/10 flex items-center justify-center">
            <MonitorPlay size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h4 className="font-black tracking-tight text-base leading-none">Video Akhir</h4>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Cek hasil final, lalu download video.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 rounded-full border-border/50 bg-muted/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground"
        >
          Output: 9:16 · {effectiveExportSettings.quality}
        </Badge>
      </div>

      <div
        className={cn(
          'w-full rounded-4xl border border-border/50 overflow-hidden relative min-h-80',
          scene.aspectClass,
          scene.frameClass,
        )}
      >
        <LivePreviewMedia {...mediaProps} />
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <Badge className="shrink-0 rounded-full border-border/50 bg-black/60 backdrop-blur-sm px-2.5 py-1 text-[10px] text-white pointer-events-auto">
            {getPreviewBadgeText(previewStatus, previewProgressPercent)}
          </Badge>
        </div>
      </div>

      <Modal open={isPlayingModalOpen} onOpenChange={setIsPlayingModalOpen}>
        <ModalContent className="max-w-4xl overflow-hidden rounded-3xl border border-border/60 bg-card/95 p-0 shadow-2xl sm:rounded-4xl [&>button]:hidden">
          <ModalBody className="p-0">
            {canPlayPreview && previewVideoUrl && (
              <div className="relative flex h-[85vh] w-full items-center justify-center bg-black">
                <video
                  src={previewVideoUrl}
                  className="max-h-full max-w-full object-contain shadow-2xl"
                  controls
                  playsInline
                  autoPlay
                >
                  <track kind="captions" srcLang="id" label="Video akhir identik export" />
                </video>
                <button
                  type="button"
                  onClick={() => setIsPlayingModalOpen(false)}
                  className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground backdrop-blur-md transition-all hover:bg-background"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <div className="grid grid-cols-1 gap-2">
        {shouldShowRegenerateButton ? (
          <Button
            onClick={() => {
              void handleGeneratePreview();
            }}
            disabled={!previewPayloadJson}
            className="h-11 rounded-2xl text-xs font-semibold tracking-normal"
          >
            <RefreshCcw size={14} className="mr-2" />
            Generate Ulang
          </Button>
        ) : null}
        <Button
          variant={shouldEnableDownload ? 'default' : 'secondary'}
          onClick={() => {
            void handleDownloadPreview();
          }}
          disabled={!shouldEnableDownload}
          className="h-11 rounded-2xl text-xs font-semibold tracking-normal border-primary/20 hover:bg-primary/5"
        >
          <Download size={14} className="mr-2" />
          Download Video
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleBackToEdit}
          className="h-11 rounded-2xl text-xs font-semibold tracking-normal text-muted-foreground hover:text-foreground"
        >
          Kembali Edit
        </Button>
      </div>

      {previewError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
          {previewError}
        </div>
      ) : null}
      {downloadError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
          {downloadError}
        </div>
      ) : null}
    </div>
  );
}

function buildPreviewPayload(
  primaryClip: SelectedClip | undefined,
  activeRefineSettings: RefineSettings | undefined,
  exportSettings: ExportSettings,
  subtitleStyle: SubtitleStyle,
) {
  if (!primaryClip || !activeRefineSettings) {
    return null;
  }

  return {
    aspectRatio: exportSettings.aspectRatio,
    quality: exportSettings.quality,
    includeSubtitles: exportSettings.includeSubtitles,
    normalizeAudio: exportSettings.normalizeAudio,
    subtitleStyle: {
      stylePreset: subtitleStyle.stylePreset,
      fontToken: subtitleStyle.fontToken,
      fontFamily: subtitleStyle.fontFamily,
      textColorToken: subtitleStyle.textColorToken,
      bgColorToken: subtitleStyle.bgColorToken,
      fontSize: subtitleStyle.fontSize,
      position: subtitleStyle.position,
      animation: subtitleStyle.animation,
      speakerMode: subtitleStyle.speakerMode,
      speakerStyles: subtitleStyle.speakerStyles,
    },
    refineSettings: {
      [primaryClip.id]: {
        faceTracking: Boolean(activeRefineSettings.faceTracking),
        removeSilence: Boolean(activeRefineSettings.removeSilence),
        optimizeHook: Boolean(activeRefineSettings.optimizeHook),
        stabilize: Boolean(activeRefineSettings.stabilize),
        contentMode: activeRefineSettings.contentMode,
      },
    },
  };
}

function getPreviewBadgeText(status: PreviewStatus, progress: number): string {
  switch (status) {
    case 'ready':
      return 'Preview siap';
    case 'dirty':
      return 'Perlu generate ulang';
    case 'generating':
      return `Menyiapkan preview ${progress}%`;
    case 'failed':
      return 'Preview gagal';
    default:
      return 'Menyiapkan preview';
  }
}
