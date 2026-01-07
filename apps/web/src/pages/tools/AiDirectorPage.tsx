import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button, Card, CardBody, Input, Chip, cn, Switch } from "@heroui/react";
import {
  Wand2,
  Upload,
  Link as LinkIcon,
  FileVideo,
  Scissors,
  Captions,
  Download,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  Zap,
  Play,
  Trash2,
} from "lucide-react";
import { PageTransition } from "@/components/ui/PageTransition";
import { authFetch } from "@/services/api";

// Types derived from backend design
type DirectorStep =
  | "IMPORT"
  | "ANALYZING"
  | "PICKING"
  | "EDITING"
  | "EXPORTING"
  | "COMPLETED";

interface DirectorSession {
  id: string;
  step: DirectorStep;
  asset?: {
    id: string;
    origin: "UPLOAD" | "URL_IMPORT";
    sourceUrlNormalized?: string;
    ingestStatus: "UPLOADING" | "READY" | "FAILED";
    storageKey: string;
  };
}

export function AiDirectorPage() {
  const {} = useAuthStore();
  const [step, setStep] = useState<DirectorStep>("IMPORT");
  const [activeSession, setActiveSession] = useState<DirectorSession | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWaitingForAsset, setIsWaitingForAsset] = useState(false);
  const transcribeStartedRef = useRef(false);
  // Refine Settings State (Local)
  const [refineSettings, setRefineSettings] = useState<
    Record<
      string,
      {
        faceTracking: boolean;
        removeSilence: boolean;
        stabilize: boolean;
        caption?: string;
      }
    >
  >({});

  const handleRemoveClip = (clipId: string) => {
    setSelectedClips((prev) => prev.filter((c) => c.id !== clipId));
    // In real app, call API to delete selection
  };

  const updateRefineSetting = (
    id: string,
    key: keyof (typeof refineSettings)[string],
    value: any
  ) => {
    setRefineSettings((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {
          faceTracking: true,
          removeSilence: true,
          stabilize: false,
        }),
        [key]: value,
      },
    }));
  };

  // IMPORT STATE
  const [importUrl, setImportUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PICKING STATE
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(
    new Set()
  );
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);

  // EDITING STATE
  const [selectedClips, setSelectedClips] = useState<any[]>([]);
  const [transcribeJob, setTranscribeJob] = useState<any>(null); // For session-level status
  const [subtitleStyle, setSubtitleStyle] = useState<any>({
    fontToken: "F_INTER",
    fontSize: 24,
    textColorToken: "C_WHITE",
    bgColorToken: "C_BLACK",
  });

  // EXPORT STATE
  const [exportSettings, setExportSettings] = useState<{
    aspectRatio: "9:16" | "16:9" | "1:1";
    quality: "720p" | "1080p";
    includeSubtitles: boolean;
  }>({
    aspectRatio: "9:16",
    quality: "1080p",
    includeSubtitles: true,
  });
  const [exportJob, setExportJob] = useState<any>(null);

  // COMPONENT: STEP INDICATOR
  const StepIndicator = () => {
    const steps: { id: DirectorStep; label: string; icon: any }[] = [
      { id: "IMPORT", label: "Import", icon: Upload },
      { id: "ANALYZING", label: "Analyze", icon: Wand2 },
      { id: "PICKING", label: "Pick Clips", icon: Scissors },
      { id: "EDITING", label: "Refine", icon: Captions },
      { id: "EXPORTING", label: "Export", icon: Download },
    ];

    const currentIdx = steps.findIndex((s) => s.id === step);

    return (
      <div className="w-full max-w-4xl mx-auto mb-8 px-4">
        <div className="relative flex justify-between items-center">
          {/* Progress Line */}
          <div className="absolute left-0 top-5 w-full h-1 bg-zinc-800 z-0 rounded-full" />
          <div
            className="absolute left-0 top-5 h-1 bg-gradient-to-r from-primary to-secondary z-0 rounded-full transition-all duration-500"
            style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((s, idx) => {
            const isCompleted = idx < currentIdx;
            const isActive = idx === currentIdx;

            return (
              <div
                key={s.id}
                className="flex flex-col items-center gap-2 relative z-10"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-zinc-950",
                    isActive
                      ? "border-primary text-primary shadow-lg shadow-primary/20 scale-110"
                      : isCompleted
                      ? "border-primary bg-primary text-white"
                      : "border-zinc-700 text-zinc-500"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <s.icon size={20} />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : isCompleted
                      ? "text-zinc-300"
                      : "text-zinc-600"
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // HANDLERS
  // UX STATE
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);

  // POLLING EFFECT
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let logInterval: NodeJS.Timeout;

    // 1. POLLING FOR ANALYSIS
    if (step === "ANALYZING" && activeSession) {
      // Start log simulation
      logInterval = setInterval(() => {
        const tasks = [
          "Menonton video kamu...",
          "Mencari momen menarik...",
          "Menemukan bagian seru...",
          "Menganalisis suara dan musik...",
          "Menandai potongan terbaik...",
          "Menyusun rekomendasi klip...",
          "Hampir selesai...",
        ];
        const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
        const timestamp = new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setAnalysisLogs((prev) => [
          ...prev.slice(-4),
          `[${timestamp}] ${randomTask}`,
        ]);
      }, 1200);

      interval = setInterval(async () => {
        try {
          const res = await authFetch(
            `/api/v1/director/sessions/${activeSession.id}/analyze`
          );
          const data = await res.json();

          if (data.success && data.data) {
            const job = data.data;
            if (job.status === "COMPLETED") {
              setStep("PICKING");
              if (job.candidates) {
                setCandidates(job.candidates);
              }
              setIsLoading(false);
            } else if (job.status === "FAILED") {
              setError(job.errorMessage || "Analysis failed");
              // handleResetSession().catch(console.error); // Assuming this is a separate handler
              setIsLoading(false);
            }
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 2000);

      return () => {
        clearInterval(interval);
        clearInterval(logInterval);
      };
    }

    // 2. POLLING FOR IMPORT (Download Progress)
    // We check either isWaitingForAsset flag OR if session tells us the asset is uploading
    const asset = activeSession?.asset;
    const isUploading =
      asset?.ingestStatus === "UPLOADING" || isWaitingForAsset;

    if (step === "IMPORT" && isUploading && asset?.id) {
      interval = setInterval(async () => {
        try {
          const assetId = asset.id;
          const res = await authFetch(
            `/api/v1/director/assets/${assetId}/status`
          );
          const data = await res.json();

          if (data.success && data.data) {
            const { status, progress, errorMessage } = data.data;

            if (status === "READY") {
              setDownloadProgress(100);
              setIsLoading(false);
              setIsWaitingForAsset(false); // Clear local flag

              // Refresh session to sync state
              if (activeSession) {
                const sessRes = await authFetch(
                  `/api/v1/director/sessions/${activeSession.id}`
                );
                const sessData = await sessRes.json();
                if (sessData.success) setActiveSession(sessData.data);

                // Start analysis automatically
                await startAnalysis(activeSession.id);
              }
            } else if (status === "FAILED") {
              setError(errorMessage || "Download failed");
              setIsLoading(false);
              setIsWaitingForAsset(false);
              setDownloadProgress(0);
            } else {
              // Still uploading/processing
              setDownloadProgress(progress || 0);
            }
          }
        } catch (err) {
          console.error("Polling import error", err);
        }
      }, 1000);

      return () => clearInterval(interval);
    }

    // 3. LOAD DATA ON STEP CHANGE TO EDITING (only once when clips empty)
    if (step === "EDITING" && activeSession && selectedClips.length === 0) {
      // Fetch selected clips - only if empty
      authFetch(`/api/v1/director/sessions/${activeSession.id}/clips`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setSelectedClips(data.data);
        });
    }

    // Fetch transcribe job status - only if not already set
    if (step === "EDITING" && activeSession && !transcribeJob) {
      authFetch(`/api/v1/director/sessions/${activeSession.id}/transcribe`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            // Job exists
            setTranscribeJob(data.data);
          } else if (data.success && !data.data) {
            // No job yet - start one
            handleStartTranscribe();
          } else {
            // Error case
            handleStartTranscribe();
          }
        })
        .catch(() => handleStartTranscribe());
    }

    return () => {
      if (interval) clearInterval(interval);
      if (logInterval) clearInterval(logInterval);
    };
  }, [
    step,
    activeSession,
    isWaitingForAsset,
    selectedClips.length,
    transcribeJob,
  ]);

  // TRANSCRIPTION POLLING - only when PROCESSING, stops when COMPLETED
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (
      step === "EDITING" &&
      activeSession &&
      transcribeJob?.status === "PROCESSING"
    ) {
      interval = setInterval(async () => {
        try {
          // Poll job status
          const jobRes = await authFetch(
            `/api/v1/director/sessions/${activeSession.id}/transcribe`
          );
          const jobData = await jobRes.json();

          if (jobData.success) {
            const newStatus = jobData.data.status;
            setTranscribeJob(jobData.data);

            // Stop polling and reload clips when completed
            if (newStatus === "COMPLETED" || newStatus === "FAILED") {
              clearInterval(interval);
              // Reload clips to get transcripts
              const clipsRes = await authFetch(
                `/api/v1/director/sessions/${activeSession.id}/clips`
              );
              const clipsData = await clipsRes.json();
              if (clipsData.success) setSelectedClips(clipsData.data);
            }
          }
        } catch (e) {
          console.error("Poll transcription error", e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [step, activeSession, transcribeJob?.status]);

  // EXPORT POLLING
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (
      step === "EXPORTING" &&
      activeSession &&
      !["COMPLETED", "FAILED"].includes(exportJob?.status || "")
    ) {
      interval = setInterval(async () => {
        try {
          const res = await authFetch(
            `/api/v1/director/sessions/${activeSession.id}/export`
          );
          const data = await res.json();

          if (data.success && data.data) {
            const job = data.data;
            const isCompleted = job.status === "COMPLETED";
            const isFailed = job.status === "FAILED";

            setExportJob({
              ...job,
              outputUrl:
                isCompleted && job.outputStorageKey
                  ? `/api/v1/director/static-assets/${job.outputStorageKey.replace(
                      /^director\//,
                      ""
                    )}`
                  : null,
            });

            if (isCompleted || isFailed) {
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.error("Poll export error", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [step, activeSession, exportJob]);

  // ASSET READINESS POLLING
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWaitingForAsset && activeSession) {
      interval = setInterval(async () => {
        try {
          const res = await authFetch(
            `/api/v1/director/sessions/${activeSession.id}`
          );
          const data = await res.json();
          const remoteAsset = data.data?.asset;

          if (data.success && remoteAsset?.ingestStatus === "READY") {
            setActiveSession(data.data);
            setIsWaitingForAsset(false);
            await startAnalysis(data.data.id);
          } else if (remoteAsset?.ingestStatus === "FAILED") {
            setIsWaitingForAsset(false);
            setIsLoading(false);
            setError("Failed to download video");
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isWaitingForAsset, activeSession]);

  // HANDLERS
  const handleCreateSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await authFetch("/api/v1/director/sessions", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      if (data.success) {
        setActiveSession(data.data);
        return data.data;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const startAnalysis = async (sessionId: string) => {
    try {
      const res = await authFetch(
        `/api/v1/director/sessions/${sessionId}/analyze`,
        {
          method: "POST",
        }
      );
      const data = await res.json();

      if (data.success) {
        setStep("ANALYZING");
      } else {
        throw new Error(data.error?.message || "Analysis start failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setIsLoading(false);
    }
  };

  const handleUrlImport = async () => {
    let session = activeSession;
    if (!session) {
      session = await handleCreateSession();
    }
    if (!session || !importUrl) return;

    try {
      setIsLoading(true);
      const res = await authFetch(
        `/api/v1/director/sessions/${session.id}/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "url", url: importUrl }),
        }
      );
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error?.message || "Import failed");

      // Update session with new asset info
      const newAsset = { ...data.data, ingestStatus: "UPLOADING" };

      // Update local state so polling starts
      if (session) {
        setActiveSession({
          ...session,
          asset: newAsset,
        });
      }

      if (data.data.ingestStatus === "READY") {
        await startAnalysis(session.id);
      } else {
        setIsWaitingForAsset(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let session = activeSession;
    if (!session) {
      session = await handleCreateSession();
    }
    if (!session) return;

    try {
      setIsLoading(true);

      // 1. Upload file to temp
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await authFetch("/api/v1/upload/video", {
        method: "POST",
        body: formData,
        // Content-Type header is absent so browser sets it with boundary
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success)
        throw new Error(uploadData.error?.message || "Upload failed");

      // 2. Import asset using temp file path
      const importRes = await authFetch(
        `/api/v1/director/sessions/${session.id}/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "file",
            filePath: uploadData.data.filepath,
          }),
        }
      );

      const importData = await importRes.json();
      if (!importData.success)
        throw new Error(importData.error?.message || "Import failed");

      // Update session with new asset info
      const newAsset = { ...importData.data, ingestStatus: "READY" };

      // 3. Start analysis
      await startAnalysis(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsLoading(false);
    }
  };

  const handleClipSelection = async () => {
    if (!activeSession || selectedCandidates.size === 0) return;

    try {
      setIsLoading(true);
      const res = await authFetch(
        `/api/v1/director/sessions/${activeSession.id}/clips`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clipIds: Array.from(selectedCandidates) }),
        }
      );
      const data = await res.json();

      if (data.success) {
        setStep("EDITING");
        // Could fetch selected clips here if needed for next step
      } else {
        throw new Error(data.error?.message || "Selection failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Selection failed");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCandidate = (id: string) => {
    const next = new Set(selectedCandidates);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedCandidates(next);
  };

  const handleStartTranscribe = async () => {
    if (!activeSession) return;
    if (transcribeStartedRef.current) return; // Prevent duplicate calls
    transcribeStartedRef.current = true;

    try {
      const res = await authFetch(
        `/api/v1/director/sessions/${activeSession.id}/transcribe`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.success) {
        setTranscribeJob({ status: "PROCESSING", ...data.data });
      }
    } catch (err) {
      console.error("Transcription start failed", err);
      transcribeStartedRef.current = false; // Reset on error
    }
  };

  const handleUpdateTranscript = async (clipId: string, segments: any[]) => {
    if (!activeSession) return;
    try {
      await authFetch(
        `/api/v1/director/sessions/${activeSession.id}/clips/${clipId}/transcript`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segments }),
        }
      );
    } catch (e) {
      console.error("Update transcript failed", e);
    }
  };

  const handleStartExport = async () => {
    if (!activeSession) return;
    try {
      setIsLoading(true);
      const res = await authFetch(
        `/api/v1/director/sessions/${activeSession.id}/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(exportSettings),
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error("Export failed");

      setExportJob({
        ...data.data,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      });
      setStep("EXPORTING");
    } catch (err) {
      setError("Failed to start export");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSession = async () => {
    if (activeSession) {
      try {
        await authFetch(`/api/v1/director/sessions/${activeSession.id}`, {
          method: "DELETE",
        });
      } catch (e) {
        console.error("Failed to delete session", e);
      }
      setActiveSession(null);
    }
    setStep("IMPORT");
    setIsLoading(false);
    // Don't clear error if we want to show it (e.g. Analysis failed)
    // But if manual reset, clear it.
    // Logic: If called from error handler, error is already set. If called from Cancel, clear error.
    // Let's pass a boolean or separate clean method?
    // Just keep error if it's there? No, "Cancel" should clear error.
    // Analysis failure sets error THEN calls this.
    // So this should NOT clear error.
    setCandidates([]);
    setTranscribeJob(null);
    setSelectedClips([]);
    transcribeStartedRef.current = false; // Reset transcribe guard
    setImportUrl(""); // Clear input too? Maybe keeps user input if they want to edit it.
    // Let's keep importUrl.
  };

  // VIEWS
  const renderImportStep = () => (
    <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-md">
        <CardBody className="p-8 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Wand2 className="w-10 h-10 text-primary" />
          </div>

          <div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 mb-2">
              AI Director
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto leading-relaxed">
              Buat konten viral secara otomatis! 🚀 <br />
              Dari video panjang ke Shorts siap upload dalam menit. <br />
              AI bantu temukan momen menarik, kamu pilih yang terbaik.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-danger bg-danger/10 px-4 py-2 rounded-lg text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="w-full grid md:grid-cols-2 gap-4 mt-4">
            {/* Upload Zone */}
            <div
              onClick={() =>
                !isWaitingForAsset && fileInputRef.current?.click()
              }
              className={cn(
                "group relative h-48 rounded-xl border-2 border-dashed border-zinc-700 transition-all flex flex-col items-center justify-center gap-3",
                isWaitingForAsset
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-primary hover:bg-white/5 cursor-pointer"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <FileVideo className="w-6 h-6 text-zinc-400 group-hover:text-primary" />
              </div>
              <div>
                <p className="font-semibold text-zinc-200 group-hover:text-white">
                  Upload File
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  MP4, MOV up to 200MB
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
            </div>

            {/* URL Zone */}
            <div className="h-48 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6 flex flex-col justify-between relative overflow-hidden">
              {isWaitingForAsset ? (
                <div className="absolute inset-0 z-10 bg-zinc-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 gap-4">
                  <div className="w-full">
                    <div className="flex justify-between text-xs text-zinc-400 mb-2">
                      <span>Downloading asset...</span>
                      <span>{Math.round(downloadProgress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 animate-pulse">
                    Please wait, fetching high-quality video...
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                  <LinkIcon className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="font-semibold text-zinc-200">Import URL</p>
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="Paste YouTube, TikTok URL..."
                  size="sm"
                  classNames={{
                    inputWrapper: "bg-zinc-800 border-zinc-700",
                  }}
                  value={importUrl}
                  onValueChange={setImportUrl}
                  isDisabled={isLoading || isWaitingForAsset}
                />
                <Button
                  fullWidth
                  size="sm"
                  color="primary"
                  variant="flat"
                  isDisabled={!importUrl || isLoading || isWaitingForAsset}
                  isLoading={isLoading && !isWaitingForAsset}
                  onPress={handleUrlImport}
                >
                  Import
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {["YouTube", "TikTok", "Instagram", "Facebook"].map((platform) => (
              <Chip
                key={platform}
                size="sm"
                variant="flat"
                className="bg-zinc-800 text-zinc-400"
              >
                {platform}
              </Chip>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );

  const renderAnalyzingStep = () => (
    <div className="max-w-lg mx-auto w-full animate-in fade-in zoom-in-95 duration-500">
      <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden shadow-xl">
        <CardBody className="p-8 flex flex-col items-center">
          {/* Animated Icon */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="w-10 h-10 text-primary animate-pulse" />
            </div>
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>

          <h3 className="text-xl font-semibold text-white mb-2">
            Sedang Menganalisis Video
          </h3>
          <p className="text-zinc-400 text-sm text-center mb-6">
            Mohon tunggu, kami sedang mencari momen terbaik untuk kontenmu...
          </p>

          {/* Progress Dots */}
          <div className="flex gap-2 mb-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          {/* Activity Log - Clean Style */}
          <div className="w-full bg-zinc-800/50 rounded-lg p-4 mb-6">
            <div className="flex flex-col gap-2">
              {analysisLogs.slice(-3).map((log, i) => (
                <div
                  key={i}
                  className="text-sm text-zinc-300 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span className="truncate">
                    {log.replace(/\[.*?\]\s*/, "")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="light"
            size="sm"
            color="danger"
            onPress={() => {
              setError(null);
              handleResetSession();
            }}
            className="text-xs"
          >
            Batalkan
          </Button>
        </CardBody>
      </Card>
    </div>
  );

  const renderPickingStep = () => (
    <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Select Your Best Moments
        </h2>
        <p className="text-zinc-400">
          AI menemukan {candidates.length} potensi viral clips. Pilih clip yang
          ingin Anda proses.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {candidates.map((clip: any) => {
          const isSelected = selectedCandidates.has(clip.id);
          const duration = Math.round((clip.endMs - clip.startMs) / 1000);
          const previewUrl = clip.previewStorageKey
            ? `/api/v1/director/previews/${clip.previewStorageKey
                ?.split("/")
                .pop()}`
            : null;

          const isPlaying = playingClipId === clip.id;

          return (
            <div
              key={clip.id}
              onClick={() => toggleCandidate(clip.id)}
              className={cn(
                "group relative aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden cursor-pointer border-2 transition-all",
                isSelected
                  ? "border-primary shadow-lg shadow-primary/20"
                  : "border-transparent hover:border-zinc-700"
              )}
            >
              {/* Thumbnail / Preview */}
              <div className="absolute inset-0 bg-zinc-800">
                {isPlaying ? (
                  <div className="relative w-full h-full">
                    <video
                      src={(() => {
                        const asset = activeSession?.asset;
                        if (!asset?.storageKey) return undefined;
                        const filename = asset.storageKey.split("/").pop();
                        return `/api/v1/director/static-assets/${filename}`;
                      })()}
                      className="w-full h-full object-cover bg-black"
                      autoPlay
                      playsInline
                      onTimeUpdate={(e) => {
                        const video = e.currentTarget;
                        const start = clip.startMs / 1000;
                        const end = clip.endMs / 1000;
                        const duration = end - start;

                        // Loop logic
                        if (video.currentTime >= end) {
                          video.currentTime = start;
                          video.play();
                        }

                        // Progress bar logic
                        const progress =
                          ((video.currentTime - start) / duration) * 100;
                        const progressBar = document.getElementById(
                          `progress-${clip.id}`
                        );
                        if (progressBar) {
                          progressBar.style.width = `${Math.max(
                            0,
                            Math.min(100, progress)
                          )}%`;
                        }
                      }}
                      onLoadedMetadata={(e) => {
                        const video = e.currentTarget;
                        video.currentTime = clip.startMs / 1000;
                        video.play().catch(console.error);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayingClipId(null);
                      }}
                    />
                    {/* Custom Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div
                        id={`progress-${clip.id}`}
                        className="h-full bg-primary transition-all duration-100 ease-linear"
                        style={{ width: "0%" }}
                      />
                    </div>
                    {/* Stop Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20 pointer-events-none">
                      <div className="bg-black/50 backdrop-blur-sm p-3 rounded-full">
                        <Play className="w-6 h-6 text-white fill-white rotate-90" />
                      </div>
                    </div>
                  </div>
                ) : previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt={`Clip ${clip.rank}`}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement?.classList.add(
                          "flex",
                          "items-center",
                          "justify-center"
                        );
                      }}
                    />
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayingClipId(clip.id);
                        }}
                        className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform hover:bg-white/30"
                      >
                        <Play className="w-6 h-6 text-white fill-white" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                    <FileVideo size={32} />
                  </div>
                )}
              </div>

              {/* Selection Indicator */}
              <div
                className={cn(
                  "absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors z-10",
                  isSelected
                    ? "bg-primary border-primary text-white"
                    : "bg-black/50 border-white/50 text-transparent group-hover:border-white"
                )}
              >
                <CheckCircle2 size={14} />
              </div>

              {/* Info Overlay */}
              {!isPlaying && (
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
                  <div className="flex items-center justify-between mb-1">
                    <Chip
                      size="sm"
                      variant="flat"
                      classNames={{
                        base: "bg-yellow-500/20 text-yellow-500 h-5",
                      }}
                    >
                      ★ {Math.round(clip.score * 100)}
                    </Chip>
                    <span className="text-xs font-medium text-zinc-300 bg-black/50 px-2 py-1 rounded">
                      {duration}s
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {/* High Energy Badge */}
                    {clip.tags?.includes("HIGH ENERGY") && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-[10px] font-bold text-red-400">
                        <span>🔥</span>
                        <span>HIGH ENERGY</span>
                      </div>
                    )}

                    {/* Fast Clip Badge */}
                    {Math.round((clip.endMs - clip.startMs) / 1000) <= 15 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-bold text-blue-400">
                        <span>⚡</span>
                        <span>FAST</span>
                      </div>
                    )}

                    {/* Default Highlight Badge */}
                    {!clip.tags?.includes("HIGH ENERGY") && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-[10px] font-bold text-yellow-500">
                        <span>✨</span>
                        <span>HIGHLIGHT</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-4 sticky bottom-6 p-4 bg-black/80 backdrop-blur-md rounded-2xl border border-zinc-800 max-w-md mx-auto z-50">
        <div className="flex-1 flex flex-col justify-center">
          <span className="text-sm font-medium text-zinc-200">
            {selectedCandidates.size} clips selected
          </span>
          <span className="text-xs text-zinc-500">
            Estimated duration:{" "}
            {Array.from(selectedCandidates).reduce((acc, id) => {
              const c = candidates.find((x) => x.id === id);
              return acc + (c ? (c.endMs - c.startMs) / 1000 : 0);
            }, 0)}
            s
          </span>
        </div>
        <Button
          color="primary"
          isDisabled={selectedCandidates.size === 0 || isLoading}
          isLoading={isLoading}
          onPress={handleClipSelection}
        >
          Proceed to Edit
        </Button>
      </div>
    </div>
  );

  const renderEditingStep = () => (
    <div className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex gap-6">
      {/* Editor Panel */}
      <div className="flex-1 bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Refine & Subtitles</h3>
          <Button
            size="sm"
            variant="flat"
            color="secondary"
            startContent={<Zap size={16} />}
            onPress={handleStartTranscribe}
            isDisabled={transcribeJob?.status === "PROCESSING"}
          >
            {transcribeJob?.status === "PROCESSING"
              ? "Transcribing..."
              : "Re-Transcribe"}
          </Button>
        </div>

        {/* Timeline / Clip List */}
        <div className="space-y-4">
          {selectedClips.map((clip: any, idx: number) => {
            const previewUrl = clip.candidate.previewStorageKey
              ? `/api/v1/director/previews/${clip.candidate.previewStorageKey
                  .split("/")
                  .pop()}`
              : null;

            const duration = Math.round(
              (clip.candidate.endMs - clip.candidate.startMs) / 1000
            );

            const settings = refineSettings[clip.id] || {
              faceTracking: true,
              removeSilence: true,
              stabilize: false,
            };

            return (
              <div
                key={clip.id}
                className="bg-black/40 p-4 rounded-xl border border-zinc-800 flex gap-6 group hover:border-zinc-700 transition-colors"
              >
                {/* Visual Preview (9:16) */}
                <div className="w-32 aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden relative border border-zinc-800 shrink-0">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                      <FileVideo size={24} />
                    </div>
                  )}
                  {/* Smart Crop Badge */}
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/30">
                      <Scissors size={12} className="text-primary" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                      {duration}s
                    </span>
                  </div>
                </div>

                {/* Editor Controls */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-zinc-200 text-lg">
                        Clip Segment {idx + 1}
                      </h4>
                      <div className="flex gap-2 mt-1">
                        <Chip
                          size="sm"
                          variant="flat"
                          className="h-5 bg-zinc-800 text-zinc-400"
                        >
                          {clip.candidate.tags?.includes("HIGH ENERGY")
                            ? "🔥 High Energy"
                            : "✨ Highlight"}
                        </Chip>
                        <Chip
                          size="sm"
                          variant="flat"
                          className="h-5 bg-zinc-800 text-zinc-400"
                        >
                          Auto-Reframed
                        </Chip>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        color="danger"
                        onPress={() => handleRemoveClip(clip.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  {/* Smart Tools */}
                  <div className="grid grid-cols-3 gap-4 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">
                        Face Tracking
                      </span>
                      <Switch
                        size="sm"
                        isSelected={settings.faceTracking}
                        onValueChange={(v) =>
                          updateRefineSetting(clip.id, "faceTracking", v)
                        }
                        color="primary"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">
                        Remove Silence
                      </span>
                      <Switch
                        size="sm"
                        isSelected={settings.removeSilence}
                        onValueChange={(v) =>
                          updateRefineSetting(clip.id, "removeSilence", v)
                        }
                        color="success"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Stabilize</span>
                      <Switch
                        size="sm"
                        isSelected={settings.stabilize}
                        onValueChange={(v) =>
                          updateRefineSetting(clip.id, "stabilize", v)
                        }
                        color="warning"
                      />
                    </div>
                  </div>

                  {/* Caption Editor */}
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 mb-1.5 block ml-1">
                      Caption / Subtitle (Auto-Generated)
                    </label>
                    <textarea
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 transition-colors resize-none placeholder:text-zinc-700"
                      rows={3}
                      placeholder={
                        clip.transcript
                          ? "Edit caption..."
                          : "Waiting for transcription..."
                      }
                      value={
                        // Show current edited value if likely, or fallback to transcript
                        clip.transcript?.segments
                          ?.map((s: any) => s.text)
                          .join(" ") || ""
                      }
                      onChange={(e) => {
                        // Simple Update Logic:
                        // For MVP we just treating whole text as one segment 'text' update?
                        // Getting mapped segments back to text is tricky if we don't just store one block.
                        // But `transcribe-normalizer` chunks it.
                        // User editing "text" might invalidate timestamps?
                        // For MVP, enable simple editing of text content.
                        // Deep integration would require a proper subtitle editor.
                        // Let's assume user edits safely or we just update the specific segment if we had segment UI.
                        // Here we only have one text area for the whole clip.
                        // Let's iterate segments and update text? Too complex for textarea.
                        // WORKAROUND: Just update first segment text or re-segment?
                        // Let's assume 1 segment for short clips for now, OR show readonly warning.
                        // BETTER: Map segments to text, on save split by newline?

                        // Real implementation:
                        // We update the local state `selectedClips` deeply.
                        const newClips = [...selectedClips];
                        const targetClip = newClips[idx];
                        if (!targetClip.transcript) return;

                        // Naive: Update first segment or create one
                        const val = e.target.value;
                        if (!targetClip.transcript.segments?.length) {
                          targetClip.transcript.segments = [
                            { startMs: 0, endMs: duration * 1000, text: val },
                          ];
                        } else {
                          // Join all text?
                          // This is destructive to timing.
                          // Let's just update the first segment for MVP proof of concept
                          targetClip.transcript.segments[0].text = val;
                        }
                        setSelectedClips(newClips);
                      }}
                      onBlur={() => {
                        // Persist on blur
                        handleUpdateTranscript(
                          clip.id,
                          clip.transcript?.segments || []
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtitle Settings Panel */}
      <div className="w-80 space-y-4">
        {/* Export Settings Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardBody className="p-4 space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Download size={18} /> Export Settings
            </h4>

            <div className="space-y-2">
              <label className="text-xs text-zinc-500">Quality</label>
              <div className="flex bg-zinc-800 rounded p-1">
                {["720p", "1080p"].map((q) => (
                  <button
                    key={q}
                    onClick={() =>
                      setExportSettings((prev) => ({
                        ...prev,
                        quality: q as any,
                      }))
                    }
                    className={cn(
                      "flex-1 px-3 py-1 rounded text-xs transition-colors",
                      exportSettings.quality === q
                        ? "bg-zinc-700 text-white shadow"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-500">Aspect Ratio</label>
              <div className="flex bg-zinc-800 rounded p-1">
                {["9:16", "16:9", "1:1"].map((r) => (
                  <button
                    key={r}
                    onClick={() =>
                      setExportSettings((prev) => ({
                        ...prev,
                        aspectRatio: r as any,
                      }))
                    }
                    className={cn(
                      "flex-1 px-3 py-1 rounded text-xs transition-colors",
                      exportSettings.aspectRatio === r
                        ? "bg-zinc-700 text-white shadow"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardBody className="p-4 space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Captions size={18} /> Subtitle Style
            </h4>

            <div className="space-y-2">
              <label className="text-xs text-zinc-500">Font</label>
              <div className="flex flex-wrap gap-2">
                {["Inter", "Roboto", "Oswald"].map((font) => (
                  <button
                    key={font}
                    onClick={() =>
                      setSubtitleStyle({ ...subtitleStyle, fontToken: font })
                    }
                    className={cn(
                      "px-3 py-1 rounded text-xs border transition-colors",
                      subtitleStyle.fontToken === font
                        ? "bg-primary border-primary text-white"
                        : "border-zinc-700 hover:border-zinc-500"
                    )}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-500">Color</label>
              <div className="flex gap-2">
                {["#FFFFFF", "#FFD700", "#FF0055", "#00FF99"].map((color) => (
                  <button
                    key={color}
                    onClick={() =>
                      setSubtitleStyle({
                        ...subtitleStyle,
                        textColorToken: color,
                      })
                    }
                    className="w-6 h-6 rounded-full border border-white/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Button
          fullWidth
          color="primary"
          size="lg"
          className="font-bold shadow-lg shadow-primary/20"
          endContent={<ArrowRight size={18} />}
          onPress={handleStartExport}
        >
          Export Video
        </Button>
      </div>
    </div>
  );

  const renderExportingStep = () => {
    const isCompleted = exportJob?.status === "COMPLETED";

    return (
      <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardBody className="p-8 text-center space-y-8">
            {!isCompleted ? (
              <>
                <div className="w-24 h-24 mx-auto rounded-full bg-zinc-800 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <Wand2 className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Rendering Your Masterpiece
                  </h2>
                  <p className="text-zinc-400">
                    Please wait while we stitch, polish, and export your video.
                  </p>
                </div>
                <div className="bg-zinc-950 rounded-lg p-4 text-left space-y-3 max-w-sm mx-auto">
                  <div className="flex items-center gap-3 text-zinc-300 text-sm">
                    <CheckCircle2 size={16} className="text-success" />
                    Applying cuts and transitions
                  </div>
                  <div className="flex items-center gap-3 text-zinc-300 text-sm">
                    <CheckCircle2 size={16} className="text-success" />
                    Generating subtitles ({subtitleStyle.fontToken})
                  </div>
                  <div className="flex items-center gap-3 text-white text-sm">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Encoding {exportSettings.quality}{" "}
                    {exportSettings.aspectRatio}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 mx-auto rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-success" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Export Complete!
                  </h2>
                  <p className="text-zinc-400">
                    Your video is ready to go viral.
                  </p>
                </div>

                <div className="flex flex-col gap-3 max-w-xs mx-auto w-full">
                  <Button
                    color="success"
                    size="lg"
                    className="font-bold shadow-lg shadow-success/20"
                    startContent={<Download size={20} />}
                    as="a"
                    href={exportJob.outputUrl}
                    target="_blank"
                    download
                  >
                    Download Video
                  </Button>
                  <Button
                    variant="flat"
                    className="text-zinc-400"
                    onPress={() => {
                      setStep("IMPORT");
                      setActiveSession(null);
                      setExportJob(null);
                    }}
                  >
                    Create Another
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {!isCompleted && (
          <div className="text-center mt-8">
            <Button
              variant="light"
              color="danger"
              size="sm"
              onPress={() => setStep("EDITING")}
            >
              Cancel Export
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageTransition>
      <div className="min-h-screen p-6 md:p-8 space-y-8">
        <header className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="light"
              onPress={() => window.history.back()}
              className="text-zinc-400 hover:text-white"
            >
              <ChevronLeft size={20} />
            </Button>
            <h1 className="text-lg font-bold">AI Director</h1>
            <Chip size="sm" color="primary" variant="flat" className="ml-2">
              BETA
            </Chip>
          </div>
        </header>

        <StepIndicator />

        <main className="w-full max-w-6xl mx-auto">
          {step === "IMPORT" && renderImportStep()}
          {step === "ANALYZING" && renderAnalyzingStep()}
          {step === "PICKING" && renderPickingStep()}
          {step === "EDITING" && renderEditingStep()}
          {step === "EXPORTING" && renderExportingStep()}
        </main>
      </div>
    </PageTransition>
  );
}
