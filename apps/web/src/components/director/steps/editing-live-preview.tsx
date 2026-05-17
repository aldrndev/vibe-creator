import { Download, MonitorPlay, RefreshCcw, Scissors, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LivePreviewMedia,
  PreviewBadges,
} from '@/components/director/steps/editing-live-preview-media';
import {
  canPlayFinalPreview,
  estimatePreviewProgressPercent,
  type PreviewStatus,
  resolvePreviewStatus,
} from '@/components/director/steps/editing-live-preview-state';
import { deriveLivePreviewScene } from '@/components/director/steps/editing-live-preview-utils';
import { Badge, Button, Modal, ModalBody, ModalContent } from '@/components/ui';
import { useAuthenticatedObjectUrl } from '@/hooks/use-authenticated-object-url';
import { getEffectiveRefineSettings, getResolvedContentMode } from '@/lib/director-refine-settings';
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

export function EditingLivePreview({
  activeSession,
  exportSettings,
  subtitleStyle,
  selectedClips,
  refineSettings,
}: Readonly<EditingLivePreviewProps>) {
  const clearCandidateSelection = useDirectorStore((state) => state.clearCandidateSelection);
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

  const primaryClip = selectedClips[0];
  const activeRefineSettings = primaryClip
    ? getEffectiveRefineSettings(primaryClip, refineSettings[primaryClip.id])
    : undefined;
  const scene = deriveLivePreviewScene(
    exportSettings,
    subtitleStyle,
    primaryClip,
    activeRefineSettings,
  );
  const previewPayload = useMemo(
    () => buildPreviewPayload(primaryClip, activeRefineSettings, exportSettings, subtitleStyle),
    [activeRefineSettings, exportSettings, primaryClip, subtitleStyle],
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
    }, 220);

    try {
      const response = await authFetch(
        `/api/v1/director/sessions/${activeSessionId}/export/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestedPayload,
        },
      );
      const payload = (await response.json()) as {
        success: boolean;
        data?: {
          previewFileName?: string;
          previewUrl?: string;
          downloadUrl?: string;
        };
        error?: { message?: string };
      };

      if (
        !response.ok ||
        !payload.success ||
        !payload.data?.previewUrl ||
        !payload.data?.downloadUrl ||
        !payload.data?.previewFileName
      ) {
        throw new Error(payload.error?.message || 'Video akhir gagal digenerate');
      }

      if (requestVersionRef.current !== requestVersion) {
        return;
      }

      setPreviewProgressPercent(100);
      setRenderPreviewPath(payload.data.previewUrl);
      setPreviewDownloadPath(payload.data.downloadUrl);
      setPreviewFileName(payload.data.previewFileName);
      setPreviewError(null);

      if (requestedPayload === latestPayloadRef.current) {
        setLastGeneratedPayloadKey(requestedPayload);
        setPreviewStatus('ready');
      } else {
        setPreviewStatus('dirty');
      }
    } catch (error) {
      if (requestVersionRef.current !== requestVersion) {
        return;
      }

      logger.error('Generate preview failed', error);
      setPreviewProgressPercent(0);
      setPreviewStatus('failed');
      setPreviewError(error instanceof Error ? error.message : 'Video akhir gagal dimuat');
    } finally {
      globalThis.clearInterval(progressIntervalId);
    }
  }, [activeSessionId, previewPayloadJson]);

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
      setDownloadError('Unduhan gagal. Coba generate ulang lalu unduh lagi.');
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
  const resolvedContentMode =
    primaryClip && activeRefineSettings
      ? getResolvedContentMode(primaryClip.candidate, activeRefineSettings)
      : null;
  const showGeneratingState = previewStatus === 'generating';
  const shouldDisableGenerate = !previewPayloadJson || previewStatus === 'generating';
  const shouldEnableDownload = previewStatus === 'ready' && Boolean(previewDownloadPath);
  const canPlayPreview = canPlayFinalPreview(previewStatus, previewVideoUrl);
  const handlePickNewClip = useCallback(() => {
    clearCandidateSelection();
    setStep('PICKING');
  }, [clearCandidateSelection, setStep]);

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
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-9 w-9 shrink-0 rounded-xl border border-primary/20 bg-primary/10 flex items-center justify-center">
            <MonitorPlay size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h4 className="font-black tracking-tight text-base leading-none">Video Akhir</h4>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Generate video akhir, lalu download hasil yang sama.
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'w-full rounded-4xl border border-border/50 overflow-hidden relative min-h-80',
          scene.aspectClass,
          scene.frameClass,
        )}
      >
        <LivePreviewMedia {...mediaProps} />
        {/* Status badge overlaid on top-right of video */}
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <Badge className="shrink-0 rounded-full border-border/50 bg-black/60 backdrop-blur-sm px-2.5 py-1 text-[10px] text-white pointer-events-auto">
            {getPreviewBadgeText(previewStatus, previewProgressPercent)}
          </Badge>
        </div>
        {/* Feature badges overlaid at bottom of video, above player controls */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none flex flex-wrap gap-1 max-w-[calc(100%-5rem)]">
          <PreviewBadges
            resolvedContentMode={resolvedContentMode}
            exportSettings={exportSettings}
            subtitleStyle={subtitleStyle}
            activeRefineSettings={activeRefineSettings}
          />
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
        <Button
          onClick={() => {
            void handleGeneratePreview();
          }}
          disabled={shouldDisableGenerate}
          className="h-11 rounded-2xl text-xs font-semibold tracking-normal"
        >
          {previewStatus === 'dirty' || previewStatus === 'failed' ? (
            <RefreshCcw size={14} className="mr-2" />
          ) : (
            <MonitorPlay size={14} className="mr-2" />
          )}
          {getGenerateButtonText(previewStatus)}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void handleDownloadPreview();
          }}
          disabled={!shouldEnableDownload}
          className="h-11 rounded-2xl text-xs font-semibold tracking-normal border-primary/20 hover:bg-primary/5"
        >
          <Download size={14} className="mr-2" />
          Download Video
        </Button>
        {previewStatus === 'ready' ? (
          <>
            <div className="my-1 h-px bg-border/55" />
            <Button
              type="button"
              variant="ghost"
              onClick={handlePickNewClip}
              className="h-11 rounded-2xl text-xs font-semibold tracking-normal text-muted-foreground hover:text-foreground"
            >
              <Scissors size={14} className="mr-2" />
              Pilih Klip Baru
            </Button>
          </>
        ) : null}
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
      return 'Siap Diunduh';
    case 'dirty':
      return 'Perlu Generate Ulang';
    case 'generating':
      return `Membuat Video ${progress}%`;
    case 'failed':
      return 'Generate Gagal';
    default:
      return 'Belum Generate';
  }
}

function getGenerateButtonText(status: PreviewStatus): string {
  switch (status) {
    case 'generating':
      return 'Membuat Video...';
    case 'dirty':
    case 'failed':
      return 'Generate Ulang Video';
    default:
      return 'Generate Video';
  }
}
