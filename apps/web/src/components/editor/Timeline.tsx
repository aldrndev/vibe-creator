import { useRef, useCallback, useEffect, useMemo } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { Trash2, Music, Type, Film, Layers, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

const MIN_CLIP_DURATION_MS = 300;

function TimelinePlayhead() {
  const { currentTimeMs, zoomLevel } = useEditorStore(
    useShallow((state) => ({
      currentTimeMs: state.currentTimeMs,
      zoomLevel: state.zoomLevel,
    }))
  );
  const left = (currentTimeMs / 1000) * zoomLevel;

  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-primary pointer-events-none z-40"
      style={{ left }}
    >
      <div className="absolute -top-1 -left-[5px] w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary" />
    </div>
  );
}

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Selector optimization: explicit pick to avoid re-renders on currentTimeMs
  const {
    timeline,
    zoomLevel,
    scrollLeft,
    selectedClipId,
    textOverlays,
    selectedTextOverlayId,
    selectedTrackId, // Add this
    // Note: currentTimeMs is deliberately omitted to prevent re-renders
    // setCurrentTime, // Not used in this optimized version for ruler click (handled via store directly if needed or we re-add)
    setScrollLeft,
    selectClip,
    addClip,
    updateClip,
    removeClip,
    selectTextOverlay,
    selectTrack, // Add this
    removeTextOverlay,
    addTrack,
  } = useEditorStore(
    useShallow((state) => ({
      timeline: state.timeline,
      zoomLevel: state.zoomLevel,
      scrollLeft: state.scrollLeft,
      selectedClipId: state.selectedClipId,
      textOverlays: state.textOverlays,
      selectedTextOverlayId: state.selectedTextOverlayId,
      selectedTrackId: state.selectedTrackId, // Add this
      setScrollLeft: state.setScrollLeft,
      selectClip: state.selectClip,
      addClip: state.addClip,
      updateClip: state.updateClip,
      removeClip: state.removeClip,
      selectTextOverlay: state.selectTextOverlay,
      selectTrack: state.selectTrack, // Add this
      removeTextOverlay: state.removeTextOverlay,
      addTrack: state.addTrack,
    }))
  );

  const msToPixels = useCallback(
    (ms: number) => (ms / 1000) * zoomLevel,
    [zoomLevel]
  );

  const pixelsToMs = useCallback(
    (px: number) => (px / zoomLevel) * 1000,
    [zoomLevel]
  );

  // Sync scroll on mount/update
  useEffect(() => {
    if (containerRef.current) {
      const diff = Math.abs(containerRef.current.scrollLeft - scrollLeft);
      if (diff > 1) {
        containerRef.current.scrollLeft = scrollLeft;
      }
    }
  }, [scrollLeft]);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      // Click to seek logic
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const ms = pixelsToMs(x);
      // Use getState to avoid subscription re-render loop
      useEditorStore.getState().setCurrentTime(Math.max(0, ms));

      // Deselect any selected clip
      selectClip(null);
    },
    [selectClip, pixelsToMs]
  );

  const handleRulerClick = (e: React.MouseEvent) => {
    // Re-use the safe logic (no op if handled by handleTimelineClick bubbling? handleTimelineClick is on parent)
    // Actually handleRulerClick checks e.stopPropagation() so it's fine.
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const ms = pixelsToMs(x);
    useEditorStore.getState().setCurrentTime(Math.max(0, ms));
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  // Drag Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData("assetId");
    if (!assetId) return;

    const timelineRect = timelineRef.current?.getBoundingClientRect();
    if (!timelineRect) return;

    // click coordinate relative to timeline start
    const x = e.clientX - timelineRect.left;
    const startMs = Math.max(0, pixelsToMs(x));

    addClip(trackId, {
      assetId,
      startMs,
      endMs: startMs + 5000,
      trimStartMs: 0,
      trimEndMs: 0,
      transforms: {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
      },
      effects: {
        filters: [],
        speed: 1,
        volume: 1,
        fadeIn: 0,
        fadeOut: 0,
      },
    });
  };

  const handleClipClick = useCallback(
    (e: React.MouseEvent, clipId: string) => {
      e.stopPropagation();
      selectClip(clipId);
    },
    [selectClip]
  );

  const handleClipDragStart = (
    e: React.MouseEvent,
    trackId: string,
    clipId: string,
    startMs: number,
    endMs: number
  ) => {
    e.stopPropagation();
    selectClip(clipId);

    // x relative to timeline
    const timelineRect = timelineRef.current?.getBoundingClientRect();
    if (!timelineRect) return;
    // We need startX relative to client, but updates are delta based.

    const startX = e.clientX;
    const initialStart = startMs;
    const duration = endMs - startMs;

    const handleMouseMove = (mv: MouseEvent) => {
      const deltaX = mv.clientX - startX;
      // Convert delta pixels to delta ms
      const deltaMs = pixelsToMs(deltaX);

      const newStart = Math.max(0, initialStart + deltaMs);

      updateClip(trackId, clipId, {
        startMs: newStart,
        endMs: newStart + duration,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleTrimStartDrag = (
    e: React.MouseEvent,
    trackId: string,
    clipId: string,
    startMs: number,
    endMs: number,
    trimStartMs: number
  ) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialStart = startMs;
    const initialTrimStart = trimStartMs;
    const initialEnd = endMs;
    // Removed unused vars

    const handleMouseMove = (mv: MouseEvent) => {
      const deltaX = mv.clientX - startX;
      const deltaMs = pixelsToMs(deltaX);

      const maxStart = initialEnd - MIN_CLIP_DURATION_MS;
      // You can trigger start later (dragging right), or earlier (dragging left)
      // New Start = InitialStart + Delta
      // But it is constrained by maxStart (can't go past end) and 0.

      // Also constrained by available media:
      // We are changing trimStart.
      // trimStart = initialTrimStart + (newStart - initialStart)
      // So if we move right (positive delta), trimStart increases.
      // If we move left (negative delta), trimStart decreases.

      // Calculate proposed start
      let proposedStart = initialStart + deltaMs;
      proposedStart = Math.min(proposedStart, maxStart);
      proposedStart = Math.max(0, proposedStart);

      // Calculate what the trimStart would be
      const shift = proposedStart - initialStart;
      let newTrimStart = initialTrimStart + shift;

      // Constraint: newTrimStart >= 0
      if (newTrimStart < 0) {
        newTrimStart = 0;
        proposedStart = initialStart - initialTrimStart;
      }

      // We don't check asset end here because that's trimEnd's job,
      // but strictly speaking available duration matters.
      // If we drag left (reduce startMs and reduce trimStart), we show more of the start of video.
      // If we drag right, we show less.

      updateClip(trackId, clipId, {
        startMs: proposedStart,
        trimStartMs: newTrimStart,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleTrimEndDrag = (
    e: React.MouseEvent,
    trackId: string,
    clipId: string,
    startMs: number,
    baseEndMs: number,
    trimStartMs: number,
    _trimEndMs: number,
    assetDurationMs: number
  ) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialEnd = baseEndMs;

    const handleMouseMove = (mv: MouseEvent) => {
      const deltaX = mv.clientX - startX;
      const deltaMs = pixelsToMs(deltaX);

      // Moving right increases endMs, decreases trimEndMs (showing more tail)
      // Moving left decreases endMs, increases trimEndMs (cropping tail)

      const minEnd = startMs + MIN_CLIP_DURATION_MS;
      let proposedEnd = initialEnd + deltaMs;
      proposedEnd = Math.max(proposedEnd, minEnd);

      // Check asset bounds
      // The total content we are showing is (proposedEnd - startMs).
      // The source content starting point is trimStartMs.
      // So trimStartMs + (proposedEnd - startMs) must be <= assetDurationNodes.

      const currentDuration = proposedEnd - startMs;
      if (trimStartMs + currentDuration > assetDurationMs) {
        // limit end
        proposedEnd = startMs + (assetDurationMs - trimStartMs);
      }

      // Calculate new trimEnd required to satisfy this length?
      // Actually trimEnd is "how much we cut from the end of the original asset".
      // original asset length = assetDurationMs.
      // shown length = currentDuration.
      // trimStart is fixed.
      // trimEnd = assetDuration - trimStart - currentDuration.

      const newTrimEnd = Math.max(
        0,
        assetDurationMs - trimStartMs - (proposedEnd - startMs)
      );

      updateClip(trackId, clipId, {
        endMs: proposedEnd,
        trimEndMs: newTrimEnd,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Time ruler generation
  const majorTicks = useMemo(() => {
    const duration = Math.max(timeline.durationMs, 30000);
    const step =
      zoomLevel >= 150
        ? 500
        : zoomLevel >= 100
        ? 1000
        : zoomLevel >= 50
        ? 5000
        : 10000;
    const ticks = [];
    for (let t = 0; t <= duration + 60000; t += step) {
      ticks.push(t);
    }
    return ticks;
  }, [timeline.durationMs, zoomLevel]);

  const formatTick = (ms: number) => {
    const seconds = ms / 1000;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const trackHeight = 48; // Smaller for mobile
  const HEADER_HEIGHT = 40;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden select-none border-t border-border">
      {/* Shared Vertical Scroll Container */}
      <div className="flex-1 flex overflow-y-auto overflow-x-hidden relative scrollbar-hide">
        {/* Sticky Label Column */}
        <div className="sticky left-0 w-24 md:w-48 flex-shrink-0 z-30 bg-background border-r border-border flex flex-col">
          <div
            className="border-b border-border flex items-center px-3 md:px-6 gap-2 bg-muted/20"
            style={{ height: HEADER_HEIGHT }}
          >
            <Layers size={12} className="text-muted-foreground" />
            <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              Tracks
            </h4>
          </div>

          {timeline.tracks.map((track, i) => (
            <div
              key={track.id}
              className={cn(
                "px-3 md:px-6 flex items-center gap-2 md:gap-3 border-b border-border/50 group hover:bg-muted/30 transition-colors cursor-pointer",
                selectedTrackId === track.id &&
                  "bg-muted/40 border-l-2 border-l-primary"
              )}
              style={{ height: trackHeight }}
              onClick={() => {
                selectTrack(track.id);
                // Deselect clip to focus on track
                selectClip(null);
                selectTextOverlay(null);
              }}
            >
              <div
                className={cn(
                  track.type === "VIDEO"
                    ? "bg-blue-500/10 text-blue-500"
                    : "bg-emerald-500/10 text-emerald-500"
                )}
              >
                {track.type === "VIDEO" ? (
                  <Film size={12} />
                ) : (
                  <Music size={12} />
                )}
              </div>
              <div className="min-w-0 flex flex-col">
                <p className="text-[10px] font-medium text-foreground truncate">
                  {track.type === "VIDEO" ? "Video Track" : "Audio Track"}
                </p>
                <p className="text-[9px] text-muted-foreground truncate">
                  #{i + 1}
                </p>
              </div>
            </div>
          ))}

          {/* OVERLAY Label */}
          <div
            className="px-3 md:px-6 flex items-center gap-2 md:gap-3 border-b border-border/50 group hover:bg-muted/30 transition-colors cursor-default"
            style={{ height: trackHeight }}
          >
            <div className="w-6 h-6 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <Type size={12} />
            </div>
            <div className="min-w-0 flex flex-col">
              <p className="text-[10px] font-medium text-foreground truncate">
                Subtitles
              </p>
              <p className="text-[9px] text-muted-foreground truncate">
                Overlay
              </p>
            </div>
          </div>

          {/* Filler for empty space -> Add Track Button */}
          <div className="flex-1 bg-background border-r border-border p-2 min-h-[100px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-[10px] h-8 text-muted-foreground hover:text-foreground border border-dashed border-border/50"
                  size="sm"
                >
                  <Plus size={12} />
                  Add Track
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40 z-50">
                <DropdownMenuItem onClick={() => addTrack("VIDEO")}>
                  <Film className="mr-2 h-4 w-4" /> Video Track
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addTrack("AUDIO")}>
                  <Music className="mr-2 h-4 w-4" /> Audio Track
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Scrollable Tracks Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto relative scrollbar-track-transparent scrollbar-thumb-muted-foreground/20"
          onScroll={handleScroll}
        >
          <div
            ref={timelineRef}
            className="relative min-h-full bg-background"
            style={{
              width: Math.max(msToPixels(timeline.durationMs) + 1000, 2000),
            }}
            onClick={handleTimelineClick}
          >
            {/* Ruler */}
            <div
              className="border-b border-border relative bg-muted/20 sticky top-0 z-20 cursor-pointer"
              style={{ height: HEADER_HEIGHT }}
              onClick={(e) => {
                e.stopPropagation();
                handleRulerClick(e);
              }}
            >
              {majorTicks.map((tick) => (
                <div
                  key={tick}
                  className="absolute bottom-0 h-2 border-l border-muted-foreground/30 text-[9px] text-muted-foreground pl-1 flex flex-col justify-end pointer-events-none"
                  style={{ left: msToPixels(tick) }}
                >
                  <span className="mb-2">{formatTick(tick)}</span>
                </div>
              ))}
            </div>

            {/* Tracks */}
            {timeline.tracks.map((track) => (
              <div
                key={track.id}
                className="relative border-b border-border/50 hover:bg-muted/5 transition-colors"
                style={{ height: trackHeight }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, track.id)}
              >
                {track.clips.map((clip) => {
                  const width = msToPixels(clip.endMs - clip.startMs);
                  const left = msToPixels(clip.startMs);
                  const isSelected = clip.id === selectedClipId;
                  const clipDuration = clip.endMs - clip.startMs;
                  const trimStart = clip.trimStartMs || 0;
                  const trimEnd = clip.trimEndMs || 0;
                  // If asset is missing, assume infinite or just clip duration
                  const assetDuration =
                    clip.asset?.durationMs ??
                    clipDuration + trimStart + trimEnd;

                  return (
                    <div
                      key={clip.id}
                      className={cn(
                        "absolute top-1 bottom-1 rounded-md overflow-hidden cursor-move group/clip border border-transparent shadow-sm select-none",
                        isSelected
                          ? "border-primary ring-1 ring-primary z-10"
                          : "hover:border-primary/50"
                      )}
                      style={{
                        left,
                        width: Math.max(width, 2), // Ensure visible
                        backgroundColor:
                          track.type === "VIDEO" ? "#3b82f6" : "#10b981",
                        backgroundImage:
                          track.type === "VIDEO"
                            ? "linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)"
                            : "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px)",
                        backgroundSize:
                          track.type === "VIDEO" ? "20px 20px" : "10px 100%",
                      }}
                      onMouseDown={(e) =>
                        handleClipDragStart(
                          e,
                          track.id,
                          clip.id,
                          clip.startMs,
                          clip.endMs
                        )
                      }
                      onClick={(e) => handleClipClick(e, clip.id)}
                    >
                      {/* Thumbs / Waveform */}
                      {track.type === "VIDEO" && clip.asset?.thumbnails && (
                        <div className="absolute inset-0 flex opacity-50 pointer-events-none overflow-hidden">
                          {clip.asset.thumbnails
                            .slice(0, 10)
                            .map((thumb, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={thumb}
                                alt=""
                                className="h-full object-cover flex-1 min-w-[40px]"
                                draggable={false}
                              />
                            ))}
                        </div>
                      )}

                      <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                        <span className="text-[10px] font-medium text-white drop-shadow-md truncate w-full">
                          {clip.asset?.name || "Untitled Clip"}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 z-20 pointer-events-auto">
                          <button
                            className="p-1 bg-destructive text-white rounded-sm opacity-0 group-hover/clip:opacity-100 hover:scale-110 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeClip(track.id, clip.id);
                            }}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      )}

                      {/* Handles */}
                      {isSelected && (
                        <>
                          <div
                            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/50 z-20 flex items-center justify-center group/handle"
                            onMouseDown={(e) =>
                              handleTrimStartDrag(
                                e,
                                track.id,
                                clip.id,
                                clip.startMs,
                                clip.endMs,
                                trimStart
                              )
                            }
                          >
                            <div className="w-1 h-4 bg-white/80 rounded-full" />
                          </div>

                          <div
                            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/50 z-20 flex items-center justify-center group/handle"
                            onMouseDown={(e) =>
                              handleTrimEndDrag(
                                e,
                                track.id,
                                clip.id,
                                clip.startMs,
                                clip.endMs,
                                trimStart,
                                trimEnd,
                                assetDuration
                              )
                            }
                          >
                            <div className="w-1 h-4 bg-white/80 rounded-full" />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Overlays Track */}
            <div
              className="relative border-b border-border/50 bg-background/50"
              style={{ height: trackHeight }}
            >
              {textOverlays.map((overlay) => {
                const overlayX = msToPixels(overlay.startMs);
                const overlayWidth = msToPixels(
                  overlay.endMs - overlay.startMs
                );
                const isSelected = overlay.id === selectedTextOverlayId;

                return (
                  <div
                    key={overlay.id}
                    className={cn(
                      "absolute top-2 bottom-2 rounded-md cursor-pointer transition-all duration-200 group/overlay overflow-hidden border",
                      isSelected
                        ? "ring-2 ring-primary border-primary bg-primary/20 z-10"
                        : "bg-purple-100/50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-200/50 dark:hover:bg-purple-900/30"
                    )}
                    style={{
                      left: overlayX,
                      width: Math.max(overlayWidth, 50),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectTextOverlay(overlay.id);
                    }}
                  >
                    <div className="h-full px-2 flex items-center justify-between">
                      <span className="text-[10px] font-medium truncate text-foreground flex items-center gap-1.5">
                        <Type size={10} className="text-purple-500" />
                        {overlay.text}
                      </span>
                      {isSelected && (
                        <button
                          className="w-5 h-5 bg-destructive text-destructive-foreground rounded flex items-center justify-center opacity-0 group-hover/overlay:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTextOverlay(overlay.id);
                          }}
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <TimelinePlayhead />
          </div>
        </div>
      </div>
    </div>
  );
}
