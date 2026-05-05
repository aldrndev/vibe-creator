import { AlertCircle, FileVideo, Link as LinkIcon, Plus, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, CardBody, Input } from '@/components/ui';
import { targetDurationRangeOptions } from '@/lib/director-target-duration';
import { cn } from '@/lib/utils';
import { authFetch } from '@/services/api';
import type { DirectorSession } from '@/stores/director-store';
import { useDirectorStore } from '@/stores/director-store';
import { SupportedSourcesModal } from './SupportedSourcesModal';

const INITIAL_UPLOAD_PROGRESS = 0;
type AssetIngestStatus = 'UPLOADING' | 'READY' | 'FAILED';

interface AssetStatusResponseData {
  readonly status: AssetIngestStatus;
  readonly progress?: number;
  readonly errorMessage?: string;
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

export const ImportStep = () => {
  const {
    activeSession,
    importUrl,
    setImportUrl,
    step,
    error,
    isWaitingForAsset,
    downloadProgress,
    targetDurationRange,
    setSession,
    setStep,
    setLoading,
    setError,
    setTargetDurationRange,
    setWaitingForAsset,
    setDownloadProgress,
    reset,
  } = useDirectorStore();

  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [isPreparingAnalysis, setIsPreparingAnalysis] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef(activeSession);
  const resumeAnalysisKeyRef = useRef<string | null>(null);
  const progressRef = useRef(downloadProgress);
  const activeSessionId = activeSession?.id ?? null;
  const assetId = activeSession?.asset?.id ?? null;
  const assetStatus = activeSession?.asset?.ingestStatus ?? null;

  useEffect(() => {
    sessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    progressRef.current = downloadProgress;
  }, [downloadProgress]);

  const handleCreateSession = async () => {
    try {
      const res = await authFetch('/api/v1/director/sessions', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to create session');
      const data = await res.json();
      if (data.success) {
        setSession(data.data);
        return data.data;
      }
      throw new Error(data.error?.message || 'Failed to create session');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    return null;
  };

  const rollbackSession = useCallback(
    async (sessionId: string, preserveError?: string) => {
      try {
        await authFetch(`/api/v1/director/sessions/${sessionId}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to rollback session', e);
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
            targetDurationRange,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setStep('ANALYZING');
          setWaitingForAsset(false);
          setLoading(false);
        } else {
          throw new Error(data.error?.message || 'Analysis start failed');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Analysis failed';
        setWaitingForAsset(false);
        setLoading(false);
        void rollbackSession(sessionId, msg);
      } finally {
        setIsPreparingAnalysis(false);
      }
    },
    [rollbackSession, setLoading, setStep, setWaitingForAsset, targetDurationRange],
  );

  const handleUrlImport = async () => {
    setIsSubmittingImport(true);
    setError(null);
    let session = activeSession;
    session ??= await handleCreateSession();
    if (!session || !importUrl) {
      setIsSubmittingImport(false);
      return;
    }

    try {
      setDownloadProgress(0);
      const res = await authFetch(`/api/v1/director/sessions/${session.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'url', url: importUrl }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Import failed');

      const newAsset = { ...data.data, ingestStatus: 'UPLOADING' };
      setWaitingForAsset(true);
      setSession({
        ...session,
        asset: newAsset,
      });

      if (data.data.ingestStatus === 'READY') {
        setDownloadProgress(100);
        await startAnalysis(session.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setWaitingForAsset(false);
      if (session) {
        void rollbackSession(session.id, msg);
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmittingImport(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    let session = activeSession;
    session ??= await handleCreateSession();
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      setWaitingForAsset(false);
      setDownloadProgress(0);

      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await authFetch('/api/v1/upload/video', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error?.message || 'Upload failed');

      const importRes = await authFetch(`/api/v1/director/sessions/${session.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'file',
          filePath: uploadData.data.uploadToken,
        }),
      });

      const importData = await importRes.json();
      if (!importData.success) throw new Error(importData.error?.message || 'Import failed');

      setSession({
        ...session,
        asset: { ...importData.data, ingestStatus: 'READY' },
      });
      setDownloadProgress(100);
      await startAnalysis(session.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setLoading(false);
      if (session) {
        void rollbackSession(session.id, msg);
      } else {
        setError(msg);
      }
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
        {isPreparingAnalysis ? (
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

        <CardBody className="p-6 sm:p-10 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center mb-2">
            <Wand2 className="w-6 h-6 text-white drop-shadow-sm" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-br from-primary via-orange-500 to-rose-600">
              AI Director
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed font-medium">
              Ubah video panjang kamu menjadi Shorts yang viral dalam hitungan menit. 🚀
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-4 py-3 rounded-2xl text-sm border border-rose-500/20 w-full animate-in fade-in zoom-in-95 duration-300">
              <AlertCircle size={18} className="shrink-0" />
              <span className="font-semibold text-left">{error}</span>
            </div>
          )}

          <div className="w-full rounded-3xl border border-border/40 bg-muted/10 p-4 sm:p-5">
            <div className="mb-3 text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/60">
                Target Durasi Short
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Analisa kandidat akan diprioritaskan mengikuti rentang durasi ini.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {targetDurationRangeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTargetDurationRange(option.value)}
                  className={cn(
                    'rounded-2xl border px-2 py-2 text-center transition-all',
                    targetDurationRange === option.value
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border/40 bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                  )}
                  disabled={isSubmittingImport || isWaitingForAsset || isPreparingAnalysis}
                >
                  <p className="text-[11px] font-black tracking-wide">{option.label}</p>
                  <p className="mt-1 text-[10px] font-medium opacity-80">{option.helper}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            {/* Upload Zone */}
            <button
              type="button"
              onClick={() => !isWaitingForAsset && fileInputRef.current?.click()}
              className={cn(
                'group/upload relative min-h-64 rounded-3xl border-2 border-dashed border-border/40 transition-all flex flex-col items-center justify-center gap-4 bg-muted/5 overflow-hidden',
                isWaitingForAsset
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-primary/60 hover:bg-primary/5 cursor-pointer active:scale-[0.98]',
              )}
              disabled={isWaitingForAsset}
            >
              <div className="w-14 h-14 rounded-2xl bg-muted/50 group-hover/upload:bg-primary/20 flex items-center justify-center transition-all duration-300 group-hover/upload:scale-110">
                <FileVideo className="w-7 h-7 text-muted-foreground group-hover/upload:text-primary transition-colors" />
              </div>
              <div className="text-center px-4">
                <p className="font-bold text-foreground group-hover/upload:text-primary transition-colors">
                  Upload File Video
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium bg-muted/30 px-3 py-1 rounded-full inline-block">
                  MP4, MOV • Maks 200MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isWaitingForAsset}
              />
            </button>

            {/* URL Zone */}
            <div className="min-h-64 rounded-3xl border border-border/50 bg-muted/5 p-8 flex flex-col justify-between relative overflow-hidden group/url">
              {isWaitingForAsset ? (
                <div className="absolute inset-0 z-10 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-8 gap-5">
                  <div className="w-full space-y-3">
                    <div className="flex justify-between items-end text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary animate-pulse" />
                        Mengunduh...
                      </span>
                      <span className="text-primary text-sm">{Math.round(downloadProgress)}%</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner border border-border/20">
                      <div
                        className="h-full bg-linear-to-r from-primary via-orange-500 to-rose-600 transition-all duration-300 ease-out"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 animate-pulse text-center">
                    Mencari kualitas visual terbaik...
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center group-hover/url:scale-110 transition-transform duration-300">
                  <LinkIcon className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-bold text-foreground">Impor dari URL</p>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Tempel link YouTube, TikTok..."
                  leftIcon={<LinkIcon size={20} />}
                  value={importUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setImportUrl(e.target.value)
                  }
                  disabled={isSubmittingImport || isWaitingForAsset || isPreparingAnalysis}
                />
                <Button
                  className="w-full rounded-2xl font-bold"
                  variant="default"
                  disabled={
                    !importUrl || isSubmittingImport || isWaitingForAsset || isPreparingAnalysis
                  }
                  isLoading={isSubmittingImport}
                  onClick={handleUrlImport}
                >
                  Mulai Impor
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {['YouTube', 'TikTok', 'Instagram', 'Facebook'].map((platform) => (
              <Badge
                key={platform}
                variant="secondary"
                className="px-4 py-1.5 rounded-full cursor-pointer hover:bg-primary/10 hover:text-primary transition-all duration-300 border border-transparent hover:border-primary/20 font-bold text-[10px] uppercase tracking-wider"
              >
                {platform}
              </Badge>
            ))}
            <Badge
              variant="default"
              className="px-4 py-1.5 rounded-full cursor-pointer transition-all duration-300 font-bold text-[10px] uppercase tracking-wider"
              onClick={() => setIsSourcesModalOpen(true)}
            >
              <Plus size={14} className="mr-1.5" />
              Lainnya
            </Badge>
          </div>
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
