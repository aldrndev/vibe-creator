/**
 * Timeline data structure from the video editor.
 * Contains clips, text overlays, audio tracks, and output settings.
 */
export interface TimelineData {
  /** Video clips with timing and optional transforms/effects */
  clips: Array<{
    localPath: string;
    mediaType?: 'video' | 'image';
    startTime: number;
    endTime: number;
    transforms?: {
      x: number;
      y: number;
      scale: number;
      rotation: number;
      opacity: number;
    };
    effects?: {
      filters: string[];
      speed: number;
      volume: number;
      fadeIn: number;
      fadeOut: number;
      transitionIn?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom';
      transitionOut?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom';
      motion?: 'none' | 'zoom-in' | 'zoom-out';
    };
  }>;
  /** Text overlays with positioning and styling */
  textOverlays?: Array<{
    id: string;
    content: string;
    startMs: number;
    endMs: number;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    fontWeight?: string;
    color: string;
    backgroundColor?: string;
    animation?: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'typewriter';
    animationIn?: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'pop' | 'zoom' | 'typewriter';
    animationOut?: 'none' | 'fade-out' | 'slide-out' | 'shrink';
    animationLoop?: 'none' | 'pulse' | 'shake' | 'glow';
  }>;
  /** Additional audio tracks to mix */
  audioTracks?: Array<{
    localPath: string;
    startTime: number;
    endTime: number;
    timelineStartMs: number;
    timelineEndMs: number;
    volume: number;
    fadeInMs: number;
    fadeOutMs: number;
  }>;
  /** Output video settings */
  settings: {
    width: number;
    height: number;
    fps: number;
    backgroundColor?: string;
    backgroundMode?: 'solid' | 'blur';
    backgroundBlurAmount?: number;
    backgroundBlurZoom?: number;
    backgroundDim?: number;
    backgroundSaturation?: number;
  };
}
