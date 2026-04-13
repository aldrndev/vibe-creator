import { AlertCircle, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StepIndicator } from '@/components/director/StepIndicator';
import { AnalyzeStep } from '@/components/director/steps/AnalyzeStep';
import { EditingStep } from '@/components/director/steps/EditingStep';
import { ImportStep } from '@/components/director/steps/ImportStep';
import { PickingStep } from '@/components/director/steps/PickingStep';
import { resolveHydratedStep } from '@/pages/tools/ai-director-page-utils';
import { authFetch } from '@/services/api';
import type {
  Candidate,
  DirectorSession,
  DirectorStep,
  ExportJob,
  SelectedClip,
  SubtitleStyle,
  TranscribeLanguage,
} from '@/stores/director-store';
import { useDirectorStore } from '@/stores/director-store';

const INITIAL_UPLOAD_PROGRESS = 0;

interface DirectorSessionPayload extends DirectorSession {
  analysisJob?: {
    status: string;
    candidates?: Candidate[];
  } | null;
  selectedClips?: SelectedClip[];
  transcribeJob?: {
    status: string;
    language?: TranscribeLanguage;
    [key: string]: unknown;
  } | null;
  exportJob?: (ExportJob & { status: string }) | null;
  subtitleStyle?: SubtitleStyle | null;
}

interface HydrationActions {
  readonly setSession: (session: DirectorSession | null) => void;
  readonly setCandidates: (candidates: Candidate[]) => void;
  readonly setSelectedClips: (clips: SelectedClip[]) => void;
  readonly setTranscribeJob: (job: { status: string } | null) => void;
  readonly setTranscribeLanguage: (language: TranscribeLanguage) => void;
  readonly updateSubtitleStyle: (style: Partial<SubtitleStyle>) => void;
  readonly setExportJob: (job: ExportJob | null) => void;
  readonly setWaitingForAsset: (waiting: boolean) => void;
  readonly setDownloadProgress: (progress: number) => void;
  readonly setStep: (step: DirectorStep) => void;
}

function resolveTranscribeLanguage(
  language: unknown,
  fallback: TranscribeLanguage = 'mixed',
): TranscribeLanguage {
  if (language === 'id' || language === 'en' || language === 'mixed') {
    return language;
  }

  return fallback;
}

function getExportDownloadUrl(
  sessionId: string,
  exportJob: DirectorSessionPayload['exportJob'],
): string | null {
  if (exportJob?.status !== 'COMPLETED') {
    return null;
  }

  return `/api/v1/director/sessions/${sessionId}/export/download`;
}

function getAssetDownloadProgress(session: DirectorSessionPayload): number {
  const ingestStatus = session.asset?.ingestStatus;

  if (ingestStatus === 'READY') {
    return 100;
  }

  if (ingestStatus === 'UPLOADING') {
    return INITIAL_UPLOAD_PROGRESS;
  }

  return 0;
}

function applyHydratedSession(
  session: DirectorSessionPayload,
  {
    setSession,
    setCandidates,
    setSelectedClips,
    setTranscribeJob,
    setTranscribeLanguage,
    updateSubtitleStyle,
    setExportJob,
    setWaitingForAsset,
    setDownloadProgress,
    setStep,
  }: HydrationActions,
): void {
  setSession(session);
  setCandidates(session.analysisJob?.candidates ?? []);
  setSelectedClips(session.selectedClips ?? []);
  setTranscribeJob(session.transcribeJob ?? null);
  setTranscribeLanguage(resolveTranscribeLanguage(session.transcribeJob?.language));

  if (session.subtitleStyle) {
    updateSubtitleStyle(session.subtitleStyle);
  }

  setExportJob(
    session.exportJob
      ? {
          ...session.exportJob,
          outputUrl: getExportDownloadUrl(session.id, session.exportJob),
        }
      : null,
  );
  setWaitingForAsset(session.asset?.ingestStatus === 'UPLOADING');
  setDownloadProgress(getAssetDownloadProgress(session));
  setStep(resolveHydratedStep(session));
}

export function AiDirectorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isHydrating, setIsHydrating] = useState(Boolean(searchParams.get('session')));
  const {
    activeSession,
    step,
    setSession,
    setStep,
    setCandidates,
    setSelectedClips,
    setTranscribeJob,
    setTranscribeLanguage,
    setExportJob,
    updateSubtitleStyle,
    setError,
    setWaitingForAsset,
    setDownloadProgress,
    error,
    reset,
  } = useDirectorStore();

  const sessionParam = searchParams.get('session');
  const activeSessionId = activeSession?.id ?? null;
  const hasActiveSession = activeSession !== null;

  useEffect(() => {
    if (!sessionParam || activeSessionId === sessionParam) {
      setIsHydrating(false);
      return;
    }

    let cancelled = false;

    const hydrateSession = async () => {
      try {
        const response = await authFetch(`/api/v1/director/sessions/${sessionParam}`);
        const data = (await response.json()) as {
          success: boolean;
          data?: DirectorSessionPayload;
          error?: { message?: string };
        };

        if (!data.success || !data.data || cancelled) {
          throw new Error(data.error?.message || 'Sesi AI Director tidak ditemukan');
        }

        applyHydratedSession(data.data, {
          setSession,
          setCandidates,
          setSelectedClips,
          setTranscribeJob,
          setTranscribeLanguage,
          updateSubtitleStyle,
          setExportJob,
          setWaitingForAsset,
          setDownloadProgress,
          setStep,
        });
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : 'Gagal memulihkan sesi AI Director');
        }
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    };

    void hydrateSession();

    return () => {
      cancelled = true;
    };
  }, [
    activeSessionId,
    sessionParam,
    setCandidates,
    setDownloadProgress,
    setError,
    setExportJob,
    setSelectedClips,
    setSession,
    setStep,
    setTranscribeJob,
    setTranscribeLanguage,
    updateSubtitleStyle,
    setWaitingForAsset,
  ]);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (activeSessionId && sessionParam !== activeSessionId) {
      nextSearchParams.set('session', activeSessionId);
      setSearchParams(nextSearchParams, { replace: true });
      return;
    }

    if (!hasActiveSession && sessionParam && !isHydrating) {
      nextSearchParams.delete('session');
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [activeSessionId, hasActiveSession, isHydrating, searchParams, sessionParam, setSearchParams]);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-sans pb-32">
      <div className="max-w-400 mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4 mb-2">
          {hasActiveSession ? (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setSearchParams({}, { replace: true });
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary transition-all shrink-0 shadow-sm"
              >
                <Plus size={16} strokeWidth={3} className="shrink-0" />
                Buat Baru
              </button>
            </div>
          ) : null}

          <div className="w-full overflow-x-auto hide-scrollbar">
            <StepIndicator />
          </div>
        </div>

        {error && step !== 'IMPORT' && step !== 'EDITING' ? (
          <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-4 py-3 rounded-2xl text-sm border border-rose-500/20">
            <AlertCircle size={18} className="shrink-0" />
            <span className="font-semibold text-left">{error}</span>
          </div>
        ) : null}

        {/* Content */}
        <div className="min-h-100 flex items-center justify-center">
          {step === 'IMPORT' && <ImportStep />}
          {step === 'ANALYZING' && <AnalyzeStep />}
          {step === 'PICKING' && <PickingStep />}
          {step === 'EDITING' && <EditingStep />}
          {step === 'PUBLISH_COPY' && <EditingStep />}
          {step === 'EXPORTING' && <EditingStep />}
          {step === 'COMPLETED' && <EditingStep />}
        </div>
      </div>
    </div>
  );
}
