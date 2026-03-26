import { Film, Layers, Music, Plus, Trash2, Type } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editor-store';

const MIN_CLIP_DURATION_MS = 300;

interface TrimEndDragParams {
  e: React.MouseEvent;
  trackId: string;
  clipId: string;
  startMs: number;
  baseEndMs: number;
  trimStartMs: number;
  assetDurationMs: number;
}

function TimelinePlayhead() {
  const { currentTimeMs, zoomLevel } = useEditorStore(
    useShallow((state) => ({
      currentTimeMs: state.currentTimeMs,
      zoomLevel: state.zoomLevel,
    })),
  );
  const left = (currentTimeMs / 1000) * zoomLevel;

  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-primary pointer-events-none z-40"
      style={{ left }}
    >
      <div className="absolute -top-1 -left-[5px] w-0 h-0 border-l-6 border-r-6 border-t-8 border-l-transparent border-r-transparent border-t-primary" />
    </div>
  );
}

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const {
    timeline,
    zoomLevel,
    scrollLeft,
    selectedClipId,
    textOverlays,
    selectedTextOverlayId,
    selectedTrackId,
    setScrollLeft,
    selectClip,
    addClip,
    updateClip,
    removeClip,
    selectTextOverlay,
    selectTrack,
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
      selectedTrackId: state.selectedTrackId,
      setScrollLeft: state.setScrollLeft,
      selectClip: state.selectClip,
      addClip: state.addClip,
      updateClip: state.updateClip,
      removeClip: state.removeClip,
      selectTextOverlay: state.selectTextOverlay,
      selectTrack: state.selectTrack,
      removeTextOverlay: state.removeTextOverlay,
      addTrack: state.addTrack,
    })),
  );

  const msToPixels = useCallback((ms: number) => (ms / 1000) * zoomLevel, [zoomLevel]);
  const pixelsToMs = useCallback((px: number) => (px / zoomLevel) * 1000, [zoomLevel]);

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
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const ms = pixelsToMs(x);
      useEditorStore.getState().setCurrentTime(Math.max(0, ms));
      selectClip(null);
    },
    [selectClip, pixelsToMs],
  );

  const handleRulerClick = (e: React.MouseEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const ms = pixelsToMs(x);
    useEditorStore.getState().setCurrentTime(Math.max(0, ms));
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('assetId');
    if (!assetId) return;

    const timelineRect = timelineRef.current?.getBoundingClientRect();
    if (!timelineRect) return;

    const x = e.clientX - timelineRect.left;
    const startMs = Math.max(0, pixelsToMs(x));

    addClip(trackId, {
      assetId,
      startMs,
      endMs: startMs + 5000,
      trimStartMs: 0,
      trimEndMs: 0,
      transforms: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      effects: { filters: [], speed: 1, volume: 1, fadeIn: 0, fadeOut: 0 },
    });
  };

  const handleClipDragStart = (
    e: React.MouseEvent,
    trackId: string,
    clipId: string,
    startMs: number,
    endMs: number,
  ) => {
    e.stopPropagation();
    selectClip(clipId);

    const timelineRect = timelineRef.current?.getBoundingClientRect();
    if (!timelineRect) return;

    const startX = e.clientX;
    const initialStart = startMs;
    const duration = endMs - startMs;

    const handleMouseMove = (mv: MouseEvent) => {
      const deltaX = mv.clientX - startX;
      const deltaMs = pixelsToMs(deltaX);
      const newStart = Math.max(0, initialStart + deltaMs);
      updateClip(trackId, clipId, {
        startMs: newStart,
        endMs: newStart + duration,
      });
    };

    const handleMouseUp = () => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('mouseup', handleMouseUp);
    };

    globalThis.addEventListener('mousemove', handleMouseMove);
    globalThis.addEventListener('mouseup', handleMouseUp);
  };

  const handleTrimStartDrag = (
    e: React.MouseEvent,
    trackId: string,
    clipId: string,
    startMs: number,
    endMs: number,
    trimStartMs: number,
  ) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialStart = startMs;
    const initialTrimStart = trimStartMs;
    const initialEnd = endMs;

    const handleMouseMove = (mv: MouseEvent) => {
      const deltaX = mv.clientX - startX;
      const deltaMs = pixelsToMs(deltaX);

      const maxStart = initialEnd - MIN_CLIP_DURATION_MS;
      let proposedStart = initialStart + deltaMs;
      proposedStart = Math.min(proposedStart, maxStart);
      proposedStart = Math.max(0, proposedStart);

      const shift = proposedStart - initialStart;
      let newTrimStart = initialTrimStart + shift;

      if (newTrimStart < 0) {
        newTrimStart = 0;
        proposedStart = initialStart - initialTrimStart;
      }

      updateClip(trackId, clipId, {
        startMs: proposedStart,
        trimStartMs: newTrimStart,
      });
    };

    const handleMouseUp = () => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('mouseup', handleMouseUp);
    };

    globalThis.addEventListener('mousemove', handleMouseMove);
    globalThis.addEventListener('mouseup', handleMouseUp);
  };

  const handleTrimEndDrag = ({
    e,
    trackId,
    clipId,
    startMs,
    baseEndMs,
    trimStartMs,
    assetDurationMs,
  }: TrimEndDragParams) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialEnd = baseEndMs;

    const handleMouseMove = (mv: MouseEvent) => {
      const deltaX = mv.clientX - startX;
      const deltaMs = pixelsToMs(deltaX);

      const minEnd = startMs + MIN_CLIP_DURATION_MS;
      let proposedEnd = initialEnd + deltaMs;
      proposedEnd = Math.max(proposedEnd, minEnd);

      const currentDuration = proposedEnd - startMs;
      if (trimStartMs + currentDuration > assetDurationMs) {
        proposedEnd = startMs + (assetDurationMs - trimStartMs);
      }

      const newTrimEnd = Math.max(0, assetDurationMs - trimStartMs - (proposedEnd - startMs));

      updateClip(trackId, clipId, {
        endMs: proposedEnd,
        trimEndMs: newTrimEnd,
      });
    };

    const handleMouseUp = () => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('mouseup', handleMouseUp);
    };

    globalThis.addEventListener('mousemove', handleMouseMove);
    globalThis.addEventListener('mouseup', handleMouseUp);
  };

  const majorTicks = useMemo(() => {
    const duration = Math.max(timeline.durationMs, 30000);
    let step = 10000;
    if (zoomLevel >= 150) step = 500;
    else if (zoomLevel >= 100) step = 1000;
    else if (zoomLevel >= 50) step = 5000;

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
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const trackHeight = 48;
  const HEADER_HEIGHT = 40;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden select-none border-t border-border">
      <div className="flex-1 flex overflow-y-auto overflow-x-hidden relative scrollbar-hide">
        {/* Track Headers */}
        <div className="sticky left-0 w-24 md:w-48 shrink-0 z-30 bg-background border-r border-border flex flex-col">
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
            <button
              key={track.id}
              type="button"
              className={cn(
                'px-3 md:px-6 flex items-center gap-2 md:gap-3 border-b border-border/50 group hover:bg-muted/30 transition-colors cursor-pointer w-full text-left',
                selectedTrackId === track.id && 'bg-muted/40 border-l-2 border-l-primary',
              )}
              style={{ height: trackHeight }}
              onClick={() => {
                selectTrack(track.id);
                selectClip(null);
                selectTextOverlay(null);
              }}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded flex items-center justify-center shrink-0',
                  track.type === 'VIDEO'
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'bg-emerald-500/10 text-emerald-500',
                )}
              >
                {track.type === 'VIDEO' ? <Film size={12} /> : <Music size={12} />}
              </div>
              <div className="min-w-0 flex flex-col">
                <p className="text-[10px] font-medium text-foreground truncate">
                  {track.type === 'VIDEO' ? 'Video Track' : 'Audio Track'}
                </p>
                <p className="text-[9px] text-muted-foreground truncate">#{i + 1}</p>
              </div>
            </button>
          ))}

          {/* Subtitles Placeholder Header */}
          <div
            className="px-3 md:px-6 flex items-center gap-2 md:gap-3 border-b border-border/50 group hover:bg-muted/30 transition-colors cursor-default"
            style={{ height: trackHeight }}
          >
            <div className="w-6 h-6 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <Type size={12} />
            </div>
            <div className="min-w-0 flex flex-col">
              <p className="text-[10px] font-medium text-foreground truncate">Subtitles</p>
              <p className="text-[9px] text-muted-foreground truncate">Overlay</p>
            </div>
          </div>

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
                <DropdownMenuItem onClick={() => addTrack('VIDEO')}>
                  <Film className="mr-2 h-4 w-4" /> Video Track
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addTrack('AUDIO')}>
                  <Music className="mr-2 h-4 w-4" /> Audio Track
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Timeline Content */}
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
          >
            {/* Playhead Seek Area */}
            <button
              type="button"
              aria-label="Seek playhead"
              className="absolute inset-0 z-0 cursor-default w-full h-full p-0 border-none bg-transparent"
              onClick={handleTimelineClick}
            />

            {/* Ruler */}
            <button
              type="button"
              className="border-b border-border bg-muted/20 sticky top-0 z-20 cursor-pointer w-full text-left"
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
            </button>

            {/* Tracks contents */}
            {timeline.tracks.map((track) => (
              <fieldset
                key={track.id}
                aria-label={`Timeline track ${track.type.toLowerCase()}`}
                className="relative m-0 min-w-0 border-b border-border/50 p-0 hover:bg-muted/5 transition-colors"
                style={{ height: trackHeight }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, track.id)}
              >
                {track.clips.map((clip) => {
                  const width = msToPixels(clip.endMs - clip.startMs);
                  const isSelected = clip.id === selectedClipId;
                  const clipDuration = clip.endMs - clip.startMs;
                  const trimStart = clip.trimStartMs || 0;
                  const assetDuration =
                    clip.asset?.durationMs ?? clipDuration + trimStart + (clip.trimEndMs || 0);

                  return (
                    <div
                      key={clip.id}
                      className={cn(
                        'absolute top-1 bottom-1 rounded-md overflow-hidden group/clip border border-transparent shadow-sm select-none',
                        isSelected
                          ? 'border-primary ring-1 ring-primary z-10'
                          : 'hover:border-primary/50',
                      )}
                      style={{
                        left: msToPixels(clip.startMs),
                        width: Math.max(width, 2),
                        backgroundColor: track.type === 'VIDEO' ? '#3b82f6' : '#10b981',
                        backgroundImage:
                          track.type === 'VIDEO'
                            ? 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)'
                            : 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: track.type === 'VIDEO' ? '20px 20px' : '10px 100%',
                      }}
                    >
                      {/* Main Interaction Button */}
                      <button
                        type="button"
                        className="absolute inset-0 w-full h-full cursor-move z-0"
                        onMouseDown={(e) =>
                          handleClipDragStart(e, track.id, clip.id, clip.startMs, clip.endMs)
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          selectClip(clip.id);
                        }}
                      />

                      {/* Content Overlay */}
                      <div className="absolute inset-0 flex opacity-50 pointer-events-none overflow-hidden">
                        {track.type === 'VIDEO' &&
                          clip.asset?.thumbnails
                            ?.slice(0, 10)
                            .map((thumb) => (
                              <img
                                key={`${clip.id}-${thumb}`}
                                src={thumb}
                                alt=""
                                className="h-full object-cover flex-1 min-w-[40px]"
                                draggable={false}
                              />
                            ))}
                      </div>

                      <div className="absolute inset-x-2 inset-y-0 flex items-center pointer-events-none">
                        <span className="text-[10px] font-medium text-white drop-shadow-md truncate w-full">
                          {clip.asset?.name || 'Untitled Clip'}
                        </span>
                      </div>

                      {/* Interactive Controls */}
                      {isSelected && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 z-20">
                          <button
                            type="button"
                            className="p-1 bg-destructive text-white rounded-sm opacity-0 group-hover/clip:opacity-100 hover:scale-110 transition-all shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeClip(track.id, clip.id);
                            }}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      )}

                      {isSelected && (
                        <>
                          <button
                            type="button"
                            aria-label="Trim clip start"
                            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/50 z-20 flex items-center justify-center group/handle"
                            onMouseDown={(e) =>
                              handleTrimStartDrag(
                                e,
                                track.id,
                                clip.id,
                                clip.startMs,
                                clip.endMs,
                                trimStart,
                              )
                            }
                          >
                            <div className="w-1 h-4 bg-white/80 rounded-full" />
                          </button>
                          <button
                            type="button"
                            aria-label="Trim clip end"
                            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/50 z-20 flex items-center justify-center group/handle"
                            onMouseDown={(e) =>
                              handleTrimEndDrag({
                                e,
                                trackId: track.id,
                                clipId: clip.id,
                                startMs: clip.startMs,
                                baseEndMs: clip.endMs,
                                trimStartMs: trimStart,
                                assetDurationMs: assetDuration,
                              })
                            }
                          >
                            <div className="w-1 h-4 bg-white/80 rounded-full" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </fieldset>
            ))}

            {/* Overlays Track */}
            <div
              className="relative border-b border-border/50 bg-background/50"
              style={{ height: trackHeight }}
            >
              {textOverlays.map((overlay) => {
                const isSelected = overlay.id === selectedTextOverlayId;
                return (
                  <div
                    key={overlay.id}
                    className={cn(
                      'absolute top-2 bottom-2 rounded-md transition-all duration-200 group/overlay overflow-hidden border',
                      isSelected
                        ? 'ring-2 ring-primary border-primary bg-primary/20 z-10'
                        : 'bg-purple-100/50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-200/50 dark:hover:bg-purple-900/30',
                    )}
                    style={{
                      left: msToPixels(overlay.startMs),
                      width: Math.max(msToPixels(overlay.endMs - overlay.startMs), 50),
                    }}
                  >
                    <button
                      type="button"
                      className="absolute inset-0 w-full h-full cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectTextOverlay(overlay.id);
                      }}
                    />
                    <div className="h-full px-2 flex items-center justify-between pointer-events-none relative z-10">
                      <span className="text-[10px] font-medium truncate text-foreground flex items-center gap-1.5">
                        <Type size={10} className="text-purple-500" />
                        {overlay.text}
                      </span>
                      {isSelected && (
                        <button
                          type="button"
                          className="w-5 h-5 bg-destructive text-destructive-foreground rounded flex items-center justify-center opacity-0 group-hover/overlay:opacity-100 transition-opacity pointer-events-auto shadow-lg"
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
