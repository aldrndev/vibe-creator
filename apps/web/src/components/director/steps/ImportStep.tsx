import {
  type DirectorSourceTierLimit,
  getDirectorSourceTierLimits,
  type SubscriptionTier,
} from '@vibe-creator/shared';
import {
  AlertCircle,
  CheckCircle2,
  FileVideo,
  Link as LinkIcon,
  Plus,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, CardBody, Input } from '@/components/ui';
import type { TrendingImportContext } from '@/lib/ai-director-trending-context';
import { cn } from '@/lib/utils';
import { authFetch, getApiUrl } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import type { DirectorSession } from '@/stores/director-store';
import { useDirectorStore } from '@/stores/director-store';
import {
  isExpiredDirectorSessionError,
  normalizeDirectorImportErrorMessage,
  readDirectorApiData,
  readDirectorApiSuccess,
} from './import-session-recovery';
import { SupportedSourcesModal } from './SupportedSourcesModal';
import { TrendingImportEntry } from './trending-import-entry';

const INITIAL_UPLOAD_PROGRESS = 0;
const LOCAL_VIDEO_METADATA_TIMEOUT_MS = 2500;
const supportedSourceLabels = ['YouTube', 'TikTok', 'Instagram', 'Facebook'] as const;
type AssetIngestStatus = 'UPLOADING' | 'READY' | 'FAILED';
type FileUploadPhase = 'idle' | 'checking' | 'uploading' | 'importing';

interface AssetStatusResponseData {
  readonly status: AssetIngestStatus;
  readonly progress?: number;
  readonly errorMessage?: string;
}

interface ImportStepProps {
  readonly initialTopic?: string | null;
  readonly initialSourceUrl?: string | null;
  readonly trendingImportContext?: TrendingImportContext | null;
  readonly onClearInitialContext?: () => void;
}

type DirectorSessionAsset = NonNullable<DirectorSession['asset']>;

interface DirectorAssetImportResponse extends Omit<DirectorSessionAsset, 'ingestStatus'> {
  readonly ingestStatus?: AssetIngestStatus;
}

interface UploadVideoResponse {
  readonly uploadToken: string;
}

interface UploadDirectorVideoOptions {
  readonly file: File;
  readonly onProgress: (progress: number) => void;
}

function buildXhrResponse(xhr: XMLHttpRequest): Response {
  const headers = new Headers();
  const rawHeaders = xhr.getAllResponseHeaders().trim();

  if (rawHeaders) {
    for (const line of rawHeaders.split(/[\r\n]+/)) {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex <= 0) {
        continue;
      }

      headers.append(line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim());
    }
  }

  return new Response(xhr.responseText, {
    status: xhr.status,
    statusText: xhr.statusText,
    headers,
  });
}

function uploadDirectorVideoWithCurrentToken({
  file,
  onProgress,
}: UploadDirectorVideoOptions): Promise<Response> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new globalThis.XMLHttpRequest();
    xhr.open('POST', getApiUrl('/api/v1/upload/video?purpose=ai-director'));
    xhr.withCredentials = true;

    const token = useAuthStore.getState().accessToken;
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }

      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    const rejectUpload = () =>
      reject(
        new Error(
          'Upload terputus. Coba lagi dengan koneksi stabil, atau gunakan Import URL jika video tersedia di sumber yang didukung.',
        ),
      );

    xhr.onload = () => resolve(buildXhrResponse(xhr));
    xhr.onerror = rejectUpload;
    xhr.onabort = rejectUpload;
    xhr.ontimeout = rejectUpload;

    xhr.send(formData);
  });
}

async function uploadDirectorVideoWithProgress(
  options: UploadDirectorVideoOptions,
): Promise<Response> {
  if (!useAuthStore.getState().accessToken) {
    await useAuthStore.getState().refreshAccessToken();
  }

  let response = await uploadDirectorVideoWithCurrentToken(options);

  if (response.status === 401) {
    const refreshed = await useAuthStore.getState().refreshAccessToken();
    if (refreshed) {
      options.onProgress(0);
      response = await uploadDirectorVideoWithCurrentToken(options);
    }
  }

  return response;
}

