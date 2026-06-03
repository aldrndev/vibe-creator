/**
 * Timeline data structure from the video editor.
 * Contains clips, text overlays, audio tracks, and output settings.
 */
import type { LoopRenderSpec } from '@/modules/loop/loop.schemas';
import type { ReactionRenderSpec } from '@/modules/reaction/reaction.schemas';

export interface TimelineData {
  /** Alternative rendering contract for focused tools using the export worker. */
  renderKind?: 'timeline' | 'loop-creator' | 'reaction-creator';
  /** Validated long-loop render specification when `renderKind` is `loop-creator`. */
  loopSpec?: LoopRenderSpec;
  /** Validated reaction render specification when `renderKind` is `reaction-creator`. */
  reactionSpec?: ReactionRenderSpec;
  /** Video clips with timing and optional transforms/effects */
  clips: Array<{
    localPath: string;
    layerId?: string;
    mediaType?: 'video' | 'image';
    startTime: number;
    endTime: number;
    timelineStartMs?: number;
    timelineEndMs?: number;
    zIndex?: number;
    fit?: 'contain' | 'cover';
    visible?: boolean;
    loop?: boolean;
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
    fontStyle?: 'normal' | 'italic';
    color: string;
    backgroundColor?: string;
    backgroundOpacity?: number;
    zIndex?: number;
    opacity?: number;
    rotation?: number;
    textAlign?: 'left' | 'center' | 'right';
    visible?: boolean;
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
    loop?: boolean;
  }>;
  /** Output video settings */
  settings: {
    width: number;
    height: number;
    fps: number;
    backgroundColor?: string;
    backgroundMode?: 'solid' | 'blur' | 'gradient' | 'image';
    backgroundOpacity?: number;
    backgroundBlurAmount?: number;
    backgroundBlurZoom?: number;
    backgroundDim?: number;
    backgroundSaturation?: number;
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    backgroundGradientAngle?: number;
    backgroundImagePath?: string;
    backgroundImageFit?: 'contain' | 'cover';
    backgroundImageBlurAmount?: number;
    backgroundImageDim?: number;
    backgroundImagePositionX?: number;
    backgroundImagePositionY?: number;
    backgroundImageScale?: number;
  };
}
