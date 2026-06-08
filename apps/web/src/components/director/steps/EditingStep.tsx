import { AlertCircle, Loader2, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type DirectorTranscribeProgressMeta,
  getTranscribePhaseLabel,
  getTranscribeProgressMeta,
  shouldPollTranscribeStatus,
} from '@/components/director/steps/director-step-utils';
import { EditingSidebar } from '@/components/director/steps/editing-sidebar';
import type { TranscriptSegment } from '@/components/director/steps/editing-transcript-cues';
import { SelectedClipCard } from '@/components/director/steps/selected-clip-card';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { resolveDirectorEffectiveExportSettings } from '@/lib/director-export-entitlement';
import { applyContentModePreset, type ContentMode } from '@/lib/director-refine-settings';
import { logger } from '@/lib/logger';
import {
  COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS,
  formatTranscribeLanguageLabel,
  normalizeTranscribeLanguage,
} from '@/lib/transcribe-language';
import { cn } from '@/lib/utils';
import { authFetch } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import {
  type DirectorSession,
  type SelectedClip,
  type SubtitleStyle,
  type TranscribeJob,
  useDirectorStore,
} from '@/stores/director-store';

const DEFAULT_SUBTITLE_TARGET_LANGUAGE = 'en';
const SAVE_NOTICE_DISPLAY_MS = 2400;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type SubtitleMode = 'original' | 'translate';

interface SubtitleStatusState {
  readonly label: string;
  readonly tone: 'active' | 'success' | 'error';
}

interface TranscribeJobStateActions {
  readonly setTranscribeJob: (job: TranscribeJob) => void;
  readonly setTranscribeLanguage: (language: string) => void;
  readonly setSubtitleMode: (mode: SubtitleMode) => void;
  readonly setSubtitleTargetLanguage: (language: string) => void;
}

function resolveSubtitleTargetLanguage(value: unknown): string {
  const normalized = normalizeTranscribeLanguage(value, DEFAULT_SUBTITLE_TARGET_LANGUAGE);
  const isSupported = COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS.some(
    (option) => option.value === normalized,
  );
  return isSupported ? normalized : DEFAULT_SUBTITLE_TARGET_LANGUAGE;
}

function resolveResponseSubtitleMode(data: TranscribeJob): SubtitleMode | null {
  const mode = data.subtitleMode ?? data.progressMeta?.subtitleMode;
  return mode === 'original' || mode === 'translate' ? mode : null;
}

function resolveResponseSubtitleTargetLanguage(data: TranscribeJob): string | null {
  const targetLanguage = data.subtitleTargetLanguage ?? data.progressMeta?.subtitleTargetLanguage;
  if (typeof targetLanguage === 'string' && targetLanguage.trim().length > 0) {
    return resolveSubtitleTargetLanguage(targetLanguage);
  }

  return null;
}

function applyTranscribeJobState(
  data: TranscribeJob,
  {
    setTranscribeJob,
    setTranscribeLanguage,
    setSubtitleMode,
    setSubtitleTargetLanguage,
  }: TranscribeJobStateActions,
): void {
  setTranscribeJob(data);
  if (typeof data.language === 'string' && data.language.trim().length > 0) {
    setTranscribeLanguage(normalizeTranscribeLanguage(data.language));
  }

  const subtitleMode = resolveResponseSubtitleMode(data);
  if (subtitleMode) {
    setSubtitleMode(subtitleMode);
  }

  const subtitleTargetLanguage = resolveResponseSubtitleTargetLanguage(data);
  if (subtitleTargetLanguage) {
    setSubtitleTargetLanguage(subtitleTargetLanguage);
  }
}

function getSubtitleStatusState(params: {
  readonly isTranscribing: boolean;
  readonly subtitleSaveState: SaveState;
  readonly transcribeFailed: boolean;
  readonly transcribePhase?: DirectorTranscribeProgressMeta['phase'] | null;
}): SubtitleStatusState | null {
  if (params.transcribeFailed) {
    return { label: 'Gagal menyiapkan subtitle', tone: 'error' };
  }

  if (params.isTranscribing) {
    return {
      label: params.transcribePhase
        ? `Menyiapkan subtitle · ${getTranscribePhaseLabel(params.transcribePhase)}`
        : 'Menyiapkan subtitle...',
      tone: 'active',
    };
  }

  if (params.subtitleSaveState === 'saving') {
    return { label: 'Menyimpan style subtitle...', tone: 'active' };
  }

  if (params.subtitleSaveState === 'saved') {
    return { label: 'Tersimpan', tone: 'success' };
  }

  if (params.subtitleSaveState === 'error') {
    return { label: 'Gagal menyimpan style subtitle', tone: 'error' };
  }

  return null;
}

