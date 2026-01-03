import { useState, useCallback, useRef, useEffect } from 'react';
import { WaveformDisplay } from './WaveformDisplay';
import { useEditorStore, type EditorClip } from '@/stores/editor-store';
import { clsx } from 'clsx';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioClipProps {
  clip: EditorClip;
  trackId: string;
  pixelsPerMs: number;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Audio clip component with waveform visualization
 * Shows waveform, fade handles, and volume indicator
 */
export function AudioClip({
  clip,
  trackId,
  pixelsPerMs,
  isSelected,
  onSelect,
}: AudioClipProps) {
  const { updateClip } = useEditorStore();
  
  const [isDraggingFadeIn, setIsDraggingFadeIn] = useState(false);
  const [isDraggingFadeOut, setIsDraggingFadeOut] = useState(false);
  const clipRef = useRef<HTMLDivElement>(null);
  
  const clipWidth = (clip.endMs - clip.startMs) * pixelsPerMs;
  const clipLeft = clip.startMs * pixelsPerMs;
  
  const fadeInMs = clip.effects?.fadeIn ?? 0;
  const fadeOutMs = clip.effects?.fadeOut ?? 0;
  const volume = clip.effects?.volume ?? 1;
  const isMuted = volume === 0;

  // Handle fade in drag
  const handleFadeInDrag = useCallback((e: MouseEvent) => {
    if (!clipRef.current || !isDraggingFadeIn) return;
    
    const rect = clipRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fadeMs = Math.max(0, Math.min(x / pixelsPerMs, clip.endMs - clip.startMs - fadeOutMs));
    
    updateClip(trackId, clip.id, {
      effects: { ...clip.effects, fadeIn: Math.round(fadeMs) },
    });
  }, [isDraggingFadeIn, pixelsPerMs, clip, trackId, updateClip, fadeOutMs]);

  // Handle fade out drag
  const handleFadeOutDrag = useCallback((e: MouseEvent) => {
    if (!clipRef.current || !isDraggingFadeOut) return;
    
    const rect = clipRef.current.getBoundingClientRect();
    const x = rect.right - e.clientX;
    const fadeMs = Math.max(0, Math.min(x / pixelsPerMs, clip.endMs - clip.startMs - fadeInMs));
    
    updateClip(trackId, clip.id, {
      effects: { ...clip.effects, fadeOut: Math.round(fadeMs) },
    });
  }, [isDraggingFadeOut, pixelsPerMs, clip, trackId, updateClip, fadeInMs]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    setIsDraggingFadeIn(false);
    setIsDraggingFadeOut(false);
  }, []);

  // Global mouse handlers
  useEffect(() => {
    if (isDraggingFadeIn || isDraggingFadeOut) {
      window.addEventListener('mousemove', isDraggingFadeIn ? handleFadeInDrag : handleFadeOutDrag);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', isDraggingFadeIn ? handleFadeInDrag : handleFadeOutDrag);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingFadeIn, isDraggingFadeOut, handleFadeInDrag, handleFadeOutDrag, handleMouseUp]);

  // Calculate fade in/out gradients
  const fadeInWidth = fadeInMs * pixelsPerMs;
  const fadeOutWidth = fadeOutMs * pixelsPerMs;

  return (
    <div
      ref={clipRef}
      className={clsx(
        'absolute top-1 bottom-1 rounded-md overflow-hidden cursor-pointer transition-all',
        'bg-secondary/30 hover:bg-secondary/40',
        isSelected && 'ring-2 ring-primary'
      )}
      style={{
        left: clipLeft,
        width: clipWidth,
      }}
      onClick={onSelect}
    >
      {/* Waveform */}
      {clip.asset?.url && (
        <WaveformDisplay
          audioUrl={clip.asset.url}
          assetId={clip.assetId ?? clip.id}
          width={Math.max(clipWidth, 50)}
          height={40}
          color={isMuted ? '#71717a' : '#a78bfa'}
          className="absolute inset-0"
          startMs={clip.trimStartMs}
          endMs={clip.trimStartMs + (clip.endMs - clip.startMs)}
        />
      )}

      {/* Fade in overlay */}
      {fadeInMs > 0 && (
        <div
          className="absolute top-0 bottom-0 left-0 pointer-events-none"
          style={{
            width: fadeInWidth,
            background: 'linear-gradient(to right, rgba(0,0,0,0.7), transparent)',
          }}
        />
      )}

      {/* Fade out overlay */}
      {fadeOutMs > 0 && (
        <div
          className="absolute top-0 bottom-0 right-0 pointer-events-none"
          style={{
            width: fadeOutWidth,
            background: 'linear-gradient(to left, rgba(0,0,0,0.7), transparent)',
          }}
        />
      )}

      {/* Fade in handle */}
      {isSelected && (
        <div
          className="absolute top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/50 z-10"
          style={{ left: fadeInWidth - 4 }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDraggingFadeIn(true);
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-full" />
        </div>
      )}

      {/* Fade out handle */}
      {isSelected && (
        <div
          className="absolute top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/50 z-10"
          style={{ right: fadeOutWidth - 4 }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDraggingFadeOut(true);
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-full" />
        </div>
      )}

      {/* Volume indicator */}
      <div className="absolute top-1 right-1 p-0.5 rounded bg-black/50">
        {isMuted ? (
          <VolumeX size={12} className="text-white/70" />
        ) : (
          <Volume2 size={12} className="text-white/70" />
        )}
      </div>

      {/* Clip name */}
      <div className="absolute bottom-1 left-1 text-[10px] text-white/80 truncate max-w-[calc(100%-16px)]">
        {clip.asset?.name || 'Audio'}
      </div>
    </div>
  );
}
