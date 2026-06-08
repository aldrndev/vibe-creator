import { AlertCircle, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StepIndicator } from '@/components/director/StepIndicator';
import { AnalyzeStep } from '@/components/director/steps/AnalyzeStep';
import { EditingStep } from '@/components/director/steps/EditingStep';
import { EditingLivePreview } from '@/components/director/steps/editing-live-preview';
import { ImportStep } from '@/components/director/steps/ImportStep';
import { PickingStep } from '@/components/director/steps/PickingStep';
import { ContinueWorkspaceDialog } from '@/components/workspace/ContinueWorkspaceDialog';
import { useScrollToTopOnChange } from '@/hooks/use-scroll-to-top-on-change';
import {
  clearDirectorInitialContextSearchParams,
  DIRECTOR_INITIAL_CONTEXT_QUERY_KEYS,
  resolveInitialSourceUrl,
  resolveTrendingImportContext,
} from '@/lib/ai-director-trending-context';
import { resolveDirectorEffectiveExportSettings } from '@/lib/director-export-entitlement';
import { useMutableSearchParams } from '@/lib/route-search';
import {
  DEFAULT_TRANSCRIBE_LANGUAGE,
  normalizeTranscribeLanguage,
} from '@/lib/transcribe-language';
import {
  isPlainAiDirectorEntry,
  resolveHydratedStep,
  shouldClearPlainEntrySession,
  shouldSyncActiveSessionToSearch,
} from '@/pages/tools/ai-director-page-utils';
import { authFetch } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import type {
  Candidate,
  DirectorSession,
  DirectorStep,
  ExportJob,
  ExportSettings,
  RefineSettings,
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
    progressMeta?: {
      subtitleMode?: 'original' | 'translate';
      subtitleTargetLanguage?: string | null;
    } | null;
    segments?: {
      subtitleMode?: 'original' | 'translate';
      subtitleTargetLanguage?: string | null;
      [key: string]: unknown;
    } | null;
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
  readonly setSubtitleMode: (mode: 'original' | 'translate') => void;
  readonly setSubtitleTargetLanguage: (language: string) => void;
  readonly updateSubtitleStyle: (style: Partial<SubtitleStyle>) => void;
  readonly setExportJob: (job: ExportJob | null) => void;
  readonly setWaitingForAsset: (waiting: boolean) => void;
  readonly setDownloadProgress: (progress: number) => void;
  readonly setStep: (step: DirectorStep) => void;
}

interface DirectorStepContentProps {
  readonly activeSession: DirectorSession | null;
  readonly exportSettings: ExportSettings;
  readonly initialSourceUrl: string | null;
  readonly initialTopic: string | null;
  readonly isClearingPlainEntrySession: boolean;
  readonly onClearInitialContext: () => void;
  readonly onStartAnalyzeNew: () => void;
  readonly refineSettings: Record<string, RefineSettings>;
  readonly selectedClips: SelectedClip[];
  readonly step: DirectorStep;
  readonly subtitleStyle: SubtitleStyle;
  readonly trendingImportContext: ReturnType<typeof resolveTrendingImportContext>;
}

interface DirectorSessionHydrationParams {
  readonly actions: HydrationActions;
  readonly clearPendingSession: () => void;
  readonly isCancelled: () => boolean;
  readonly reset: () => void;
  readonly sessionId: string;
  readonly setError: (message: string | null) => void;
  readonly setIsHydrating: (hydrating: boolean) => void;
}

interface DirectorSearchSyncAction {
  readonly clearSuppressedPlainSession: boolean;
  readonly nextSearchParams?: URLSearchParams;
}

function resolveTranscribeLanguage(
  language: unknown,
  fallback: TranscribeLanguage = DEFAULT_TRANSCRIBE_LANGUAGE,
): TranscribeLanguage {
  return normalizeTranscribeLanguage(language, fallback);
}

function resolveSubtitleMode(
  transcribeJob: DirectorSessionPayload['transcribeJob'],
): 'original' | 'translate' {
  const modeFromProgress = transcribeJob?.progressMeta?.subtitleMode;
  if (modeFromProgress === 'original' || modeFromProgress === 'translate') {
    return modeFromProgress;
  }

  const modeFromSegments = transcribeJob?.segments?.subtitleMode;
  if (modeFromSegments === 'original' || modeFromSegments === 'translate') {
    return modeFromSegments;
  }

  return 'original';
}

