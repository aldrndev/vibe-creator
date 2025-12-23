import { useRef, useEffect } from 'react';
import { useEditorStore } from '@/stores/editor-store';

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
  
  // Aspect ratio
  const aspectRatio = projectSettings.width / projectSettings.height;
  
  if (!activeClip?.asset?.url) {
    return (
      <div 
        className="bg-black/80 rounded-lg flex items-center justify-center"
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
      className="bg-black rounded-lg overflow-hidden"
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
        muted={false}
        playsInline
      />
    </div>
  );
}
