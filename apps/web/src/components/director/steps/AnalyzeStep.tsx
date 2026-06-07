import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileVideo,
  Link2,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, CardBody } from '@/components/ui';
import { logger } from '@/lib/logger';
import { authFetch } from '@/services/api';
import type { Candidate } from '@/stores/director-store';
import { useDirectorStore } from '@/stores/director-store';

const analysisPhases = [
  'Membaca video',
  'Mencari hook kuat',
  'Menilai momen terbaik',
  'Menyiapkan kandidat short',
] as const;

const fallbackTargetDurationOption = {
  label: 'Otomatis',
  helper: 'Dipilih dari momen paling utuh',
} as const;

interface AnalyzeStepProps {
  readonly onStartNew?: () => void;
}

interface AnalyzeJob {
  readonly status?: string;
  readonly candidates?: Candidate[];
  readonly errorMessage?: string;
}

interface AnalyzeResponseEnvelope {
  readonly success?: boolean;
  readonly data?: AnalyzeJob;
}

async function fetchAnalyzeJob(sessionId: string): Promise<AnalyzeJob | null> {
  const res = await authFetch(`/api/v1/director/sessions/${sessionId}/analyze`);
  const data = (await res.json()) as AnalyzeResponseEnvelope;

  if (!data.success || !data.data) {
    return null;
  }

  return data.data;
}

function getSourceLabel(origin?: 'UPLOAD' | 'URL_IMPORT'): string {
  if (origin === 'URL_IMPORT') {
    return 'Import URL';
  }

  return 'Upload file';
}

function getPhaseIcon(isCompleted: boolean, isActive: boolean) {
  if (isCompleted) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }

  if (isActive) {
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  }

  return <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />;
}

function getPhaseTextClass(isCompleted: boolean, isActive: boolean): string {
  if (isActive || isCompleted) {
    return 'text-foreground';
  }

  return 'text-muted-foreground';
}

