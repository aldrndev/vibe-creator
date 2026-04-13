import { AlertCircle, Wand2, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import {
  getTranscribePhaseLabel,
  getTranscribeProgressMeta,
  shouldPollTranscribeStatus,
} from '@/components/director/steps/director-step-utils';
import { EditingSidebar } from '@/components/director/steps/editing-sidebar';
import { SelectedClipCard } from '@/components/director/steps/selected-clip-card';
import { Button } from '@/components/ui';
import { applyContentModePreset, type ContentMode } from '@/lib/director-refine-settings';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { authFetch } from '@/services/api';
import { useDirectorStore } from '@/stores/director-store';

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
      if (
        jobData.data.language === 'id' ||
        jobData.data.language === 'en' ||
        jobData.data.language === 'mixed'
      ) {
        setTranscribeLanguage(jobData.data.language);
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
  }, [activeSession, refreshSelectedClips, setError, setTranscribeJob, setTranscribeLanguage]);

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

      try {
        const res = await authFetch(`/api/v1/director/sessions/${activeSession.id}/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            forceRefresh: shouldForceRefresh,
            language: transcribeLanguage,
          }),
        });
        const data = (await res.json()) as {
          success: boolean;
          data?: { status: string; language?: 'id' | 'en' | 'mixed' };
          error?: { message?: string };
        };

        if (res.ok && data.success && data.data) {
          setTranscribeJob(data.data);
          if (
            data.data.language === 'id' ||
            data.data.language === 'en' ||
            data.data.language === 'mixed'
          ) {
            setTranscribeLanguage(data.data.language);
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
    [activeSession, setError, setTranscribeJob, transcribeLanguage, setTranscribeLanguage],
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <h3 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-br from-primary via-orange-500 to-rose-600">
              Video Studio
            </h3>
            <p className="mt-2 max-w-2xl text-muted-foreground text-sm leading-6 font-medium">
              Short sudah siap pakai. Tinggal rapikan transkrip dan atur gaya video sampai siap
              publish.
            </p>
            {transcribeProgressMeta ? (
              <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                {getTranscribePhaseLabel(transcribeProgressMeta.phase)}
              </p>
            ) : null}
            <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-primary/80">
              Bahasa Transkrip:{' '}
              {transcribeLanguage === 'en'
                ? 'English'
                : transcribeLanguage === 'mixed'
                  ? 'Campuran (Auto)'
                  : 'Indonesia'}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full font-bold px-6 border-primary/20 hover:bg-primary/5"
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
              activeSession={activeSession}
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
