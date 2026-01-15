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
import { cn } from "@/lib/utils";
import { AssetPanel } from "@/components/editor/AssetPanel";
import { VideoPreview } from "@/components/editor/VideoPreview";
import { InspectorPanel } from "@/components/editor/InspectorPanel";
import { Timeline } from "@/components/editor/Timeline";

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
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
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

  const [sidebarTab, setSidebarTab] = useState<"assets" | "inspector">(
    "assets"
  );

  // Sync mobile tab changes to desktop sidebar tab if needed,
  // or just use mobileTab to control visibility on mobile.
  // Actually, let's keep mobileTab for mobile visibility state,
  // and sidebarTab for desktop sidebar content.

  return (
    <TooltipProvider>
      <>
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative bg-background">
          {/* CENTER - PREVIEW AREA (Now Left on Desktop) */}
          <div
            className={cn(
              "flex-1 flex flex-col min-w-0 min-h-0 bg-muted/20 order-2 md:order-1",
              mobileTab !== "preview" ? "hidden md:flex" : "flex"
            )}
          >
            {/* Video Preview */}
            <div className="flex-1 min-h-0 overflow-hidden relative flex items-center justify-center p-4 md:p-8">
              <div className="relative w-full h-full max-w-5xl max-h-[85vh] shadow-2xl shadow-black/20 rounded-lg overflow-hidden bg-black">
                <VideoPreview />
              </div>
            </div>

            {/* Playback controls */}
            <div className="h-14 md:h-16 border-t border-border flex items-center md:justify-center overflow-x-auto no-scrollbar gap-4 px-4 bg-background z-20">
              <div className="flex items-center gap-1 flex-shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setCurrentTime(0)}
                    >
                      <SkipBack size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={togglePlayback}
                      className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isPlaying ? (
                        <Pause size={18} className="fill-current" />
                      ) : (
                        <Play size={18} className="fill-current" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Play/Pause (Space)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setCurrentTime(timeline.durationMs)}
                    >
                      <SkipForward size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>End</TooltipContent>
                </Tooltip>
              </div>

              <div className="bg-muted px-3 py-1 rounded-md font-mono text-xs font-medium tabular-nums min-w-[80px] text-center">
                {formatTime(currentTimeMs)}
              </div>

              {/* Editing Tools */}
              <div className="flex items-center gap-1 border-l border-border pl-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full"
                      onClick={handleSplitClip}
                    >
                      <Scissors size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Split (S)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full"
                      onClick={handleDuplicateClip}
                      disabled={!selectedClipId}
                    >
                      <Copy size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Duplicate</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleDeleteClip}
                      disabled={!selectedClipId}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-2 ml-auto hidden md:flex">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setZoomLevel(zoomLevel * 0.8)}
                >
                  <ZoomOut size={16} />
                </Button>
                <Slider
                  min={20}
                  max={300}
                  step={10}
                  value={[zoomLevel]}
                  onValueChange={(v: number[]) => setZoomLevel(v[0] ?? 100)}
                  className="w-24"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setZoomLevel(zoomLevel * 1.25)}
                >
                  <ZoomIn size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR - ASSETS & INSPECTOR (Desktop) */}
          {/* On mobile, hidden unless tab selected */}
          {/* RIGHT SIDEBAR - ASSETS, INSPECTOR & TIMELINE (Desktop) */}
          {/* On mobile, hidden unless tab selected. Timeline is tricky on mobile with this layout. */}
          {/* We might need to rethink mobile timeline placement if it's strictly "right sidebar". */}
          {/* For now, let's enable Timeline on Desktop Right Sidebar. */}
          <div
            className={cn(
              "order-1 md:order-2 z-10 bg-background md:border-l border-border flex flex-col transition-all duration-300",
              // Desktop: Wider width for timeline
              "md:w-[480px] md:flex",
              mobileTab === "assets" || mobileTab === "inspector"
                ? "absolute inset-0 z-20 flex w-full"
                : "hidden"
            )}
          >
            {/* TOP HALF: TOOLS (Tabs + Panels) */}
            <div className="flex-1 flex flex-col min-h-0 border-b border-border relative">
              {/* Sidebar Tab Switcher (Desktop Only) */}
              <div className="hidden md:flex items-center border-b border-border flex-shrink-0">
                <button
                  onClick={() => setSidebarTab("assets")}
                  className={cn(
                    "flex-1 h-10 flex items-center justify-center text-xs font-medium transition-colors relative",
                    sidebarTab === "assets"
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <LayoutTemplate size={14} className="mr-2" />
                  Assets
                  {sidebarTab === "assets" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <div className="w-px h-6 bg-border" />
                <button
                  onClick={() => setSidebarTab("inspector")}
                  className={cn(
                    "flex-1 h-10 flex items-center justify-center text-xs font-medium transition-colors relative",
                    sidebarTab === "inspector"
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <SlidersHorizontal size={14} className="mr-2" />
                  Inspector
                  {sidebarTab === "inspector" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden relative flex flex-col h-full">
                {/* Asset Panel */}
                <div
                  className={cn(
                    "absolute inset-0 flex flex-col bg-background transition-opacity duration-300",
                    // Desktop visibility
                    sidebarTab === "assets"
                      ? "opacity-100 z-10 pointer-events-auto"
                      : "opacity-0 z-0 pointer-events-none md:static", // md:static hack
                    // Mobile visibility override
                    mobileTab === "assets" &&
                      "!opacity-100 !z-20 !pointer-events-auto sticky inset-0"
                  )}
                >
                  <AssetPanel className="w-full h-full border-none md:w-full" />
                </div>

                {/* Inspector Panel */}
                <div
                  className={cn(
                    "absolute inset-0 flex flex-col bg-background transition-opacity duration-300",
                    // Desktop visibility
                    sidebarTab === "inspector"
                      ? "opacity-100 z-10 pointer-events-auto"
                      : "opacity-0 z-0 pointer-events-none",
                    // Mobile visibility override
                    mobileTab === "inspector" &&
                      "!opacity-100 !z-20 !pointer-events-auto sticky inset-0"
                  )}
                >
                  <InspectorPanel className="w-full h-full border-none md:w-full" />
                </div>
              </div>
            </div>

            {/* BOTTOM HALF: TIMELINE (Desktop Only or via Tab?) */}
            {/* For now, render Timeline at bottom of sidebar on Desktop */}
            <div className="h-64 flex-shrink-0 relative hidden md:block">
              <Timeline />
            </div>

            {/* Mobile Timeline Handling? */}
            {/* If on mobile tab 'preview', we might want timeline below video? */}
            {/* Currently video preview takes full height. */}
            {/* Let's stick to the requested "Right Sidebar" change mainly. */}
          </div>
        </div>

        {/* Mobile Tab Navigation (Bottom) */}
        <div className="md:hidden h-14 border-t border-border bg-background flex items-center justify-around flex-shrink-0 z-50">
          {[
            { id: "assets", icon: LayoutTemplate, label: "Assets" },
            { id: "preview", icon: MonitorPlay, label: "Preview" },
            { id: "inspector", icon: SlidersHorizontal, label: "Inspector" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              className={cn(
                "flex-1 flex flex-col gap-1 h-full rounded-none transition-colors",
                mobileTab === tab.id
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground"
              )}
              onClick={() => {
                setMobileTab(tab.id as any);
                // Also sync desktop tab for consistency if they switch back to desktop view
                if (tab.id === "assets" || tab.id === "inspector") {
                  setSidebarTab(tab.id as any);
                }
              }}
            >
              <tab.icon size={18} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Button>
          ))}
        </div>
      </>
    </TooltipProvider>
  );
};
