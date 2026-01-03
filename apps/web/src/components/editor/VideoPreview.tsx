import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { FILTER_PRESETS } from './InspectorPanel';
import { clsx } from 'clsx';

// Resize handle positions
type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

interface DragState {
  id: string;
  type: 'move' | 'resize' | 'rotate';
  handle?: HandlePosition;
  startX: number;
  startY: number;
  startPosX: number;
  startPosY: number;
  startFontSize: number;
  startRotation: number;
}

// Text overlay layer component with drag, resize, and rotation
function TextOverlayLayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { textOverlays, currentTimeMs, selectedTextOverlayId, selectTextOverlay, updateTextOverlay } = useEditorStore();
  const [dragState, setDragState] = useState<DragState | null>(null);
  
  // Filter overlays visible at current time
  const visibleOverlays = textOverlays.filter(
    overlay => currentTimeMs >= overlay.startMs && currentTimeMs < overlay.endMs
  );
  
  // Handle drag/resize/rotate move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;
    
    if (dragState.type === 'move') {
      // Movement - constrain to 5-95%
      const newX = Math.max(5, Math.min(95, dragState.startPosX + deltaX));
      const newY = Math.max(5, Math.min(95, dragState.startPosY + deltaY));
      updateTextOverlay(dragState.id, { x: newX, y: newY });
      
    } else if (dragState.type === 'resize') {
      // Resize by changing font size
      const deltaSize = (deltaX + deltaY) / 2; // Average of both directions
      const scaleFactor = dragState.handle?.includes('w') || dragState.handle?.includes('n') ? -1 : 1;
      const newFontSize = Math.max(12, Math.min(200, dragState.startFontSize + deltaSize * scaleFactor));
      updateTextOverlay(dragState.id, { fontSize: Math.round(newFontSize) });
      
    } else if (dragState.type === 'rotate') {
      // Rotation - calculate angle from center
      const overlay = textOverlays.find(o => o.id === dragState.id);
      if (!overlay) return;
      
      const centerX = rect.left + (overlay.x / 100) * rect.width;
      const centerY = rect.top + (overlay.y / 100) * rect.height;
      
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      const snappedAngle = Math.round(angle / 5) * 5; // Snap to 5 degree increments
      
      // Get current rotation from store
      if (overlay.rotation !== snappedAngle) {
        updateTextOverlay(dragState.id, { rotation: snappedAngle });
      }
    }
  }, [dragState, updateTextOverlay, textOverlays]);
  
  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);
  
  // Attach/detach global mouse listeners
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
  
  // Start move
  const handleMoveStart = (e: React.MouseEvent, overlay: typeof textOverlays[0]) => {
    e.stopPropagation();
    selectTextOverlay(overlay.id);
    setDragState({
      id: overlay.id,
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      startPosX: overlay.x,
      startPosY: overlay.y,
      startFontSize: overlay.fontSize,
      startRotation: overlay.rotation || 0,
    });
  };
  
  // Start resize
  const handleResizeStart = (e: React.MouseEvent, overlay: typeof textOverlays[0], handle: HandlePosition) => {
    e.stopPropagation();
    selectTextOverlay(overlay.id);
    setDragState({
      id: overlay.id,
      type: 'resize',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: overlay.x,
      startPosY: overlay.y,
      startFontSize: overlay.fontSize,
      startRotation: overlay.rotation || 0,
    });
  };
  
  // Start rotate
  const handleRotateStart = (e: React.MouseEvent, overlay: typeof textOverlays[0]) => {
    e.stopPropagation();
    selectTextOverlay(overlay.id);
    setDragState({
      id: overlay.id,
      type: 'rotate',
      startX: e.clientX,
      startY: e.clientY,
      startPosX: overlay.x,
      startPosY: overlay.y,
      startFontSize: overlay.fontSize,
      startRotation: overlay.rotation || 0,
    });
  };
  
  // Render resize handles
  const renderHandles = (_overlayId: string, overlay: typeof textOverlays[0]) => {
    const handleClass = "absolute w-3 h-3 bg-primary border-2 border-white rounded-full shadow-md cursor-pointer z-10";
    const handles: { pos: HandlePosition; style: React.CSSProperties; cursor: string }[] = [
      { pos: 'nw', style: { top: -6, left: -6 }, cursor: 'nwse-resize' },
      { pos: 'n', style: { top: -6, left: '50%', transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
      { pos: 'ne', style: { top: -6, right: -6 }, cursor: 'nesw-resize' },
      { pos: 'e', style: { top: '50%', right: -6, transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
      { pos: 'se', style: { bottom: -6, right: -6 }, cursor: 'nwse-resize' },
      { pos: 's', style: { bottom: -6, left: '50%', transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
      { pos: 'sw', style: { bottom: -6, left: -6 }, cursor: 'nesw-resize' },
      { pos: 'w', style: { top: '50%', left: -6, transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
    ];
    
    return (
      <>
        {handles.map(({ pos, style, cursor }) => (
          <div
            key={pos}
            className={handleClass}
            style={{ ...style, cursor }}
            onMouseDown={(e) => handleResizeStart(e, overlay, pos)}
          />
        ))}
        {/* Rotation handle */}
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 w-4 h-4 bg-secondary border-2 border-white rounded-full shadow-md cursor-grab z-10"
          onMouseDown={(e) => handleRotateStart(e, overlay)}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-secondary/50" />
        </div>
      </>
    );
  };
  
  if (visibleOverlays.length === 0) return null;
  
  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {visibleOverlays.map(overlay => {
        const isSelected = overlay.id === selectedTextOverlayId;
        const isDragging = dragState?.id === overlay.id;
        const rotation = overlay.rotation || 0;
        
        // Animation progress
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
              transform: `translate(-50%, ${progress < 0.1 ? (1 - progress * 10) * 20 : 0}px) rotate(${rotation}deg)`,
              opacity: progress < 0.1 ? progress * 10 : 1,
            };
            break;
          case 'slide-down':
            animationStyle = {
              transform: `translate(-50%, ${progress < 0.1 ? -(1 - progress * 10) * 20 : 0}px) rotate(${rotation}deg)`,
              opacity: progress < 0.1 ? progress * 10 : 1,
            };
            break;
          default:
            animationStyle = { transform: `translate(-50%, -50%) rotate(${rotation}deg)` };
        }
        
        return (
          <div
            key={overlay.id}
            className={clsx(
              'absolute pointer-events-auto cursor-grab transition-all select-none',
              isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-transparent',
              isDragging && dragState?.type === 'move' && 'cursor-grabbing'
            )}
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              transform: animationStyle.transform || `translate(-50%, -50%) rotate(${rotation}deg)`,
              fontFamily: overlay.fontFamily,
              fontSize: `${overlay.fontSize}px`,
              fontWeight: overlay.fontWeight,
              fontStyle: overlay.fontStyle,
              color: overlay.color,
              backgroundColor: overlay.backgroundColor || 'transparent',
              padding: overlay.backgroundColor ? '8px 16px' : '4px 8px',
              borderRadius: 4,
              textAlign: overlay.textAlign,
              whiteSpace: 'pre-wrap',
              opacity: animationStyle.opacity ?? 1,
              maxWidth: '80%',
            }}
            onMouseDown={(e) => handleMoveStart(e, overlay)}
          >
            {overlay.text}
            {/* Resize & rotation handles when selected */}
            {isSelected && renderHandles(overlay.id, overlay)}
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