function resolveClientDirectorLimits(
  role: 'USER' | 'ADMIN' | undefined,
  tier: SubscriptionTier | undefined,
): DirectorSourceTierLimit | null {
  if (role === 'ADMIN') {
    return null;
  }

  return getDirectorSourceTierLimits(tier ?? 'FREE');
}

function buildFileTooLargeMessage(limits: DirectorSourceTierLimit): string {
  return `File melebihi batas paket kamu. Maksimal ${limits.maxSizeLabel} atau ${limits.maxDurationLabel}. Pilih video yang lebih kecil, kompres video, atau upgrade paket.`;
}

function buildVideoTooLongMessage(limits: DirectorSourceTierLimit): string {
  return `Durasi video melebihi batas paket kamu. Maksimal ${limits.maxDurationLabel}. Pilih video yang lebih pendek atau upgrade paket.`;
}

function getFileUploadStatusLabel(phase: FileUploadPhase): string {
  switch (phase) {
    case 'checking':
      return 'Mengecek file...';
    case 'uploading':
      return 'Mengupload video...';
    case 'importing':
      return 'Menyiapkan analisis...';
    case 'idle':
      return '';
  }
}

function readLocalVideoDurationMs(file: File): Promise<number | null> {
  if (!file.type.startsWith('video/')) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const objectUrl = globalThis.URL.createObjectURL(file);
    const video = document.createElement('video');
    let isSettled = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout>;

    const cleanup = () => {
      globalThis.URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };

    const settle = (durationMs: number | null) => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      globalThis.clearTimeout(timeoutId);
      cleanup();
      resolve(durationMs);
    };

    timeoutId = globalThis.setTimeout(() => settle(null), LOCAL_VIDEO_METADATA_TIMEOUT_MS);

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const durationMs = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : null;
      settle(durationMs);
    };
    video.onerror = () => settle(null);
    video.src = objectUrl;
  });
}

function getAssetProgress(
  status: AssetIngestStatus,
  progress: unknown,
  previousProgress: number,
): number {
  const rawProgress = typeof progress === 'number' && Number.isFinite(progress) ? progress : 0;

  if (status !== 'UPLOADING') {
    return rawProgress;
  }

  return Math.max(previousProgress, rawProgress, INITIAL_UPLOAD_PROGRESS);
}

function syncSessionAssetStatus(
  currentSession: DirectorSession | null,
  activeSessionId: string,
  status: AssetIngestStatus,
  setSession: (session: DirectorSession) => void,
): void {
  if (
    currentSession?.id !== activeSessionId ||
    !currentSession.asset ||
    currentSession.asset.ingestStatus === status
  ) {
    return;
  }

  setSession({
    ...currentSession,
    asset: {
      ...currentSession.asset,
      ingestStatus: status,
    },
  });
}

function clearPollingInterval(intervalId: ReturnType<typeof setInterval> | undefined): void {
  if (intervalId) {
    clearInterval(intervalId);
  }
}

