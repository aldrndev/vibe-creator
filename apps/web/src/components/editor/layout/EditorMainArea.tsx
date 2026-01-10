import { useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import {
  Button,
  Slider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
  Scissors,
  Trash2,
  Copy,
  LayoutTemplate,
  MonitorPlay,
  SlidersHorizontal,
} from "lucide-react";
import { clsx } from "clsx";
import { AssetPanel } from "@/components/editor/AssetPanel";
import { VideoPreview } from "@/components/editor/VideoPreview";
import { InspectorPanel } from "@/components/editor/InspectorPanel";

export const EditorMainArea = () => {
  const [mobileTab, setMobileTab] = useState<
    "assets" | "preview" | "inspector"
  >("preview");

  const {
    timeline,
    currentTimeMs,
    isPlaying,
    zoomLevel,
    selectedClipId,
    setCurrentTime,
    togglePlayback,
    setZoomLevel,
    addClip,
    removeClip,
  } = useEditorStore();

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}.${remainingMs.toString().padStart(2, "0")}`;
  };

  const handleDeleteClip = () => {
    if (!selectedClipId) return;
    const track = timeline.tracks.find((t) =>
      t.clips.some((c) => c.id === selectedClipId)
    );
    if (track) {
      removeClip(track.id, selectedClipId);
    }
  };

  const handleDuplicateClip = () => {
    if (!selectedClipId) return;

    const videoTrack = timeline.tracks.find((t) => t.type === "VIDEO");
    const clip = videoTrack?.clips.find((c) => c.id === selectedClipId);

    if (!clip || !videoTrack) return;

    const lastClipEnd =
      videoTrack.clips.length > 0
        ? Math.max(...videoTrack.clips.map((c) => c.endMs))
        : 0;

    addClip(videoTrack.id, {
      assetId: clip.assetId,
      startMs: lastClipEnd,
      endMs: lastClipEnd + (clip.endMs - clip.startMs),
      trimStartMs: clip.trimStartMs,
      trimEndMs: clip.trimEndMs,
      transforms: { ...clip.transforms },
      effects: { ...clip.effects },
      asset: clip.asset,
    });
  };

  const handleSplitClip = () => {
    const state = useEditorStore.getState();
    let clipToSplit: {
      trackId: string;
      clip: (typeof state.timeline.tracks)[0]["clips"][0];
    } | null = null;

    for (const track of state.timeline.tracks) {
      const clip = track.clips.find(
        (c) => state.currentTimeMs > c.startMs && state.currentTimeMs < c.endMs
      );
      if (clip) {
        clipToSplit = { trackId: track.id, clip };
        break;
      }
    }

    if (!clipToSplit) return;

    const { trackId, clip } = clipToSplit;
    const splitTimeMs = state.currentTimeMs;
    const relativeTime = splitTimeMs - clip.startMs;
    const clipDuration = clip.endMs - clip.startMs;
    const trimStart = clip.trimStartMs ?? 0;
    const trimEnd = clip.trimEndMs ?? 0;
    const assetDuration =
      clip.asset?.durationMs ?? clipDuration + trimStart + trimEnd;
    const firstDuration = relativeTime;
    const secondDuration = clipDuration - relativeTime;

    const firstTrimStart = trimStart;
    const firstTrimEnd = Math.max(
      0,
      assetDuration - firstTrimStart - firstDuration
    );
    const secondTrimStart = trimStart + relativeTime;
    const secondTrimEnd = Math.max(
      0,
      assetDuration - secondTrimStart - secondDuration
    );

    useEditorStore.getState().updateClip(trackId, clip.id, {
      endMs: splitTimeMs,
      trimStartMs: firstTrimStart,
      trimEndMs: firstTrimEnd,
    });

    addClip(trackId, {
      assetId: clip.assetId ?? null,
      startMs: splitTimeMs,
      endMs: splitTimeMs + secondDuration,
      trimStartMs: secondTrimStart,
      trimEndMs: secondTrimEnd,
      transforms: clip.transforms,
      effects: clip.effects,
      asset: clip.asset,
    });
  };

  return (
    <TooltipProvider>
      <>
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Left panel - Assets */}
          <AssetPanel
            className={clsx(
              "md:flex z-10",
              mobileTab === "assets"
                ? "flex w-full absolute inset-0 md:static md:w-64"
                : "hidden"
            )}
          />

          {/* Center - Preview + Controls */}
          <div
            className={clsx(
              "flex-1 flex flex-col min-w-0 min-h-0",
              mobileTab !== "preview" ? "hidden md:flex" : "flex"
            )}
          >
            {/* Video Preview */}
            <div className="flex-1 flex items-center justify-center bg-muted dark:bg-black/50 p-4 min-h-0 overflow-hidden">
              <VideoPreview />
            </div>

            {/* Playback controls */}
            <div className="h-16 border-t border-border flex items-center md:justify-center overflow-x-auto no-scrollbar gap-4 px-4 flex-shrink-0 bg-background">
              <div className="flex items-center gap-2 flex-shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setCurrentTime(0)}
                    >
                      <SkipBack size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ke awal (Home)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" onClick={togglePlayback}>
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Play/Pause (Space)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setCurrentTime(timeline.durationMs)}
                    >
                      <SkipForward size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ke akhir (End)</TooltipContent>
                </Tooltip>
              </div>

              <div className="font-mono text-sm text-muted-foreground w-24 text-center">
                {formatTime(currentTimeMs)}
              </div>

              {/* Editing buttons */}
              <div className="flex items-center gap-1 border-l border-border pl-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSplitClip}
                    >
                      <Scissors size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Split di Playhead (S)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleDuplicateClip}
                      disabled={!selectedClipId}
                    >
                      <Copy size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Duplicate Klip (Cmd+D)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleDeleteClip}
                      disabled={!selectedClipId}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Hapus Klip (Del)</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setZoomLevel(zoomLevel * 0.8)}
                    >
                      <ZoomOut size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom Out</TooltipContent>
                </Tooltip>

                <Slider
                  min={20}
                  max={300}
                  step={10}
                  value={[zoomLevel]}
                  onValueChange={(v: number[]) => setZoomLevel(v[0] ?? 100)}
                  className="w-24 hidden md:flex"
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setZoomLevel(zoomLevel * 1.25)}
                    >
                      <ZoomIn size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom In</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Right panel - Inspector */}
          <InspectorPanel
            className={clsx(
              "md:flex z-10",
              mobileTab === "inspector"
                ? "flex w-full absolute inset-0 md:static md:w-80"
                : "hidden"
            )}
          />
        </div>

        {/* Mobile Tab Navigation */}
        <div className="md:hidden h-14 border-t border-border bg-card flex items-center justify-around px-2 flex-shrink-0">
          <Button
            variant={mobileTab === "assets" ? "secondary" : "ghost"}
            className="flex-1 flex flex-col gap-1 h-full py-2 rounded-none"
            onClick={() => setMobileTab("assets")}
          >
            <LayoutTemplate size={20} />
            <span className="text-[10px]">Assets</span>
          </Button>
          <Button
            variant={mobileTab === "preview" ? "secondary" : "ghost"}
            className="flex-1 flex flex-col gap-1 h-full py-2 rounded-none"
            onClick={() => setMobileTab("preview")}
          >
            <MonitorPlay size={20} />
            <span className="text-[10px]">Preview</span>
          </Button>
          <Button
            variant={mobileTab === "inspector" ? "secondary" : "ghost"}
            className="flex-1 flex flex-col gap-1 h-full py-2 rounded-none"
            onClick={() => setMobileTab("inspector")}
          >
            <SlidersHorizontal size={20} />
            <span className="text-[10px]">Edit</span>
          </Button>
        </div>
      </>
    </TooltipProvider>
  );
};