function resolveSubtitleTargetLanguage(
  transcribeJob: DirectorSessionPayload['transcribeJob'],
): string {
  const targetFromProgress = transcribeJob?.progressMeta?.subtitleTargetLanguage;
  if (typeof targetFromProgress === 'string' && targetFromProgress.trim().length > 0) {
    return targetFromProgress.trim().toLowerCase();
  }

  const targetFromSegments = transcribeJob?.segments?.subtitleTargetLanguage;
  if (typeof targetFromSegments === 'string' && targetFromSegments.trim().length > 0) {
    return targetFromSegments.trim().toLowerCase();
  }

  return 'en';
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

async function fetchDirectorSessionPayload(sessionId: string): Promise<DirectorSessionPayload> {
  const response = await authFetch(`/api/v1/director/sessions/${sessionId}`);
  const data = (await response.json()) as {
    success: boolean;
    data?: DirectorSessionPayload;
    error?: { message?: string };
  };

  if (!data.success || !data.data) {
    throw new Error(data.error?.message || 'Sesi AI Director tidak ditemukan');
  }

  return data.data;
}

function applyHydratedSession(
  session: DirectorSessionPayload,
  {
    setSession,
    setCandidates,
    setSelectedClips,
    setTranscribeJob,
    setTranscribeLanguage,
    setSubtitleMode,
    setSubtitleTargetLanguage,
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
  setSubtitleMode(resolveSubtitleMode(session.transcribeJob));
  setSubtitleTargetLanguage(resolveSubtitleTargetLanguage(session.transcribeJob));

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

function resolveDirectorHydrationError(error: unknown): string {
  return error instanceof Error ? error.message : 'Gagal memulihkan sesi AI Director';
}

async function hydrateDirectorSession({
  actions,
  clearPendingSession,
  isCancelled,
  reset,
  sessionId,
  setError,
  setIsHydrating,
}: DirectorSessionHydrationParams): Promise<void> {
  try {
    const session = await fetchDirectorSessionPayload(sessionId);
    if (isCancelled()) {
      return;
    }

    applyHydratedSession(session, actions);
  } catch (error) {
    if (isCancelled()) {
      return;
    }

    reset();
    setError(resolveDirectorHydrationError(error));
  } finally {
    if (!isCancelled()) {
      clearPendingSession();
      setIsHydrating(false);
    }
  }
}

function hasDirectorInitialContextParams(searchParams: URLSearchParams): boolean {
  return DIRECTOR_INITIAL_CONTEXT_QUERY_KEYS.some((key) => searchParams.has(key));
}

function resolveDirectorSearchSyncAction(params: {
  readonly activeSessionId: string | null;
  readonly hasActiveSession: boolean;
  readonly isHydrating: boolean;
  readonly searchParams: URLSearchParams;
  readonly sessionParam: string | null;
  readonly shouldExposeActiveSessionInSearch: boolean;
  readonly step: DirectorStep;
  readonly suppressedPlainEntrySessionId: string | null;
}): DirectorSearchSyncAction {
  const {
    activeSessionId,
    hasActiveSession,
    isHydrating,
    searchParams,
    sessionParam,
    shouldExposeActiveSessionInSearch,
    step,
    suppressedPlainEntrySessionId,
  } = params;

  if (activeSessionId && suppressedPlainEntrySessionId === activeSessionId) {
    return { clearSuppressedPlainSession: false };
  }

  const clearSuppressedPlainSession = activeSessionId === null;
  const nextSearchParams = new URLSearchParams(searchParams);

  if (shouldExposeActiveSessionInSearch && activeSessionId && sessionParam !== activeSessionId) {
    nextSearchParams.set('session', activeSessionId);
    return {
      clearSuppressedPlainSession,
      nextSearchParams: clearDirectorInitialContextSearchParams(nextSearchParams),
    };
  }

  if (activeSessionId && step !== 'IMPORT' && hasDirectorInitialContextParams(nextSearchParams)) {
    return {
      clearSuppressedPlainSession,
      nextSearchParams: clearDirectorInitialContextSearchParams(nextSearchParams),
    };
  }

  if (!hasActiveSession && sessionParam && !isHydrating) {
    nextSearchParams.delete('session');
    return { clearSuppressedPlainSession: true, nextSearchParams };
  }

  return { clearSuppressedPlainSession };
}

function DirectorStepContent({
  activeSession,
  exportSettings,
  initialSourceUrl,
  initialTopic,
  isClearingPlainEntrySession,
  onClearInitialContext,
  onStartAnalyzeNew,
  refineSettings,
  selectedClips,
  step,
  subtitleStyle,
  trendingImportContext,
}: DirectorStepContentProps) {
  if (isClearingPlainEntrySession) {
    return (
      <div className="rounded-3xl border border-border/50 bg-card/60 px-6 py-5 text-sm font-semibold text-muted-foreground">
        Menyiapkan AI Director...
      </div>
    );
  }

  switch (step) {
    case 'IMPORT':
      return (
        <ImportStep
          initialTopic={initialTopic}
          initialSourceUrl={initialSourceUrl}
          trendingImportContext={trendingImportContext}
          onClearInitialContext={onClearInitialContext}
        />
      );
    case 'ANALYZING':
      return <AnalyzeStep onStartNew={onStartAnalyzeNew} />;
    case 'PICKING':
      return <PickingStep />;
    case 'EDITING':
    case 'PUBLISH_COPY':
      return <EditingStep />;
    case 'EXPORTING':
    case 'COMPLETED':
      return (
        <div className="mx-auto w-full max-w-2xl rounded-[2rem] border border-border/50 bg-card/70 p-5 shadow-sm backdrop-blur-xl sm:p-7 lg:p-8">
          <EditingLivePreview
            activeSession={activeSession}
            exportSettings={exportSettings}
            subtitleStyle={subtitleStyle}
            selectedClips={selectedClips}
            refineSettings={refineSettings}
          />
        </div>
      );
    default:
      return null;
  }
}

export function AiDirectorPage() {
  const { user, subscription } = useAuthStore();
  const [searchParams, setSearchParams] = useMutableSearchParams();
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
    setSubtitleMode,
    setSubtitleTargetLanguage,
    setExportJob,
    updateSubtitleStyle,
    setError,
    setWaitingForAsset,
    setDownloadProgress,
    error,
    exportSettings,
    subtitleStyle,
    selectedClips,
    refineSettings,
    reset,
  } = useDirectorStore();

  const sessionParam = searchParams.get('session');
  const topicParam = searchParams.get('topic');
  const queryTrendingImportContext = useMemo(
    () => resolveTrendingImportContext(searchParams),
    [searchParams],
  );
  const isPlainEntry = useMemo(() => isPlainAiDirectorEntry(searchParams), [searchParams]);
  const [trendingContextSnapshot, setTrendingContextSnapshot] = useState(
    queryTrendingImportContext,
  );
  const pendingSessionHydrationRef = useRef<string | null>(null);
  const manualEntryInitializedRef = useRef(false);
  const suppressedPlainEntrySessionIdRef = useRef<string | null>(null);
  const [showContinuePrompt, setShowContinuePrompt] = useState(isPlainEntry);
  const activeSessionId = activeSession?.id ?? null;
  const effectiveExportSettings = useMemo(
    () =>
      resolveDirectorEffectiveExportSettings(exportSettings, {
        role: user?.role,
        tier: subscription?.tier,
      }),
    [exportSettings, subscription?.tier, user?.role],
  );
  const shouldExposeActiveSessionInSearch = shouldSyncActiveSessionToSearch({
    activeSessionId,
    step,
    hasAsset: Boolean(activeSession?.asset),
  });
  const hasActiveSession = activeSession !== null;
  const isClearingPlainEntrySession = shouldClearPlainEntrySession({
    isPlainEntry,
    activeSessionId,
    hasInitializedManualEntry: manualEntryInitializedRef.current,
  });
  const trendingImportContext =
    step === 'IMPORT' ? (queryTrendingImportContext ?? trendingContextSnapshot) : null;
  const initialTopic = hasActiveSession ? null : (topicParam?.trim() ?? null);
  const initialSourceUrl = hasActiveSession
    ? null
    : resolveInitialSourceUrl(searchParams, queryTrendingImportContext);

  useScrollToTopOnChange(step);

  useEffect(() => {
    if (queryTrendingImportContext && !hasActiveSession) {
      setTrendingContextSnapshot(queryTrendingImportContext);
    }
  }, [hasActiveSession, queryTrendingImportContext]);

  useEffect(() => {
    if (!isPlainEntry) {
      manualEntryInitializedRef.current = false;
      setShowContinuePrompt(false);
      return;
    }

    if (manualEntryInitializedRef.current) {
      return;
    }

    manualEntryInitializedRef.current = true;

    if (activeSessionId) {
      suppressedPlainEntrySessionIdRef.current = activeSessionId;
      reset();
    } else {
      suppressedPlainEntrySessionIdRef.current = null;
    }

    setShowContinuePrompt(true);
  }, [activeSessionId, isPlainEntry, reset]);

  useEffect(() => {
    if (sessionParam) {
      setShowContinuePrompt(false);
    }
  }, [sessionParam]);

  useEffect(() => {
    if (!sessionParam || activeSessionId === sessionParam) {
      pendingSessionHydrationRef.current = null;
      setIsHydrating(false);
      return;
    }

    let cancelled = false;
    pendingSessionHydrationRef.current = sessionParam;
    setIsHydrating(true);

    void hydrateDirectorSession({
      actions: {
        setSession,
        setCandidates,
        setSelectedClips,
        setTranscribeJob,
        setTranscribeLanguage,
        setSubtitleMode,
        setSubtitleTargetLanguage,
        updateSubtitleStyle,
        setExportJob,
        setWaitingForAsset,
        setDownloadProgress,
        setStep,
      },
      clearPendingSession: () => {
        pendingSessionHydrationRef.current = null;
      },
      isCancelled: () => cancelled,
      reset,
      sessionId: sessionParam,
      setError,
      setIsHydrating,
    });

    return () => {
      cancelled = true;
      pendingSessionHydrationRef.current = null;
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
    setSubtitleMode,
    setSubtitleTargetLanguage,
    updateSubtitleStyle,
    setWaitingForAsset,
    reset,
  ]);

  useEffect(() => {
    if (pendingSessionHydrationRef.current) {
      return;
    }

    const syncAction = resolveDirectorSearchSyncAction({
      activeSessionId,
      hasActiveSession,
      isHydrating,
      searchParams,
      sessionParam,
      shouldExposeActiveSessionInSearch,
      step,
      suppressedPlainEntrySessionId: suppressedPlainEntrySessionIdRef.current,
    });

    if (syncAction.clearSuppressedPlainSession) {
      suppressedPlainEntrySessionIdRef.current = null;
    }

    if (syncAction.nextSearchParams) {
      setSearchParams(syncAction.nextSearchParams, { replace: true });
    }
  }, [
    activeSessionId,
    hasActiveSession,
    isHydrating,
    searchParams,
    sessionParam,
    setSearchParams,
    shouldExposeActiveSessionInSearch,
    step,
  ]);

  return (
    <div className="min-h-screen bg-background px-4 pt-3 pb-8 font-sans text-foreground md:px-8 md:pt-4 lg:pb-0">
      <div className="max-w-400 mx-auto space-y-4">
        {/* Header */}
        <div className="space-y-3">
          {showContinuePrompt && !hasActiveSession ? (
            <ContinueWorkspaceDialog
              tool="ai-director"
              onStartNew={() => {
                reset();
                setShowContinuePrompt(false);
                setSearchParams({}, { replace: true });
              }}
              onUnavailable={() => {
                setShowContinuePrompt(false);
              }}
            />
          ) : null}

          {hasActiveSession && !isClearingPlainEntrySession && step !== 'ANALYZING' ? (
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
        <div className="flex items-start justify-center">
          <DirectorStepContent
            activeSession={activeSession}
            exportSettings={effectiveExportSettings}
            initialSourceUrl={initialSourceUrl}
            initialTopic={initialTopic}
            isClearingPlainEntrySession={isClearingPlainEntrySession}
            onClearInitialContext={() => {
              setTrendingContextSnapshot(null);
              setSearchParams(clearDirectorInitialContextSearchParams(searchParams), {
                replace: true,
              });
            }}
            onStartAnalyzeNew={() => {
              reset();
              setSearchParams({}, { replace: true });
            }}
            refineSettings={refineSettings}
            selectedClips={selectedClips}
            step={step}
            subtitleStyle={subtitleStyle}
            trendingImportContext={trendingImportContext}
          />
        </div>
      </div>
    </div>
  );
}
