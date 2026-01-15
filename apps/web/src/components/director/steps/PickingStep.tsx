import { useDirectorStore } from "@/stores/director-store";
import { authFetch, getApiUrl } from "@/services/api";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-primary via-orange-500 to-rose-600">
            Pilih Klip Kamu
          </h2>
          <p className="text-muted-foreground font-medium">
            Pilih momen terbaik untuk dijadikan Reels atau Shorts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full font-bold px-6"
            onClick={() => {
              candidates.slice(0, 3).forEach((c) => {
                if (!selectedCandidateIds.has(c.id))
                  toggleCandidateSelection(c.id);
              });
            }}
          >
            Pilih Top 3
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-24">
        {candidates.map((clip) => {
          const isSelected = selectedCandidateIds.has(clip.id);
          const isPlaying = playingClipId === clip.id;
          const previewUrl = clip.previewStorageKey
            ? getApiUrl(
                `/api/v1/director/previews/${clip.previewStorageKey
                  .split("/")
                  .pop()}`
              )
            : null;

          const duration = Math.round((clip.endMs - clip.startMs) / 1000);

          return (
            <div
              key={clip.id}
              onClick={() => toggleCandidateSelection(clip.id)}
              className={cn(
                "group relative aspect-[9/16] bg-muted/20 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-300",
                isSelected
                  ? "border-primary scale-[1.02] z-10"
                  : "border-border/50 hover:border-primary/50 hover:scale-[1.01]"
              )}
            >
              {/* Thumbnail / Preview */}
              <div className="absolute inset-0 bg-muted/40 group-hover:bg-muted/30 transition-colors">
                {isPlaying ? (
                  <div className="relative w-full h-full">
                    <video
                      src={(() => {
                        const asset = activeSession?.asset;
                        if (!asset?.storageKey) return undefined;
                        const filename = asset.storageKey.split("/").pop();
                        return getApiUrl(
                          `/api/v1/director/static-assets/${filename}`
                        );
                      })()}
                      className="w-full h-full object-cover bg-black"
                      autoPlay
                      playsInline
                      muted={false}
                      onTimeUpdate={(e) => {
                        const video = e.currentTarget;
                        const start = clip.startMs / 1000;
                        const end = clip.endMs / 1000;

                        if (video.currentTime >= end) {
                          video.currentTime = start;
                          video.play();
                        }

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
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                      <div
                        id={`progress-${clip.id}`}
                        className="h-full bg-gradient-to-r from-primary to-orange-500 transition-all duration-100 ease-linear"
                        style={{ width: "0%" }}
                      />
                    </div>
                  </div>
                ) : previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt={`Clip ${clip.rank}`}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
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
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayingClipId(clip.id);
                        }}
                        className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform hover:bg-white/40 border border-white/30"
                      >
                        <Play className="w-6 h-6 text-white fill-white" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                    <FileVideo size={48} strokeWidth={1.5} />
                  </div>
                )}
              </div>

              {/* Selection Indicator */}
              <div
                className={cn(
                  "absolute top-4 right-4 w-7 h-7 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 z-20",
                  isSelected
                    ? "bg-primary border-primary text-white rotate-0 scale-110"
                    : "bg-black/20 backdrop-blur-md border-white/30 text-transparent group-hover:border-white/60 -rotate-12 group-hover:rotate-0"
                )}
              >
                <CheckCircle2 size={16} strokeWidth={3} />
              </div>

              {/* Info Overlay */}
              {!isPlaying && (
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none group-hover:from-primary/90 transition-colors duration-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-primary/20 backdrop-blur-md border border-primary/30 px-2 py-0.5 rounded-lg">
                      <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
                        SKOR {Math.round(clip.score * 100)}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-white bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
                      {duration}s
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {/* High Energy Badge */}
                    {clip.tags?.includes("HIGH ENERGY") && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-[9px] font-black text-rose-200">
                        <span>🔥</span>
                        <span>ENERGY</span>
                      </div>
                    )}
                    {/* Fast Clip Badge */}
                    {Math.round((clip.endMs - clip.startMs) / 1000) <= 15 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-500/30 text-[9px] font-black text-sky-200">
                        <span>⚡</span>
                        <span>FAST</span>
                      </div>
                    )}
                    {/* Default Highlight Badge */}
                    {!clip.tags?.includes("HIGH ENERGY") && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-[9px] font-black text-amber-200">
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

      <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-50 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl border border-border/50 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight text-foreground">
              {selectedCandidateIds.size} Klip Terpilih
            </span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Durasi:{" "}
              {Array.from(selectedCandidateIds).reduce((acc, id) => {
                const c = candidates.find((x) => x.id === id);
                return acc + (c ? (c.endMs - c.startMs) / 1000 : 0);
              }, 0)}
              detik
            </span>
          </div>
          <Button
            className="rounded-2xl px-8 font-black uppercase tracking-widest text-[11px]"
            variant="default"
            disabled={selectedCandidateIds.size === 0 || isLoading}
            isLoading={isLoading}
            onClick={handleClipSelection}
          >
            Lanjutkan ke Edit
          </Button>
        </div>
      </div>
    </div>
  );
};