export const ImportStep = ({
  initialTopic,
  initialSourceUrl,
  trendingImportContext,
  onClearInitialContext,
}: ImportStepProps) => {
  const {
    activeSession,
    importUrl,
    setImportUrl,
    step,
    error,
    isWaitingForAsset,
    downloadProgress,
    setSession,
    setStep,
    setLoading,
    setError,
    setWaitingForAsset,
    setDownloadProgress,
    reset,
  } = useDirectorStore();
  const { user, subscription } = useAuthStore();

  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [isPreparingAnalysis, setIsPreparingAnalysis] = useState(false);
  const [fileUploadPhase, setFileUploadPhase] = useState<FileUploadPhase>('idle');
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef(activeSession);
  const resumeAnalysisKeyRef = useRef<string | null>(null);
  const progressRef = useRef(downloadProgress);
  const appliedInitialSourceUrlRef = useRef<string | null>(null);
  const activeSessionId = activeSession?.id ?? null;
  const assetId = activeSession?.asset?.id ?? null;
  const assetStatus = activeSession?.asset?.ingestStatus ?? null;
  const clientSourceLimits = useMemo(
    () => resolveClientDirectorLimits(user?.role, subscription?.tier),
    [subscription?.tier, user?.role],
  );
  const isUploadingFile = fileUploadPhase !== 'idle';
  const maxRequirementLabel = clientSourceLimits
    ? `Maks ${clientSourceLimits.maxSizeLabel} / ${clientSourceLimits.maxDurationLabel}`
    : 'Maks internal admin';
  const sourceRequirements = useMemo(
    () => ['Minimal 5 menit', maxRequirementLabel, 'Podcast, interview, edukasi, reaction panjang'],
    [maxRequirementLabel],
  );
  const fileUploadStatusLabel = getFileUploadStatusLabel(fileUploadPhase);

  useEffect(() => {
    sessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    progressRef.current = downloadProgress;
  }, [downloadProgress]);

  useEffect(() => {
    if (!initialSourceUrl || activeSessionId || step !== 'IMPORT') {
      return;
    }

    if (appliedInitialSourceUrlRef.current === initialSourceUrl) {
      return;
    }

    setImportUrl(initialSourceUrl);
    appliedInitialSourceUrlRef.current = initialSourceUrl;
  }, [activeSessionId, initialSourceUrl, setImportUrl, step]);

  const handleClearInitialContext = () => {
    if (initialSourceUrl && importUrl === initialSourceUrl) {
      setImportUrl('');
    }

    onClearInitialContext?.();
  };

  const createSession = useCallback(async (): Promise<DirectorSession> => {
    const response = await authFetch('/api/v1/director/sessions', {
      method: 'POST',
    });
    const session = await readDirectorApiData<DirectorSession>(
      response,
      'Failed to create session',
    );
    setSession(session);
    return session;
  }, [setSession]);

  const handleCreateSession = useCallback(async () => {
    try {
      return await createSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    return null;
  }, [createSession, setError]);

  const rollbackSession = useCallback(
    async (sessionId: string, preserveError?: string) => {
      try {
        await authFetch(`/api/v1/director/sessions/${sessionId}`, { method: 'DELETE' });
      } catch {
        // Best-effort cleanup only; user-facing recovery continues below.
      }
      reset();
      if (preserveError) {
        setError(preserveError);
      }
    },
    [reset, setError],
  );

  const startAnalysis = useCallback(
    async (sessionId: string) => {
      try {
        setIsPreparingAnalysis(true);
        const res = await authFetch(`/api/v1/director/sessions/${sessionId}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetDurationRange: 'auto',
          }),
        });
        await readDirectorApiSuccess(res, 'Analysis start failed');
        setStep('ANALYZING');
        setWaitingForAsset(false);
        setLoading(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Analysis failed';
        setWaitingForAsset(false);
        setLoading(false);
        void rollbackSession(sessionId, msg);
      } finally {
        setIsPreparingAnalysis(false);
      }
    },
    [rollbackSession, setLoading, setStep, setWaitingForAsset],
  );

  const recoverExpiredSession = useCallback(
    async (preservedImportUrl?: string): Promise<DirectorSession | null> => {
      reset();
      setWaitingForAsset(false);
      setDownloadProgress(0);
      setLoading(false);

      if (preservedImportUrl) {
        setImportUrl(preservedImportUrl);
      }

      try {
        return await createSession();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal membuat sesi AI Director baru');
        return null;
      }
    },
    [
      createSession,
      reset,
      setDownloadProgress,
      setError,
      setImportUrl,
      setLoading,
      setWaitingForAsset,
    ],
  );

  const importUrlIntoSession = useCallback(
    async (session: DirectorSession, urlToImport: string) => {
      const response = await authFetch(`/api/v1/director/sessions/${session.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'url', url: urlToImport }),
      });
      const importData = await readDirectorApiData<DirectorAssetImportResponse>(
        response,
        'Import failed',
      );
      const newAsset: DirectorSessionAsset = {
        ...importData,
        ingestStatus: importData.ingestStatus ?? 'UPLOADING',
      };

      setWaitingForAsset(true);
      setSession({
        ...session,
        asset: newAsset,
      });

      if (importData.ingestStatus === 'READY') {
        setDownloadProgress(100);
        await startAnalysis(session.id);
      }
    },
    [setDownloadProgress, setSession, setWaitingForAsset, startAnalysis],
  );

  const importUploadTokenIntoSession = useCallback(
    async (session: DirectorSession, uploadToken: string) => {
      const response = await authFetch(`/api/v1/director/sessions/${session.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'file',
          filePath: uploadToken,
        }),
      });
      const importData = await readDirectorApiData<DirectorAssetImportResponse>(
        response,
        'Import failed',
      );
      const importedAsset: DirectorSessionAsset = {
        ...importData,
        ingestStatus: 'READY',
      };

      setSession({
        ...session,
        asset: importedAsset,
      });
      setDownloadProgress(100);
      await startAnalysis(session.id);
    },
    [setDownloadProgress, setSession, startAnalysis],
  );

  const handleUrlImport = async (urlOverride?: string) => {
    const urlToImport = urlOverride ?? importUrl;

    if (urlOverride && importUrl !== urlOverride) {
      setImportUrl(urlOverride);
    }

    setIsSubmittingImport(true);
    setError(null);
    const session = await handleCreateSession();
    if (!session || !urlToImport) {
      setIsSubmittingImport(false);
      return;
    }

    try {
      setDownloadProgress(0);
      await importUrlIntoSession(session, urlToImport);
    } catch (err) {
      setWaitingForAsset(false);

      if (isExpiredDirectorSessionError(err)) {
        const replacementSession = await recoverExpiredSession(urlToImport);
        if (!replacementSession) {
          return;
        }

        try {
          await importUrlIntoSession(replacementSession, urlToImport);
        } catch (retryError) {
          const retryMessage = normalizeDirectorImportErrorMessage(retryError, 'Import failed');
          if (isExpiredDirectorSessionError(retryError)) {
            reset();
            setImportUrl(urlToImport);
            setError('Sesi AI Director sudah expired. Mulai sesi baru atau cek Riwayat.');
          } else {
            void rollbackSession(replacementSession.id, retryMessage);
          }
        }
        return;
      }

      const msg = normalizeDirectorImportErrorMessage(err, 'Import failed');
      void rollbackSession(session.id, msg);
    } finally {
      setIsSubmittingImport(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputElement = e.currentTarget;
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileUploadPhase('checking');
    setFileUploadProgress(0);

    if (clientSourceLimits && file.size > clientSourceLimits.maxSizeBytes) {
      setError(buildFileTooLargeMessage(clientSourceLimits));
      inputElement.value = '';
      setFileUploadPhase('idle');
      return;
    }

    const localDurationMs = await readLocalVideoDurationMs(file);
    if (
      clientSourceLimits &&
      localDurationMs !== null &&
      localDurationMs < clientSourceLimits.minDurationMs
    ) {
      setError(
        'Video terlalu pendek. AI Director butuh video minimal 5 menit. Untuk video pendek, gunakan Video Studio.',
      );
      inputElement.value = '';
      setFileUploadPhase('idle');
      return;
    }

    if (
      clientSourceLimits &&
      localDurationMs !== null &&
      localDurationMs > clientSourceLimits.maxDurationMs
    ) {
      setError(buildVideoTooLongMessage(clientSourceLimits));
      inputElement.value = '';
      setFileUploadPhase('idle');
      return;
    }

    setLoading(true);
    const session = await handleCreateSession();
    if (!session) {
      setLoading(false);
      setFileUploadPhase('idle');
      return;
    }

    try {
      setWaitingForAsset(false);
      setDownloadProgress(0);
      setFileUploadPhase('uploading');

      const uploadRes = await uploadDirectorVideoWithProgress({
        file,
        onProgress: setFileUploadProgress,
      });
      setFileUploadProgress(100);

      const uploadData = await readDirectorApiData<UploadVideoResponse>(uploadRes, 'Upload failed');

      try {
        setFileUploadPhase('importing');
        await importUploadTokenIntoSession(session, uploadData.uploadToken);
      } catch (importError) {
        if (!isExpiredDirectorSessionError(importError)) {
          throw importError;
        }

        const replacementSession = await recoverExpiredSession();
        if (!replacementSession) {
          setFileUploadPhase('idle');
          setFileUploadProgress(0);
          return;
        }

        try {
          setFileUploadPhase('importing');
          await importUploadTokenIntoSession(replacementSession, uploadData.uploadToken);
        } catch (retryError) {
          const retryMessage = normalizeDirectorImportErrorMessage(retryError, 'Import failed');
          if (isExpiredDirectorSessionError(retryError)) {
            reset();
            setFileUploadPhase('idle');
            setFileUploadProgress(0);
            setError('Sesi AI Director sudah expired. Mulai sesi baru atau cek Riwayat.');
          } else {
            void rollbackSession(replacementSession.id, retryMessage);
          }
        }
      }
    } catch (err) {
      const msg = normalizeDirectorImportErrorMessage(err, 'Upload failed');
      setLoading(false);
      setFileUploadPhase('idle');
      setFileUploadProgress(0);
      void rollbackSession(session.id, msg);
    } finally {
      inputElement.value = '';
    }
  };

  useEffect(() => {
    if (!isWaitingForAsset || !activeSessionId || !assetId) {
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const pollAssetStatus = async () => {
      try {
        const response = await authFetch(`/api/v1/director/assets/${assetId}/status`);
        const data = await response.json();

        if (!data.success || cancelled) {
          return;
        }

        const assetStatus = data.data as AssetStatusResponseData;
        const currentSession = sessionRef.current;
        const progress = getAssetProgress(
          assetStatus.status,
          assetStatus.progress,
          progressRef.current,
        );

        setDownloadProgress(progress);
        syncSessionAssetStatus(currentSession, activeSessionId, assetStatus.status, setSession);

        if (assetStatus.status === 'READY') {
          setWaitingForAsset(false);
          setDownloadProgress(100);
          clearPollingInterval(intervalId);
          await startAnalysis(activeSessionId);
          return;
        }

        if (assetStatus.status === 'FAILED') {
          const msg = assetStatus.errorMessage || 'Import gagal diproses';
          setWaitingForAsset(false);
          setLoading(false);
          setDownloadProgress(0);
          clearPollingInterval(intervalId);
          if (activeSessionId) {
            void rollbackSession(activeSessionId, msg);
          } else {
            setError(msg);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal mengecek status import');
        }
      }
    };

    void pollAssetStatus();
    intervalId = setInterval(() => {
      void pollAssetStatus();
    }, 2000);

    return () => {
      cancelled = true;
      clearPollingInterval(intervalId);
    };
  }, [
    activeSessionId,
    assetId,
    isWaitingForAsset,
    setDownloadProgress,
    setError,
    setLoading,
    setSession,
    setWaitingForAsset,
    startAnalysis,
    rollbackSession,
  ]);

  useEffect(() => {
    if (
      step !== 'IMPORT' ||
      !activeSessionId ||
      !assetId ||
      assetStatus !== 'READY' ||
      isWaitingForAsset
    ) {
      resumeAnalysisKeyRef.current = null;
      return;
    }

    const resumeKey = `${activeSessionId}:${assetId}`;
    if (resumeAnalysisKeyRef.current === resumeKey) {
      return;
    }

    resumeAnalysisKeyRef.current = resumeKey;
    setDownloadProgress(100);
    void startAnalysis(activeSessionId);
  }, [
    activeSessionId,
    assetId,
    assetStatus,
    isWaitingForAsset,
    setDownloadProgress,
    startAnalysis,
    step,
  ]);

  return (
    <div className="max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-card/70 border-border/50 backdrop-blur-xl relative overflow-hidden group mb-10">
        {isPreparingAnalysis && !trendingImportContext ? (
          <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-8 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center shadow-lg">
              <Wand2 className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-primary">
                Menyiapkan Analisis
              </p>
              <p className="text-sm text-muted-foreground font-medium">
                Video sedang disiapkan sebelum masuk ke tahap AI Director.
              </p>
            </div>
          </div>
        ) : null}

        <CardBody className="p-6 sm:p-10 flex flex-col items-center text-center gap-4">
          {trendingImportContext ? (
            <>
              {error ? (
                <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-4 py-3 rounded-2xl text-sm border border-rose-500/20 w-full animate-in fade-in zoom-in-95 duration-300">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="font-semibold text-left">{error}</span>
                </div>
              ) : null}
              <TrendingImportEntry
                context={trendingImportContext}
                isSubmittingImport={isSubmittingImport}
                isWaitingForAsset={isWaitingForAsset}
                isPreparingAnalysis={isPreparingAnalysis}
                downloadProgress={downloadProgress}
                onStartAnalysis={() => {
                  void handleUrlImport(trendingImportContext.sourceUrl);
                }}
                onUseDefaultFlow={handleClearInitialContext}
              />
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                  <Wand2 size={14} strokeWidth={2.5} />
                  AI Director
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                    Masukkan video panjang
                  </h2>
                  <p className="mx-auto max-w-xl text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
                    Upload file atau tempel URL, lalu AI Director mencari momen terbaik untuk
                    dijadikan Short.
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center justify-center gap-2">
                {sourceRequirements.map((requirement) => (
                  <div
                    key={requirement}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border/50 bg-muted/20 px-3 py-1.5 text-left"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <p className="text-xs font-bold leading-tight text-muted-foreground">
                      {requirement}
                    </p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-4 py-3 rounded-2xl text-sm border border-rose-500/20 w-full animate-in fade-in zoom-in-95 duration-300">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="font-semibold text-left">{error}</span>
                </div>
              )}

              {initialTopic || initialSourceUrl ? (
                <div className="w-full rounded-3xl border border-primary/15 bg-primary/5 p-4 text-left">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Sparkles size={18} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                          Ide dari Trending
                        </p>
                        {initialTopic ? (
                          <p className="text-base font-black leading-snug text-foreground wrap-break-word">
                            {initialTopic}
                          </p>
                        ) : null}
                        {initialSourceUrl ? (
                          <p className="text-xs font-semibold leading-relaxed text-primary break-all">
                            URL video sudah masuk ke kolom impor.
                          </p>
                        ) : null}
                        <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                          Klik Mulai Analisis untuk download video sumber, lalu AI Director akan
                          mencari potongan short terbaik.
                        </p>
                      </div>
                    </div>
                    {onClearInitialContext ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 rounded-full text-muted-foreground"
                        onClick={handleClearInitialContext}
                        disabled={isSubmittingImport || isWaitingForAsset || isPreparingAnalysis}
                      >
                        Hapus
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="mt-1 grid w-full grid-cols-1 gap-5 md:grid-cols-2">
                {/* Upload Zone */}
                <button
                  type="button"
                  onClick={() =>
                    !isWaitingForAsset && !isUploadingFile && fileInputRef.current?.click()
                  }
                  className={cn(
                    'group/upload relative flex min-h-56 flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed border-border/40 bg-muted/5 transition-all',
                    isWaitingForAsset || isUploadingFile
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer hover:border-primary/45 hover:bg-primary/3 active:scale-[0.98]',
                  )}
                  disabled={isWaitingForAsset || isUploadingFile}
                >
                  {isUploadingFile ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-background/90 p-8 backdrop-blur-md">
                      <div className="w-full max-w-sm space-y-3">
                        <div className="flex items-end justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <div className="size-2 animate-pulse rounded-full bg-primary" />
                            {fileUploadStatusLabel}
                          </span>
                          {fileUploadPhase === 'uploading' ? (
                            <span className="text-sm text-primary">
                              {Math.round(fileUploadProgress)}%
                            </span>
                          ) : null}
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full border border-border/20 bg-muted shadow-inner">
                          <div
                            className={cn(
                              'h-full bg-linear-to-r from-primary via-orange-500 to-rose-600 transition-all duration-300 ease-out',
                              fileUploadPhase === 'uploading' ? '' : 'animate-pulse',
                            )}
                            style={{
                              width:
                                fileUploadPhase === 'uploading' ? `${fileUploadProgress}%` : '100%',
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                        Biarkan halaman ini tetap terbuka sampai selesai.
                      </p>
                    </div>
                  ) : null}
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 transition-all duration-300 group-hover/upload:scale-110 group-hover/upload:bg-primary/10">
                    <FileVideo className="h-7 w-7 text-muted-foreground transition-colors group-hover/upload:text-primary" />
                  </div>
                  <div className="px-4 text-center">
                    <p className="font-bold text-foreground transition-colors group-hover/upload:text-primary">
                      Upload File Video
                    </p>
                    <p className="mt-1 inline-block rounded-full bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                      MP4, MOV •{' '}
                      {clientSourceLimits
                        ? `Maks ${clientSourceLimits.maxSizeLabel}`
                        : 'Maks internal'}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isWaitingForAsset || isUploadingFile}
                  />
                </button>

                {/* URL Zone */}
                <div className="group/url relative flex min-h-56 flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-muted/5 p-6 sm:p-7">
                  {isWaitingForAsset ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-background/90 p-8 backdrop-blur-md">
                      <div className="w-full space-y-3">
                        <div className="flex items-end justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <div className="size-2 animate-pulse rounded-full bg-primary" />
                            Mengunduh...
                          </span>
                          <span className="text-sm text-primary">
                            {Math.round(downloadProgress)}%
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full border border-border/20 bg-muted shadow-inner">
                          <div
                            className="h-full bg-linear-to-r from-primary via-orange-500 to-rose-600 transition-all duration-300 ease-out"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                      </div>
                      <p className="animate-pulse text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                        Mencari kualitas visual terbaik...
                      </p>
                    </div>
                  ) : null}

                  <div className="mb-2 flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 transition-transform duration-300 group-hover/url:scale-110">
                      <LinkIcon className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="font-bold text-foreground">
                      {initialSourceUrl && importUrl === initialSourceUrl
                        ? 'URL Trending Siap Diimpor'
                        : 'Impor dari URL'}
                    </p>
                    <p className="max-w-xs text-xs font-medium leading-relaxed text-muted-foreground">
                      Cocok untuk video online dari sumber yang didukung.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <Input
                      placeholder="Tempel link YouTube, TikTok..."
                      leftIcon={<LinkIcon size={20} />}
                      value={importUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setImportUrl(e.target.value)
                      }
                      disabled={
                        isSubmittingImport ||
                        isUploadingFile ||
                        isWaitingForAsset ||
                        isPreparingAnalysis
                      }
                    />
                    <Button
                      className="w-full rounded-2xl font-bold"
                      variant="default"
                      disabled={
                        !importUrl ||
                        isSubmittingImport ||
                        isWaitingForAsset ||
                        isPreparingAnalysis ||
                        isUploadingFile
                      }
                      isLoading={isSubmittingImport}
                      onClick={() => {
                        void handleUrlImport();
                      }}
                    >
                      Mulai Analisis
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex flex-col items-center justify-center gap-2 text-center sm:flex-row">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/60">
                  Sumber: {supportedSourceLabels.join(', ')}
                </p>
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-border/50 bg-card/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary transition-colors hover:border-primary/25 hover:bg-primary/5"
                  onClick={() => setIsSourcesModalOpen(true)}
                >
                  <Plus size={13} className="mr-1.5" />
                  Lihat sumber lain
                </button>
              </div>
              <p className="max-w-3xl text-xs font-medium leading-relaxed text-muted-foreground">
                Saat upload dari device, biarkan halaman tetap terbuka sampai selesai. Untuk video
                online dari sumber yang didukung, Import URL bisa lebih stabil karena prosesnya
                berjalan di server.
              </p>
            </>
          )}
        </CardBody>
      </Card>

      <SupportedSourcesModal
        isOpen={isSourcesModalOpen}
        onOpenChange={setIsSourcesModalOpen}
        onSelectPlatform={(_platform: string) => {
          // Optional: Prefill or focus input
        }}
      />
    </div>
  );
};