function getSubtitleStatusClass(tone: SubtitleStatusState['tone']): string {
  switch (tone) {
    case 'active':
      return 'border-primary/20 bg-primary/5 text-primary';
    case 'success':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
    case 'error':
      return 'border-rose-500/25 bg-rose-500/10 text-rose-400';
  }
}

function resolveSubtitleStatusRetry(params: {
  readonly handleRetryTranscribe: () => void;
  readonly handleRetrySubtitleSave: () => void;
  readonly subtitleSaveState: SaveState;
  readonly transcribeFailed: boolean;
}): (() => void) | null {
  if (params.subtitleSaveState === 'error') {
    return params.handleRetrySubtitleSave;
  }

  if (params.transcribeFailed) {
    return params.handleRetryTranscribe;
  }

  return null;
}

function getPreviewDownloadButtonLabel(params: {
  readonly hasSaveErrorBeforePreview: boolean;
  readonly isSavingBeforePreview: boolean;
}): string {
  if (params.isSavingBeforePreview) {
    return 'Menyimpan...';
  }

  if (params.hasSaveErrorBeforePreview) {
    return 'Simpan gagal';
  }

  return 'Preview & Download';
}

function useDirectorSaveStates(
  activeSession: DirectorSession | null,
  subtitleStyle: SubtitleStyle,
) {
  const subtitleSyncKeyRef = useRef<string | null>(null);
  const failedTranscriptUpdateRef = useRef<{
    clipId: string;
    segments: TranscriptSegment[];
  } | null>(null);
  const [subtitleSaveState, setSubtitleSaveState] = useState<SaveState>('idle');
  const [transcriptSaveState, setTranscriptSaveState] = useState<SaveState>('idle');

  const saveSubtitleStyle = useCallback(async (): Promise<boolean> => {
    if (!activeSession) return false;
    try {
      setSubtitleSaveState('saving');
      const response = await authFetch(`/api/v1/director/sessions/${activeSession.id}/subtitle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subtitleStyle),
      });
      if (!response.ok) throw new Error(`Update subtitle style failed: ${response.status}`);
      subtitleSyncKeyRef.current = JSON.stringify(subtitleStyle);
      setSubtitleSaveState('saved');
      return true;
    } catch (error) {
      logger.error('Update subtitle style failed', error);
      setSubtitleSaveState('error');
      return false;
    }
  }, [activeSession, subtitleStyle]);

  const saveTranscriptSegments = useCallback(
    async (clipId: string, segments: TranscriptSegment[]): Promise<boolean> => {
      if (!activeSession) return false;
      try {
        setTranscriptSaveState('saving');
        const response = await authFetch(
          `/api/v1/director/sessions/${activeSession.id}/clips/${clipId}/transcript`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ segments }),
          },
        );
        if (!response.ok) throw new Error(`Update transcript failed: ${response.status}`);
        failedTranscriptUpdateRef.current = null;
        setTranscriptSaveState('saved');
        return true;
      } catch (error) {
        logger.error('Update transcript failed', error);
        failedTranscriptUpdateRef.current = { clipId, segments };
        setTranscriptSaveState('error');
        return false;
      }
    },
    [activeSession],
  );

  const handleRetryTranscriptSave = useCallback(() => {
    const failedUpdate = failedTranscriptUpdateRef.current;
    if (!failedUpdate) {
      return;
    }

    void saveTranscriptSegments(failedUpdate.clipId, failedUpdate.segments);
  }, [saveTranscriptSegments]);

  useEffect(() => {
    if (!activeSession) {
      subtitleSyncKeyRef.current = null;
      return;
    }

    const serializedStyle = JSON.stringify(subtitleStyle);
    if (subtitleSyncKeyRef.current === null) {
      subtitleSyncKeyRef.current = serializedStyle;
      return;
    }

    if (subtitleSyncKeyRef.current === serializedStyle) return;

    const timeoutId = globalThis.setTimeout(() => {
      void saveSubtitleStyle();
    }, 300);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [activeSession, saveSubtitleStyle, subtitleStyle]);

  useEffect(() => {
    if (subtitleSaveState !== 'saved') return;
    const timeoutId = globalThis.setTimeout(() => {
      setSubtitleSaveState('idle');
    }, SAVE_NOTICE_DISPLAY_MS);
    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [subtitleSaveState]);

  useEffect(() => {
    if (transcriptSaveState !== 'saved') return;
    const timeoutId = globalThis.setTimeout(() => {
      setTranscriptSaveState('idle');
    }, SAVE_NOTICE_DISPLAY_MS);
    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [transcriptSaveState]);

  return {
    subtitleSaveState,
    transcriptSaveState,
    saveSubtitleStyle,
    saveTranscriptSegments,
    handleRetryTranscriptSave,
  };
}

function useDirectorTranscribe(
  activeSession: DirectorSession | null,
  selectedClips: SelectedClip[],
  transcribeLanguage: string,
  subtitleMode: SubtitleMode,
  subtitleTargetLanguage: string | undefined,
  transcribeJob: TranscribeJob | null,
  refreshSelectedClips: () => Promise<void>,
) {
  const {
    setTranscribeJob,
    setTranscribeLanguage,
    setSubtitleMode,
    setSubtitleTargetLanguage,
    setError,
  } = useDirectorStore();

  const autoTranscribeSessionRef = useRef<string | null>(null);

  const pollTranscriptionStatus = useCallback(async () => {
    if (!activeSession) {
      return false;
    }

    try {
      const jobRes = await authFetch(`/api/v1/director/sessions/${activeSession.id}/transcribe`);
      const jobData = await jobRes.json();

      if (!jobData.success) {
        return false;
      }

      const newStatus = jobData.data.status;
      applyTranscribeJobState(jobData.data, {
        setTranscribeJob,
        setTranscribeLanguage,
        setSubtitleMode,
        setSubtitleTargetLanguage,
      });

      if (newStatus === 'COMPLETED' || newStatus === 'FAILED') {
        await refreshSelectedClips();
        if (newStatus === 'FAILED') {
          setError(jobData.data.errorMessage || 'Transkripsi gagal diproses');
        } else {
          setError(null);
        }
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Poll transcription error', error);
      return false;
    }
  }, [
    activeSession,
    refreshSelectedClips,
    setError,
    setSubtitleMode,
    setSubtitleTargetLanguage,
    setTranscribeJob,
    setTranscribeLanguage,
  ]);

  const handleStartTranscribe = useCallback(
    async (options?: { forceRefresh?: boolean }): Promise<boolean> => {
      if (!activeSession) {
        return false;
      }

      const shouldForceRefresh = options?.forceRefresh === true;

      if (shouldForceRefresh) {
        setTranscribeJob({ status: 'PENDING' });
        setError(null);
      }

      const normalizedLanguage = normalizeTranscribeLanguage(transcribeLanguage);
      const normalizedSubtitleTargetLanguage =
        resolveSubtitleTargetLanguage(subtitleTargetLanguage);

      try {
        const res = await authFetch(`/api/v1/director/sessions/${activeSession.id}/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            forceRefresh: shouldForceRefresh,
            language: normalizedLanguage,
            subtitleMode,
            subtitleTargetLanguage:
              subtitleMode === 'translate' ? normalizedSubtitleTargetLanguage : undefined,
          }),
        });
        const data = (await res.json()) as {
          success: boolean;
          data?: TranscribeJob;
          error?: { message?: string };
        };

        if (res.ok && data.success && data.data) {
          applyTranscribeJobState(data.data, {
            setTranscribeJob,
            setTranscribeLanguage,
            setSubtitleMode,
            setSubtitleTargetLanguage,
          });
          setError(null);
          return true;
        }

        const message = data.error?.message || 'Gagal memulai transkripsi';
        setError(message);
        return false;
      } catch (err) {
        logger.error('Transcription start failed', err);
        setError(err instanceof Error ? err.message : 'Gagal memulai transkripsi');
        return false;
      }
    },
    [
      activeSession,
      setError,
      setSubtitleMode,
      setSubtitleTargetLanguage,
      setTranscribeJob,
      subtitleMode,
      subtitleTargetLanguage,
      transcribeLanguage,
      setTranscribeLanguage,
    ],
  );

  useEffect(() => {
    if (!activeSession || selectedClips.length === 0) {
      autoTranscribeSessionRef.current = null;
      return;
    }

    const selectedClipKey = selectedClips
      .map((clip) => `${clip.id}:${clip.candidate.id}`)
      .sort()
      .join('|');
    const normalizedLanguage = normalizeTranscribeLanguage(transcribeLanguage);
    const normalizedTargetLanguage = resolveSubtitleTargetLanguage(subtitleTargetLanguage);
    const sessionKey = [
      activeSession.id,
      selectedClipKey,
      normalizedLanguage,
      subtitleMode,
      subtitleMode === 'translate' ? normalizedTargetLanguage : 'original',
    ].join(':');
    const hasTranscript = selectedClips.every((clip) => clip.transcript?.segments?.length);
    const isBusy = transcribeJob?.status === 'PENDING' || transcribeJob?.status === 'PROCESSING';

    if (hasTranscript) {
      autoTranscribeSessionRef.current = sessionKey;
      return;
    }

    if (isBusy) {
      return;
    }

    if (autoTranscribeSessionRef.current === sessionKey) {
      return;
    }

    autoTranscribeSessionRef.current = sessionKey;
    void handleStartTranscribe().then((started) => {
      if (!started && autoTranscribeSessionRef.current === sessionKey) {
        autoTranscribeSessionRef.current = null;
      }
    });
  }, [
    activeSession,
    handleStartTranscribe,
    selectedClips,
    subtitleMode,
    subtitleTargetLanguage,
    transcribeJob?.status,
    transcribeLanguage,
  ]);

  return {
    pollTranscriptionStatus,
    handleStartTranscribe,
  };
}