export const AnalyzeStep = ({ onStartNew }: AnalyzeStepProps) => {
  const { activeSession, setStep, setCandidates, setLoading, setError, error, reset } =
    useDirectorStore();
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const pollFailureCountRef = useRef(0);

  const handleCompletedJob = useCallback(
    (job: AnalyzeJob) => {
      if (job.candidates) {
        setCandidates(job.candidates);
      }
      setStep('PICKING');
      setLoading(false);
    },
    [setCandidates, setLoading, setStep],
  );

  const handleFailedJob = useCallback(
    (job: AnalyzeJob) => {
      setError(job.errorMessage || 'Analisis gagal diproses. Coba lagi dari sesi ini.');
      setLoading(false);
    },
    [setError, setLoading],
  );

  const handlePollFailure = useCallback(
    (pollError: unknown) => {
      logger.error('Polling error', pollError);
      pollFailureCountRef.current += 1;

      if (pollFailureCountRef.current >= 3) {
        setError('Koneksi ke proses analisis terputus. Coba lagi dalam beberapa saat.');
        setLoading(false);
      }
    },
    [setError, setLoading],
  );

  const pollAnalyzeJob = useCallback(
    async (sessionId: string) => {
      try {
        const job = await fetchAnalyzeJob(sessionId);
        pollFailureCountRef.current = 0;

        if (!job) {
          return;
        }

        if (job.status === 'COMPLETED') {
          handleCompletedJob(job);
          return;
        }

        if (job.status === 'FAILED') {
          handleFailedJob(job);
        }
      } catch (pollError) {
        handlePollFailure(pollError);
      }
    },
    [handleCompletedJob, handleFailedJob, handlePollFailure],
  );

  useEffect(() => {
    if (!activeSession) return;

    const phaseInterval = globalThis.setInterval(() => {
      setActivePhaseIndex((current) => Math.min(current + 1, analysisPhases.length - 1));
    }, 3500);

    const pollInterval = globalThis.setInterval(() => {
      void pollAnalyzeJob(activeSession.id);
    }, 2000);

    return () => {
      globalThis.clearInterval(pollInterval);
      globalThis.clearInterval(phaseInterval);
    };
  }, [activeSession, pollAnalyzeJob]);

  const handleRetryAnalysis = async () => {
    if (!activeSession) {
      return;
    }

    try {
      setIsRetrying(true);
      setError(null);
      setLoading(true);
      setActivePhaseIndex(0);
      pollFailureCountRef.current = 0;

      const response = await authFetch(`/api/v1/director/sessions/${activeSession.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDurationRange: 'auto' }),
      });

      if (!response.ok) {
        throw new Error('Gagal memulai ulang analisis');
      }
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Gagal memulai ulang analisis');
      setLoading(false);
    } finally {
      setIsRetrying(false);
    }
  };

  const hasAnalysisError = Boolean(error);
  const isUrlSource = activeSession?.asset?.origin === 'URL_IMPORT';
  const SourceIcon = isUrlSource ? Link2 : FileVideo;

  return (
    <div className="mx-auto w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="relative overflow-hidden border-border/50 bg-card/70 backdrop-blur-xl">
        <CardBody className="p-5 sm:p-7">
          <div className="flex flex-col gap-4 border-b border-border/45 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                  Analisis AI
                </p>
                <h2 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
                  Mencari momen terbaik
                </h2>
              </div>
            </div>

            {onStartNew ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full rounded-2xl sm:w-auto"
                onClick={onStartNew}
              >
                <RotateCcw size={15} className="mr-2" />
                Buat Baru
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 py-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/45 bg-background/35 px-4 py-3 text-left">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <SourceIcon className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.16em]">Sumber</span>
              </div>
              <p className="text-sm font-black text-foreground">
                {getSourceLabel(activeSession?.asset?.origin)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/45 bg-background/35 px-4 py-3 text-left">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.16em]">
                  Durasi Short
                </span>
              </div>
              <p className="text-sm font-black text-foreground">
                {fallbackTargetDurationOption.label}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                {fallbackTargetDurationOption.helper}
              </p>
            </div>
            <div className="rounded-2xl border border-border/45 bg-background/35 px-4 py-3 text-left">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.16em]">Status</span>
              </div>
              <p className="text-sm font-black text-foreground">Sedang diproses</p>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">30-60 detik</p>
            </div>
          </div>

          <div className="mx-auto max-w-xl space-y-3 text-center">
            <p className="text-base font-semibold leading-relaxed text-muted-foreground">
              AI Director sedang membaca konten, mencari hook kuat, lalu menyusun kandidat Short
              yang paling layak kamu edit.
            </p>
          </div>

          <div className="mx-auto mt-6 w-full max-w-xl rounded-3xl border border-border/50 bg-muted/10 p-4 text-left">
            <div className="space-y-2">
              {analysisPhases.map((phase, index) => {
                const isCompleted = index < activePhaseIndex;
                const isActive = index === activePhaseIndex && !hasAnalysisError;
                return (
                  <div
                    key={phase}
                    className="flex items-center gap-3 rounded-2xl border border-border/35 bg-card/35 px-3 py-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background">
                      {getPhaseIcon(isCompleted, isActive)}
                    </div>
                    <span
                      className={`text-sm font-bold ${getPhaseTextClass(isCompleted, isActive)}`}
                    >
                      {phase}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {hasAnalysisError ? (
            <div className="mx-auto mt-5 w-full max-w-xl rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-sm font-black text-rose-500">Analisis belum berhasil</p>
                    <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">
                      {error}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      size="sm"
                      className="rounded-xl"
                      isLoading={isRetrying}
                      onClick={() => {
                        void handleRetryAnalysis();
                      }}
                    >
                      <RotateCcw size={14} className="mr-2" />
                      Coba Lagi
                    </Button>
                    <Button size="sm" variant="secondary" className="rounded-xl" onClick={reset}>
                      Mulai Baru
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <p className="mt-6 text-center text-xs font-semibold leading-5 text-muted-foreground">
            Biasanya selesai dalam 30-60 detik. Tetap di halaman ini sampai kandidat muncul.
          </p>
        </CardBody>
      </Card>
    </div>
  );
};
