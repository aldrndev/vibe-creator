import { useDirectorStore } from "@/stores/director-store";
import { authFetch } from "@/services/api";
import { logger } from "@/lib/logger";
import { cn, Button, Chip } from "@heroui/react";
import { Play, CheckCircle2, FileVideo } from "lucide-react";

export const PickingStep = () => {
  const {
    activeSession,
    candidates,
    selectedCandidateIds,
    toggleCandidateSelection,
    playingClipId,
    setPlayingClipId,
    setStep,
    isLoading,
    setLoading,
    setError,
    setSelectedClips,
  } = useDirectorStore();

  const handleClipSelection = async () => {
    if (!activeSession || selectedCandidateIds.size === 0) return;

    try {
      setLoading(true);
      const res = await authFetch(
        `/api/v1/director/sessions/${activeSession.id}/clips`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clipIds: Array.from(selectedCandidateIds) }),
        }
      );
      const data = await res.json();

      if (data.success) {
        // Update selected clips data immediately from response
        setSelectedClips(data.data);
        setStep("EDITING");
      } else {
        throw new Error(data.error?.message || "Selection failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Selection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Choose Your Clips</h2>
          <p className="text-zinc-400">
            Select the best moments to turn into shorts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={() => {
              // Select top 3
              candidates.slice(0, 3).forEach((c) => {
                if (!selectedCandidateIds.has(c.id))
                  toggleCandidateSelection(c.id);
              });
            }}
          >
            Select Top 3
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-24">
        {candidates.map((clip) => {
          const isSelected = selectedCandidateIds.has(clip.id);
          const isPlaying = playingClipId === clip.id;
          const previewUrl = clip.previewStorageKey
            ? `/api/v1/director/previews/${clip.previewStorageKey
                .split("/")
                .pop()}`
            : null;

          const duration = Math.round((clip.endMs - clip.startMs) / 1000);

          return (
            <div
              key={clip.id}
              onClick={() => toggleCandidateSelection(clip.id)}
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
                        // Assuming valid storageKey format
                        const filename = asset.storageKey.split("/").pop();
                        return `/api/v1/director/static-assets/${filename}`;
                      })()}
                      className="w-full h-full object-cover bg-black"
                      autoPlay
                      playsInline
                      muted={false} // Allow sound on preview?
                      onTimeUpdate={(e) => {
                        const video = e.currentTarget;
                        const start = clip.startMs / 1000;
                        const end = clip.endMs / 1000;

                        // Loop logic
                        if (video.currentTime >= end) {
                          video.currentTime = start;
                          video.play();
                        }

                        // Progress bar logic
                        const progress =
                          ((video.currentTime - start) / (end - start)) * 100;
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
                        video
                          .play()
                          .catch((e) => logger.error("Video play failed", e));
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
            {selectedCandidateIds.size} clips selected
          </span>
          <span className="text-xs text-zinc-500">
            Estimated duration:{" "}
            {Array.from(selectedCandidateIds).reduce((acc, id) => {
              const c = candidates.find((x) => x.id === id);
              return acc + (c ? (c.endMs - c.startMs) / 1000 : 0);
            }, 0)}
            s
          </span>
        </div>
        <Button
          color="primary"
          isDisabled={selectedCandidateIds.size === 0 || isLoading}
          isLoading={isLoading}
          onPress={handleClipSelection}
        >
          Proceed to Edit
        </Button>
      </div>
    </div>
  );
};