function EditingStepAlerts({
  error,
  hasMultipleSelectedClips,
}: {
  error: string | null;
  hasMultipleSelectedClips: boolean;
}) {
  return (
    <>
      {error && (
        <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-4 py-3 rounded-2xl text-sm border border-rose-500/20">
          <AlertCircle size={18} className="shrink-0" />
          <span className="font-semibold text-left">{error}</span>
        </div>
      )}

      {hasMultipleSelectedClips ? (
        <div className="flex items-start gap-2 text-amber-500 bg-amber-500/10 px-4 py-3 rounded-2xl text-sm border border-amber-500/20">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span className="font-medium text-left">
            Sistem edit sekarang fokus 1 short per sesi. Clip pertama dipakai sebagai short aktif.
          </span>
        </div>
      ) : null}
    </>
  );
}

export const EditingStep = () => {
  const { user, subscription } = useAuthStore();
  const {
    activeSession,
    selectedClips,
    setSelectedClips,
    refineSettings,
    subtitleStyle,
    updateSubtitleStyle,
    updateRefineSetting,
    setRefineSettings,
    exportSettings,
    transcribeJob,
    transcribeLanguage,
    subtitleMode,
    subtitleTargetLanguage,
    setSubtitleMode,
    setSubtitleTargetLanguage,
    setStep,
    error,
    setError,
  } = useDirectorStore();

  const {
    subtitleSaveState,
    transcriptSaveState,
    saveTranscriptSegments,
    saveSubtitleStyle,
    handleRetryTranscriptSave,
  } = useDirectorSaveStates(activeSession, subtitleStyle);
  const isTranscribing = shouldPollTranscribeStatus(transcribeJob?.status);
  const transcribeProgressMeta = getTranscribeProgressMeta(transcribeJob);
  const primaryClip = selectedClips[0];
  const hasMultipleSelectedClips = selectedClips.length > 1;
  const effectiveExportSettings = useMemo(
    () =>
      resolveDirectorEffectiveExportSettings(exportSettings, {
        role: user?.role,
        tier: subscription?.tier,
      }),
    [exportSettings, subscription?.tier, user?.role],
  );
  const subtitleTargetLanguageSelectValue = resolveSubtitleTargetLanguage(subtitleTargetLanguage);
  const isSavingBeforePreview = subtitleSaveState === 'saving' || transcriptSaveState === 'saving';
  const hasSaveErrorBeforePreview =
    subtitleSaveState === 'error' || transcriptSaveState === 'error';
  const previewDownloadButtonLabel = getPreviewDownloadButtonLabel({
    hasSaveErrorBeforePreview,
    isSavingBeforePreview,
  });
  const subtitleStatusState = getSubtitleStatusState({
    isTranscribing,
    subtitleSaveState,
    transcribeFailed: transcribeJob?.status === 'FAILED',
    transcribePhase: transcribeProgressMeta?.phase,
  });

  const refreshSelectedClips = useCallback(async () => {
    if (!activeSession) {
      return;
    }

    try {
      const clipsRes = await authFetch(`/api/v1/director/sessions/${activeSession.id}/clips`);
      const clipsData = await clipsRes.json();

      if (clipsData.success) {
        setSelectedClips(clipsData.data);
      }
    } catch (error) {
      logger.error('Load clips error', error);
    }
  }, [activeSession, setSelectedClips]);

  const { pollTranscriptionStatus, handleStartTranscribe } = useDirectorTranscribe(
    activeSession,
    selectedClips,
    transcribeLanguage,
    subtitleMode,
    subtitleTargetLanguage,
    transcribeJob,
    refreshSelectedClips,
  );

  const handleUpdateTranscript = async (clipId: string, segments: TranscriptSegment[]) => {
    if (!activeSession) return;
    const nextClips = selectedClips.map((clip) => {
      if (clip.id === clipId && clip.transcript) {
        return {
          ...clip,
          transcript: {
            ...clip.transcript,
            segments,
          },
        };
      }
      return clip;
    });
    setSelectedClips(nextClips);

    void saveTranscriptSegments(clipId, segments);
  };

  const handleRemoveClip = async (clipId: string): Promise<void> => {
    if (!activeSession) {
      return;
    }

    try {
      const response = await authFetch(
        `/api/v1/director/sessions/${activeSession.id}/clips/${clipId}`,
        {
          method: 'DELETE',
        },
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Gagal menghapus klip');
      }

      const nextClips = selectedClips.filter((clip) => clip.id !== clipId);
      setSelectedClips(nextClips);

      if (data.data.remainingCount === 0 || nextClips.length === 0) {
        setStep('PICKING');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal menghapus klip');
    }
  };

  const handleUpdateRefineToggle = useCallback(
    (key: 'faceTracking' | 'removeSilence' | 'optimizeHook' | 'stabilize', value: boolean) => {
      if (!primaryClip) {
        return;
      }

      updateRefineSetting(primaryClip.id, key, value);
    },
    [primaryClip, updateRefineSetting],
  );

  const handleApplyContentMode = useCallback(
    (mode: ContentMode) => {
      if (!primaryClip) {
        return;
      }

      setRefineSettings({
        ...refineSettings,
        [primaryClip.id]: applyContentModePreset(primaryClip.candidate, mode),
      });
    },
    [primaryClip, refineSettings, setRefineSettings],
  );

  useEffect(() => {
    if (!activeSession || !shouldPollTranscribeStatus(transcribeJob?.status)) {
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const tick = async () => {
      const shouldStop = await pollTranscriptionStatus();

      if (cancelled || shouldStop) {
        if (intervalId) globalThis.clearInterval(intervalId);
      }
    };

    intervalId = globalThis.setInterval(() => {
      void tick();
    }, 3000);

    void tick();

    return () => {
      cancelled = true;
      if (intervalId) globalThis.clearInterval(intervalId);
    };
  }, [activeSession, transcribeJob?.status, pollTranscriptionStatus]);

  useEffect(() => {
    if (activeSession && selectedClips.length === 0) {
      void refreshSelectedClips();
    }
  }, [activeSession, selectedClips.length, refreshSelectedClips]);

  const subtitleStatusRetry = resolveSubtitleStatusRetry({
    handleRetrySubtitleSave: () => {
      void saveSubtitleStyle();
    },
    handleRetryTranscribe: () => {
      void handleStartTranscribe({ forceRefresh: true });
    },
    subtitleSaveState,
    transcribeFailed: transcribeJob?.status === 'FAILED',
  });

  return (
    <div className="relative mx-auto w-full max-w-380 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col xl:flex-row gap-7 xl:gap-9 items-start">
      <div className="min-w-0 flex-1 bg-card/70 rounded-4xl border border-border/50 backdrop-blur-xl p-5 sm:p-7 xl:p-8 flex flex-col gap-5 relative pb-0">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-foreground">
              Subtitle
            </h3>
          </div>

          <div className="relative flex w-full flex-col gap-2 rounded-2xl border border-border/40 bg-card p-2 shadow-sm">
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border/20 bg-muted/25 p-1.5">
              <button
                type="button"
                onClick={() => setSubtitleMode('original')}
                className={cn(
                  'rounded-lg border px-2 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] transition-all',
                  subtitleMode === 'original'
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                )}
              >
                Bahasa Asli
              </button>
              <button
                type="button"
                onClick={() => setSubtitleMode('translate')}
                className={cn(
                  'rounded-lg border px-2 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] transition-all',
                  subtitleMode === 'translate'
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                )}
              >
                Terjemahkan
              </button>
            </div>

            {subtitleMode === 'original' ? (
              <div className="flex items-center justify-between gap-3 h-[52px] border rounded-xl px-3 border-border/20 bg-muted/15">
                <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
                  Sumber
                </span>
                <span className="text-[11px] font-semibold tracking-wide text-foreground">
                  {formatTranscribeLanguageLabel(transcribeLanguage)}
                </span>
              </div>
            ) : null}

            {subtitleMode === 'translate' ? (
              <div className="flex items-center justify-between gap-3 h-[52px] border rounded-xl px-3 border-border/20 bg-muted/15">
                <label
                  htmlFor="subtitle-target-language"
                  className="shrink-0 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70"
                >
                  Tujuan
                </label>
                <Select
                  value={subtitleTargetLanguageSelectValue}
                  onValueChange={(value) => {
                    setSubtitleTargetLanguage(value);
                  }}
                >
                  <SelectTrigger
                    id="subtitle-target-language"
                    className="h-8 w-full min-w-0 rounded-lg border-border/50 bg-card/50 px-2.5 text-[11px] font-semibold tracking-wide"
                  >
                    <SelectValue placeholder="Pilih bahasa" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-xs">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <Button
              size="sm"
              variant="secondary"
              className="h-9 w-full rounded-xl border-primary/20 font-bold shadow-sm transition-all hover:bg-primary/5 disabled:opacity-80"
              onClick={() => {
                void handleStartTranscribe({ forceRefresh: true });
              }}
              disabled={isTranscribing}
            >
              {isTranscribing ? (
                <Loader2 size={14} className="mr-1.5 animate-spin text-primary" />
              ) : (
                <Zap size={14} className="mr-1.5 text-primary" />
              )}
              {isTranscribing ? 'Mentranskripsi...' : 'Transkripsi Ulang'}
            </Button>
          </div>

          <div className="min-h-10" aria-live="polite">
            {subtitleStatusState ? (
              <div
                className={cn(
                  'flex min-h-10 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold',
                  getSubtitleStatusClass(subtitleStatusState.tone),
                )}
              >
                <span className="min-w-0 flex items-center truncate">
                  {subtitleStatusState.label}
                  {isTranscribing && (
                    <Loader2
                      size={12}
                      className="ml-1.5 animate-spin text-muted-foreground/60 shrink-0"
                    />
                  )}
                </span>
                {subtitleStatusRetry ? (
                  <button
                    type="button"
                    onClick={subtitleStatusRetry}
                    className="shrink-0 font-black text-primary hover:text-primary/80"
                  >
                    Coba lagi
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <EditingStepAlerts error={error} hasMultipleSelectedClips={hasMultipleSelectedClips} />

        {activeSession && primaryClip ? (
          <SelectedClipCard
            key={primaryClip.id}
            sessionId={activeSession.id}
            clip={primaryClip}
            index={0}
            onRemoveClip={handleRemoveClip}
            onUpdateTranscript={handleUpdateTranscript}
            subtitleStyle={subtitleStyle}
            transcriptSaveState={transcriptSaveState}
            onRetryTranscriptSave={handleRetryTranscriptSave}
            isTranscribing={isTranscribing}
          />
        ) : null}

        <div className="pointer-events-none sticky bottom-3 z-20 mt-3 flex justify-center py-2 sm:bottom-5">
          <div className="rounded-[1.35rem] border border-border/60 bg-background/85 p-2 shadow-2xl shadow-black/35 backdrop-blur-xl ring-1 ring-white/5">
            <Button
              type="button"
              onClick={() => setStep('EXPORTING')}
              disabled={
                !primaryClip || isSavingBeforePreview || hasSaveErrorBeforePreview || isTranscribing
              }
              className="pointer-events-auto h-12 min-w-56 rounded-2xl px-6 text-sm font-black shadow-primary/15"
            >
              {previewDownloadButtonLabel}
            </Button>
          </div>
        </div>
      </div>

      <EditingSidebar
        exportSettings={effectiveExportSettings}
        subtitleStyle={subtitleStyle}
        selectedClips={selectedClips}
        refineSettings={refineSettings}
        onUpdateSubtitleStyle={updateSubtitleStyle}
        onUpdateRefineSetting={handleUpdateRefineToggle}
        onApplyContentMode={handleApplyContentMode}
        isTranscribing={isTranscribing}
      />
    </div>
  );
};
