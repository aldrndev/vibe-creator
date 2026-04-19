import { AlertCircle, Wand2, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import {
  getTranscribePhaseLabel,
  getTranscribeProgressMeta,
  shouldPollTranscribeStatus,
} from '@/components/director/steps/director-step-utils';
import { EditingSidebar } from '@/components/director/steps/editing-sidebar';
import { SelectedClipCard } from '@/components/director/steps/selected-clip-card';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { applyContentModePreset, type ContentMode } from '@/lib/director-refine-settings';
import { logger } from '@/lib/logger';
import {
  COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS,
  formatTranscribeLanguageLabel,
  normalizeTranscribeLanguage,
} from '@/lib/transcribe-language';
import { cn } from '@/lib/utils';
import { authFetch } from '@/services/api';
import { useDirectorStore } from '@/stores/director-store';

const DEFAULT_SUBTITLE_TARGET_LANGUAGE = 'en';

function resolveSubtitleTargetLanguage(value: unknown): string {
  const normalized = normalizeTranscribeLanguage(value, DEFAULT_SUBTITLE_TARGET_LANGUAGE);
  const isSupported = COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS.some(
    (option) => option.value === normalized,
  );
  return isSupported ? normalized : DEFAULT_SUBTITLE_TARGET_LANGUAGE;
}

export const EditingStep = () => {
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
    setTranscribeJob,
    transcribeLanguage,
    setTranscribeLanguage,
    subtitleMode,
    subtitleTargetLanguage,
    setSubtitleMode,
    setSubtitleTargetLanguage,
    setStep,
    error,
    setError,
  } = useDirectorStore();
  const autoTranscribeSessionRef = useRef<string | null>(null);
  const subtitleSyncKeyRef = useRef<string | null>(null);
  const isTranscribing = shouldPollTranscribeStatus(transcribeJob?.status);
  const transcribeProgressMeta = getTranscribeProgressMeta(transcribeJob);
  const primaryClip = selectedClips[0];
  const hasMultipleSelectedClips = selectedClips.length > 1;
  const subtitleTargetLanguageSelectValue = resolveSubtitleTargetLanguage(subtitleTargetLanguage);

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
      setTranscribeJob(jobData.data);
      if (typeof jobData.data.language === 'string' && jobData.data.language.trim().length > 0) {
        setTranscribeLanguage(normalizeTranscribeLanguage(jobData.data.language));
      }
      const resolvedSubtitleMode =
        jobData.data.subtitleMode ?? jobData.data.progressMeta?.subtitleMode;
      if (resolvedSubtitleMode === 'original' || resolvedSubtitleMode === 'translate') {
        setSubtitleMode(resolvedSubtitleMode);
      }
      const resolvedSubtitleTargetLanguage =
        jobData.data.subtitleTargetLanguage ?? jobData.data.progressMeta?.subtitleTargetLanguage;
      if (
        typeof resolvedSubtitleTargetLanguage === 'string' &&
        resolvedSubtitleTargetLanguage.trim().length > 0
      ) {
        setSubtitleTargetLanguage(resolveSubtitleTargetLanguage(resolvedSubtitleTargetLanguage));
      }

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
          data?: {
            status: string;
            language?: string;
            subtitleMode?: 'original' | 'translate';
            subtitleTargetLanguage?: string | null;
            progressMeta?: {
              subtitleMode?: 'original' | 'translate';
              subtitleTargetLanguage?: string | null;
            } | null;
          };
          error?: { message?: string };
        };

        if (res.ok && data.success && data.data) {
          setTranscribeJob(data.data);
          if (typeof data.data.language === 'string' && data.data.language.trim().length > 0) {
            setTranscribeLanguage(normalizeTranscribeLanguage(data.data.language));
          }
          const responseSubtitleMode =
            data.data.subtitleMode ?? data.data.progressMeta?.subtitleMode;
          if (responseSubtitleMode === 'original' || responseSubtitleMode === 'translate') {
            setSubtitleMode(responseSubtitleMode);
          }
          const responseSubtitleTargetLanguage =
            data.data.subtitleTargetLanguage ?? data.data.progressMeta?.subtitleTargetLanguage;
          if (
            typeof responseSubtitleTargetLanguage === 'string' &&
            responseSubtitleTargetLanguage.trim().length > 0
          ) {
            setSubtitleTargetLanguage(
              resolveSubtitleTargetLanguage(responseSubtitleTargetLanguage),
            );
          }
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

    const sessionKey = activeSession.id;
    const hasTranscript = selectedClips.some((clip) => clip.transcript?.segments?.length);
    const isBusy = transcribeJob?.status === 'PENDING' || transcribeJob?.status === 'PROCESSING';

    if (hasTranscript || isBusy) {
      autoTranscribeSessionRef.current = sessionKey;
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
  }, [activeSession, handleStartTranscribe, selectedClips, transcribeJob?.status]);

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

    if (subtitleSyncKeyRef.current === serializedStyle) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      void authFetch(`/api/v1/director/sessions/${activeSession.id}/subtitle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subtitleStyle),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Update subtitle style failed: ${response.status}`);
          }
          subtitleSyncKeyRef.current = serializedStyle;
        })
        .catch((error) => {
          logger.error('Update subtitle style failed', error);
        });
    }, 300);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [activeSession, subtitleStyle]);

  const handleUpdateTranscript = async (
    clipId: string,
    segments: Array<{ startMs: number; endMs: number; text: string }>,
  ) => {
    if (!activeSession) return;
    try {
      // Optimistic update
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

      await authFetch(`/api/v1/director/sessions/${activeSession.id}/clips/${clipId}/transcript`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments }),
      });
    } catch (error) {
      logger.error('Update transcript failed', error);
    }
  };

  const handleRemoveClip = async (clipId: string) => {
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

  return (
    <div className="relative mx-auto w-full max-w-[1520px] animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col xl:flex-row gap-8 xl:gap-10 items-start">
      {isTranscribing ? (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center bg-background/35 px-4 backdrop-blur-sm"
          aria-live="polite"
        >
          <div className="w-full max-w-sm rounded-[2.5rem] border border-primary/20 bg-card/95 p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-4xl border border-primary/30 bg-primary/10 shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-tr from-transparent via-primary/20 to-transparent animate-[shimmer_2s_infinite]" />
              <Wand2 size={32} className="text-primary animate-pulse relative z-10" />
            </div>
            <h4 className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-r from-primary via-orange-500 to-rose-600">
              AI Sedang Bekerja
            </h4>
            <p className="mt-3 text-sm leading-6 text-muted-foreground font-medium">
              Menganalisis audio dan membuat teks otomatis untuk klip Anda...
            </p>
            <div className="mt-6 inline-flex items-center justify-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                {getTranscribePhaseLabel(transcribeProgressMeta?.phase) || 'Memulai Transkripsi'}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-w-0 flex-1 bg-card/70 rounded-[2.5rem] border border-border/50 backdrop-blur-xl p-6 sm:p-10 xl:p-12 flex flex-col gap-8 relative overflow-hidden group pb-6 lg:pb-8">
        <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] items-stretch">
          <div className="h-full rounded-2xl border border-border/40 bg-background/35 p-5 sm:p-6">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight whitespace-nowrap bg-clip-text text-transparent bg-linear-to-br from-primary via-orange-500 to-rose-600">
              Video Studio
            </h3>
            <p className="mt-2 max-w-xl text-muted-foreground text-sm leading-6 font-medium">
              Short sudah siap pakai.
            </p>
            <div className="mt-5 space-y-2.5">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
                Bahasa Transkrip
              </div>
              <p className="text-base font-semibold text-foreground">
                {formatTranscribeLanguageLabel(transcribeLanguage)}
              </p>
              {transcribeProgressMeta ? (
                <p className="text-xs font-semibold text-muted-foreground">
                  Status: {getTranscribePhaseLabel(transcribeProgressMeta.phase)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="h-full rounded-2xl border border-border/40 bg-background/45 p-3.5 sm:p-4 space-y-3.5">
            <div>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
                Mode Subtitle
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSubtitleMode('original')}
                  className={cn(
                    'rounded-xl border px-2 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition-all',
                    subtitleMode === 'original'
                      ? 'border-primary/35 bg-primary/15 text-primary'
                      : 'border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground',
                  )}
                >
                  Bahasa Asli
                </button>
                <button
                  type="button"
                  onClick={() => setSubtitleMode('translate')}
                  className={cn(
                    'rounded-xl border px-2 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition-all',
                    subtitleMode === 'translate'
                      ? 'border-primary/35 bg-primary/15 text-primary'
                      : 'border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground',
                  )}
                >
                  Terjemahkan
                </button>
              </div>
              {subtitleMode === 'translate' ? (
                <div className="mt-2.5 space-y-1.5">
                  <label
                    htmlFor="subtitle-target-language"
                    className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70"
                  >
                    Bahasa Tujuan
                  </label>
                  <Select
                    value={subtitleTargetLanguageSelectValue}
                    onValueChange={(value) => {
                      setSubtitleTargetLanguage(value);
                    }}
                  >
                    <SelectTrigger
                      id="subtitle-target-language"
                      className="h-9 rounded-xl border-border/50 bg-muted/20 px-3 text-xs font-semibold tracking-wide"
                    >
                      <SelectValue placeholder="Pilih bahasa subtitle" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            <Button
              size="sm"
              variant="secondary"
              className="h-11 w-full rounded-xl border-primary/20 px-6 font-bold hover:bg-primary/5"
              onClick={() => {
                void handleStartTranscribe({ forceRefresh: true });
              }}
              disabled={isTranscribing}
            >
              <Zap
                size={14}
                className={cn('mr-0.5', isTranscribing ? 'animate-pulse' : 'text-primary')}
              />
              {isTranscribing ? 'Mentranskripsi...' : 'Transkripsi Ulang'}
            </Button>
          </div>
        </div>

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

        <div className="space-y-5">
          {activeSession && primaryClip ? (
            <SelectedClipCard
              key={primaryClip.id}
              sessionId={activeSession.id}
              clip={primaryClip}
              index={0}
              onRemoveClip={handleRemoveClip}
              onUpdateTranscript={handleUpdateTranscript}
              subtitleStyle={subtitleStyle}
            />
          ) : null}
        </div>
      </div>

      <EditingSidebar
        activeSession={activeSession}
        exportSettings={exportSettings}
        subtitleStyle={subtitleStyle}
        selectedClips={selectedClips}
        refineSettings={refineSettings}
        onUpdateSubtitleStyle={updateSubtitleStyle}
        onUpdateRefineSetting={handleUpdateRefineToggle}
        onApplyContentMode={handleApplyContentMode}
      />
    </div>
  );
};
