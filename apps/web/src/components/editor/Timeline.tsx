import { useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { Trash2, Music, Type } from 'lucide-react';

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const {
    timeline,
    currentTimeMs,
    zoomLevel,
    scrollLeft,
    selectedClipId,
    textOverlays,
    selectedTextOverlayId,
    setCurrentTime,
    setScrollLeft,
    selectClip,
    updateClip,
    removeClip,
    selectTextOverlay,
    removeTextOverlay,
  } = useEditorStore();
  
  const msToPixels = useCallback((ms: number) => (ms / 1000) * zoomLevel, [zoomLevel]);
  const pixelsToMs = useCallback((px: number) => (px / zoomLevel) * 1000, [zoomLevel]);
  
  // Render time ruler
  const renderRuler = () => {
    const visibleWidth = 1000; // Fallback width, actual sizing handled by CSS
    const totalWidth = Math.max(msToPixels(timeline.durationMs) + 500, visibleWidth);
    const step = zoomLevel >= 100 ? 1000 : zoomLevel >= 50 ? 5000 : 10000; // 1s, 5s, or 10s
    
    const marks: React.ReactNode[] = [];
    for (let ms = 0; ms <= timeline.durationMs + 60000; ms += step) {
      const x = msToPixels(ms);
      const seconds = ms / 1000;
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      
      marks.push(
        <div
          key={ms}
          className="absolute top-0 h-full flex flex-col items-center"
          style={{ left: x }}
        >
          <span className="text-[10px] text-foreground/50">
            {`${minutes}:${secs.toString().padStart(2, '0')}`}
          </span>
          <div className="w-px h-2 bg-foreground/30" />
        </div>
      );
    }
    
    return (
      <div className="h-6 relative border-b border-divider bg-background/50" style={{ width: totalWidth }}>
        {marks}
      </div>
    );
  };
  
  // Handle ruler click to seek
  const handleRulerClick = (e: React.MouseEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left + scrollLeft;
    const ms = pixelsToMs(x);
    setCurrentTime(Math.max(0, ms));
  };
  
  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };
  
  // Track height
  const trackHeight = 48;
  
  // Playhead position
  const playheadX = msToPixels(currentTimeMs);
  
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Track labels */}
      <div className="flex">
        <div className="w-32 flex-shrink-0 border-r border-divider">
          <div className="h-6 border-b border-divider" />
          {timeline.tracks.map((track) => (
            <div
              key={track.id}
              className="h-12 px-2 flex items-center gap-2 border-b border-divider text-sm"
            >
              {track.type === 'VIDEO' && <span className="truncate">🎬 VIDEO</span>}
              {track.type === 'AUDIO' && <span className="truncate flex items-center gap-1"><Music size={14} /> AUDIO</span>}
            </div>
          ))}
          {/* TEXT track label */}
          <div className="h-12 px-2 flex items-center gap-2 border-b border-divider text-sm">
            <Type size={14} />
            <span className="truncate">TEXT</span>
          </div>
        </div>
        
        {/* Timeline area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          onScroll={handleScroll}
        >
          <div
            ref={timelineRef}
            className="relative"
            style={{ width: Math.max(msToPixels(timeline.durationMs) + 500, 1000) }}
            onClick={handleRulerClick}
          >
            {/* Ruler */}
            {renderRuler()}
            
            {/* Tracks */}
            {timeline.tracks.map((track) => (
              <div
                key={track.id}
                className="relative border-b border-divider bg-foreground/5"
                style={{ height: trackHeight }}
              >
                {/* Clips */}
                {track.clips.map((clip) => {
                  const clipX = msToPixels(clip.startMs);
                  const clipWidth = msToPixels(clip.endMs - clip.startMs);
                  const isSelected = clip.id === selectedClipId;
                  
                  return (
                    <div
                      key={clip.id}
                      className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all ${
                        isSelected
                          ? 'ring-2 ring-primary bg-primary/30'
                          : 'bg-primary/20 hover:bg-primary/30'
                      } ${track.type === 'AUDIO' ? 'bg-green-500/20' : ''}`}
                      style={{
                        left: clipX,
                        width: Math.max(clipWidth, 20),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectClip(clip.id);
                      }}
                    >
                      {/* Clip content */}
                      <div className="h-full w-full absolute inset-0 overflow-hidden rounded">
                        {/* Thumbnails background */}
                        {clip.asset?.thumbnails && clip.asset.thumbnails.length > 0 && (
                          <div className="absolute inset-0 flex opacity-50">
                            {/* Repeat thumbnails to fill width */}
                            {Array.from({ length: Math.ceil(clipWidth / 60) }).map((_, i) => (
                              <img
                                key={i}
                                src={clip.asset!.thumbnails![i % clip.asset!.thumbnails!.length]}
                                className="h-full object-cover w-[60px]"
                                alt=""
                                draggable={false}
                              />
                            ))}
                          </div>
                        )}
                        
                        <div className="relative h-full px-2 flex items-center justify-between">
                          <span className="text-xs truncate text-foreground/90 font-medium drop-shadow-md flex items-center gap-1">
                            {track.type === 'AUDIO' && <Music size={12} className="flex-shrink-0" />}
                            {clip.asset?.name ?? 'Clip'}
                          </span>
                          {/* Delete button on selected clips */}
                          {isSelected && (
                            <button
                              className="p-1 bg-danger/80 hover:bg-danger rounded text-white flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeClip(track.id, clip.id);
                              }}
                              title="Delete clip"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Trim handles (shown when selected) */}
                      {isSelected && (
                        <>
                          <div
                            className="absolute left-0 top-0 bottom-0 w-2 bg-primary cursor-ew-resize rounded-l"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const startX = e.clientX;
                              const startMs = clip.startMs;
                              
                              const handleMove = (moveE: MouseEvent) => {
                                const delta = moveE.clientX - startX;
                                const newStartMs = Math.max(0, startMs + pixelsToMs(delta));
                                if (newStartMs < clip.endMs - 100) {
                                  updateClip(track.id, clip.id, { startMs: newStartMs });
                                }
                              };
                              
                              const handleUp = () => {
                                window.removeEventListener('mousemove', handleMove);
                                window.removeEventListener('mouseup', handleUp);
                              };
                              
                              window.addEventListener('mousemove', handleMove);
                              window.addEventListener('mouseup', handleUp);
                            }}
                          />
                          <div
                            className="absolute right-0 top-0 bottom-0 w-2 bg-primary cursor-ew-resize rounded-r"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const startX = e.clientX;
                              const endMs = clip.endMs;
                              
                              const handleMove = (moveE: MouseEvent) => {
                                const delta = moveE.clientX - startX;
                                const newEndMs = Math.max(clip.startMs + 100, endMs + pixelsToMs(delta));
                                updateClip(track.id, clip.id, { endMs: newEndMs });
                              };
                              
                              const handleUp = () => {
                                window.removeEventListener('mousemove', handleMove);
                                window.removeEventListener('mouseup', handleUp);
                              };
                              
                              window.addEventListener('mousemove', handleMove);
                              window.addEventListener('mouseup', handleUp);
                            }}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            
            {/* Text Overlays Track */}
            <div
              className="relative border-b border-divider bg-purple-500/5"
              style={{ height: trackHeight }}
            >
              {textOverlays.map((overlay) => {
                const overlayX = msToPixels(overlay.startMs);
                const overlayWidth = msToPixels(overlay.endMs - overlay.startMs);
                const isSelected = overlay.id === selectedTextOverlayId;
                
                return (
                  <div
                    key={overlay.id}
                    className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-purple-500 bg-purple-500/40'
                        : 'bg-purple-500/20 hover:bg-purple-500/30'
                    }`}
                    style={{
                      left: overlayX,
                      width: Math.max(overlayWidth, 40),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectTextOverlay(overlay.id);
                    }}
                  >
                    <div className="h-full px-2 flex items-center justify-between">
                      <span className="text-xs truncate text-foreground/90 font-medium flex items-center gap-1">
                        <Type size={12} className="flex-shrink-0" />
                        {overlay.text.substring(0, 20)}{overlay.text.length > 20 ? '...' : ''}
                      </span>
                      {isSelected && (
                        <button
                          className="p-1 bg-danger/80 hover:bg-danger rounded text-white flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTextOverlay(overlay.id);
                          }}
                          title="Delete text overlay"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
              style={{ left: playheadX }}
            >
              <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
