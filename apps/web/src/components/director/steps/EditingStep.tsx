import { useEffect } from "react";
import { useDirectorStore } from "@/stores/director-store";
import { authFetch } from "@/services/api";
import { logger } from "@/lib/logger";
import { cn, Button, Switch, Chip, Card, CardBody } from "@heroui/react";
import {
  Zap,
  Trash2,
  FileVideo,
  Scissors,
  Captions,
  Download,
} from "lucide-react";

export const EditingStep = () => {
  const {
    activeSession,
    selectedClips,
    setSelectedClips,
    refineSettings,
    updateRefineSetting,
    subtitleStyle,
    updateSubtitleStyle,
    exportSettings,
    setExportSettings,
    transcribeJob,
    setTranscribeJob,
    setStep,
    isLoading,
    setLoading,
    setError,
    setExportJob,
  } = useDirectorStore();

  const handleStartTranscribe = async () => {
    if (!activeSession) return;
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
      logger.error("Transcription start failed", err);
    }
  };

  const handleUpdateTranscript = async (
    clipId: string,
    segments: Array<{ startMs: number; endMs: number; text: string }>
  ) => {
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
      logger.error("Update transcript failed", e);
    }
  };

  const handleRemoveClip = (clipId: string) => {
    setSelectedClips(selectedClips.filter((c) => c.id !== clipId));
    // In real app, call API DELETE /clips/:id
  };

  const handleStartExport = async () => {
    if (!activeSession) return;
    try {
      setLoading(true);
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
    } catch {
      setError("Failed to start export");
    } finally {
      setLoading(false);
    }
  };

  // Transcription Polling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession && transcribeJob?.status === "PROCESSING") {
      interval = setInterval(async () => {
        try {
          const jobRes = await authFetch(
            `/api/v1/director/sessions/${activeSession.id}/transcribe`
          );
          const jobData = await jobRes.json();

          if (jobData.success) {
            const newStatus = jobData.data.status;
            setTranscribeJob(jobData.data);

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
          logger.error("Poll transcription error", e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [
    activeSession,
    transcribeJob?.status,
    setTranscribeJob,
    setSelectedClips,
  ]);

  // Initial Load (if needed, e.g. reload page)
  useEffect(() => {
    // If clips empty, fetch them
    if (activeSession && selectedClips.length === 0) {
      authFetch(`/api/v1/director/sessions/${activeSession.id}/clips`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setSelectedClips(data.data);
        });
    }
  }, [activeSession, selectedClips.length, setSelectedClips]);

  return (
    <div className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex gap-6">
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

        <div className="space-y-4">
          {selectedClips.map((clip, idx) => {
            const previewUrl = clip.candidate.previewStorageKey
              ? `/api/v1/director/previews/${clip.candidate.previewStorageKey
                  .split("/")
                  .pop()}`
              : null;

            const duration = Math.round(
              (clip.candidate.endMs - clip.candidate.startMs) / 1000
            );

            // Default settings if undefined
            const settings = refineSettings[clip.id] ?? {
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
                      defaultValue={
                        clip.transcript?.segments
                          ?.map((s) => s.text)
                          .join(" ") || ""
                      }
                      onBlur={(e) => {
                        // Update first segment logic for MVP
                        const val = e.target.value;
                        if (val && clip.transcript?.segments) {
                          const segments = [...clip.transcript.segments];
                          if (!segments.length)
                            segments.push({
                              startMs: 0,
                              endMs: 0,
                              text: val,
                            });
                          else {
                            const first = segments[0];
                            if (first) first.text = val;
                          }

                          handleUpdateTranscript(clip.id, segments);
                        }
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
                      setExportSettings({
                        quality: q as "720p" | "1080p",
                      })
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
                      setExportSettings({
                        aspectRatio: r as "9:16" | "16:9" | "1:1",
                      })
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

            <Button
              fullWidth
              color="primary"
              onPress={handleStartExport}
              isLoading={isLoading}
              isDisabled={isLoading}
            >
              Start Export
            </Button>
          </CardBody>
        </Card>

        {/* Style Settings */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardBody className="p-4 space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Captions size={18} /> Subtitle Style
            </h4>
            {/* ... Simplified Font/Size selectors ... */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-500">Font Size</label>
              <input
                type="range"
                min="16"
                max="48"
                value={subtitleStyle.fontSize}
                onChange={(e) =>
                  updateSubtitleStyle({
                    fontSize: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
