import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { FILTER_PRESETS } from './InspectorPanel';
import { clsx } from 'clsx';

// Text overlay layer component with drag functionality
function TextOverlayLayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { textOverlays, currentTimeMs, selectedTextOverlayId, selectTextOverlay, updateTextOverlay } = useEditorStore();
  const [dragState, setDragState] = useState<{ id: string; startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  
  // Filter overlays visible at current time
  const visibleOverlays = textOverlays.filter(
    overlay => currentTimeMs >= overlay.startMs && currentTimeMs < overlay.endMs
  );
  
  // Handle drag move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;
    
    // Calculate new position (constrained to 5-95%)
    const newX = Math.max(5, Math.min(95, dragState.startPosX + deltaX));
    const newY = Math.max(5, Math.min(95, dragState.startPosY + deltaY));
    
    updateTextOverlay(dragState.id, { x: newX, y: newY });
  }, [dragState, updateTextOverlay]);
  
  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);
  
  // Attach/detach global mouse listeners for drag
  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);
  
  // Start drag
  const handleMouseDown = (e: React.MouseEvent, overlayId: string, currentX: number, currentY: number) => {
    e.stopPropagation();
    selectTextOverlay(overlayId);
    setDragState({
      id: overlayId,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: currentX,
      startPosY: currentY,
    });
  };
  
  if (visibleOverlays.length === 0) return null;
  
  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {visibleOverlays.map(overlay => {
        const isSelected = overlay.id === selectedTextOverlayId;
        const isDragging = dragState?.id === overlay.id;
        
        // Calculate animation progress for fade effect
        const durationMs = overlay.endMs - overlay.startMs;
        const progress = (currentTimeMs - overlay.startMs) / durationMs;
        
        let animationStyle: React.CSSProperties = {};
        switch (overlay.animation) {
          case 'fade':
            animationStyle = {
              opacity: progress < 0.1 ? progress * 10 : progress > 0.9 ? (1 - progress) * 10 : 1,
            };
            break;
          case 'slide-up':
            animationStyle = {
              transform: `translate(-50%, ${progress < 0.1 ? (1 - progress * 10) * 20 : 0}px)`,
              opacity: progress < 0.1 ? progress * 10 : 1,
            };
            break;
          case 'slide-down':
            animationStyle = {
              transform: `translate(-50%, ${progress < 0.1 ? -(1 - progress * 10) * 20 : 0}px)`,
              opacity: progress < 0.1 ? progress * 10 : 1,
            };
            break;
        }
        
        return (
          <div
            key={overlay.id}
            className={clsx(
              'absolute pointer-events-auto cursor-grab transition-all select-none',
              isSelected && 'ring-2 ring-primary ring-offset-2',
              isDragging && 'cursor-grabbing'
            )}
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              transform: animationStyle.transform || 'translate(-50%, -50%)',
              fontFamily: overlay.fontFamily,
              fontSize: `${overlay.fontSize}px`,
              fontWeight: overlay.fontWeight,
              fontStyle: overlay.fontStyle,
              color: overlay.color,
              backgroundColor: overlay.backgroundColor || 'transparent',
              padding: overlay.backgroundColor ? '8px 16px' : 0,
              borderRadius: 4,
              textAlign: overlay.textAlign,
              whiteSpace: 'pre-wrap',
              opacity: animationStyle.opacity ?? 1,
              maxWidth: '80%',
            }}
            onMouseDown={(e) => handleMouseDown(e, overlay.id, overlay.x, overlay.y)}
          >
            {overlay.text}
          </div>
        );
      })}
    </div>
  );
}

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const {
    timeline,
    currentTimeMs,
    isPlaying,
    projectSettings,
  } = useEditorStore();
  
  // Find active clip at current time
  const activeClip = (() => {
    const videoTrack = timeline.tracks.find(t => t.type === 'VIDEO');
    if (!videoTrack) return null;
    
    return videoTrack.clips.find(
      c => currentTimeMs >= c.startMs && currentTimeMs < c.endMs
    );
  })();
  
  // Calculate CSS styles for filters and transforms
  const videoStyles = useMemo(() => {
    if (!activeClip) return {};
    
    const transforms = activeClip.transforms || { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
    const effects = activeClip.effects || { filters: [], speed: 1, volume: 1, fadeIn: 0, fadeOut: 0 };
    
    // Build CSS filter string from filter presets
    let filterCss = '';
    if (effects.filters && effects.filters.length > 0) {
      const filterId = effects.filters[0];
      const preset = FILTER_PRESETS.find(p => p.id === filterId);
      if (preset) {
        filterCss = preset.css;
      }
    }
    
    // Build CSS transform string
    const transformCss = `
      translate(${transforms.x}px, ${transforms.y}px)
      scale(${transforms.scale})
      rotate(${transforms.rotation}deg)
    `.trim();
    
    return {
      filter: filterCss || undefined,
      transform: transformCss,
      opacity: transforms.opacity,
      transformOrigin: 'center center',
      transition: 'filter 0.2s ease, transform 0.1s ease, opacity 0.2s ease',
    };
  }, [activeClip]);
  
  // Sync video with timeline
  useEffect(() => {
    if (!videoRef.current || !activeClip?.asset?.url) return;
    
    const video = videoRef.current;
    const clipTimeMs = currentTimeMs - activeClip.startMs + activeClip.trimStartMs;
    const videoTimeSec = clipTimeMs / 1000;
    
    // Only seek if difference is significant
    if (Math.abs(video.currentTime - videoTimeSec) > 0.1) {
      video.currentTime = videoTimeSec;
    }
    
    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [currentTimeMs, isPlaying, activeClip]);
  
  // Handle video source change
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (activeClip?.asset?.url) {
      videoRef.current.src = activeClip.asset.url;
      videoRef.current.load();
    }
  }, [activeClip?.asset?.url]);
  
  // Handle volume changes
  useEffect(() => {
    if (!videoRef.current || !activeClip) return;
    
    const volume = activeClip.effects?.volume ?? 1;
    videoRef.current.volume = Math.max(0, Math.min(1, volume)); // Clamp to 0-1
    videoRef.current.muted = volume === 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional optimization
  }, [activeClip?.effects?.volume]);
  
  // Handle playback speed changes
  useEffect(() => {
    if (!videoRef.current || !activeClip) return;
    
    const speed = activeClip.effects?.speed ?? 1;
    videoRef.current.playbackRate = speed;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional optimization
  }, [activeClip?.effects?.speed]);
  
  // Aspect ratio
  const aspectRatio = projectSettings.width / projectSettings.height;
  
  if (!activeClip?.asset?.url) {
    return (
      <div 
        className="bg-content2 dark:bg-black/80 rounded-lg flex items-center justify-center"
        style={{ 
          aspectRatio,
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
        }}
      >
        <div className="text-foreground/40 text-center p-8">
          <p className="text-lg mb-2">Tidak ada video</p>
          <p className="text-sm">Import video untuk mulai editing</p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="bg-content2 dark:bg-black rounded-lg overflow-hidden relative"
      style={{ 
        aspectRatio,
        maxWidth: '100%',
        maxHeight: '100%',
        width: 'auto',
        height: 'auto',
      }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        style={videoStyles}
        muted={false}
        playsInline
      />
      
      {/* Text Overlays */}
      <TextOverlayLayer />
    </div>
  );
}
