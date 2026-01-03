/**
 * Text Animation System
 * Animations with timeline binding for text overlays
 */

export type AnimationType =
  | 'none'
  | 'fade-in'
  | 'fade-out'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale-in'
  | 'scale-out'
  | 'typewriter'
  | 'bounce'
  | 'shake';

export type AnimationEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';

export interface TextAnimation {
  id: string;
  type: AnimationType;
  /** Animation duration in ms */
  durationMs: number;
  /** Delay before animation starts (relative to overlay startMs) */
  delayMs: number;
  /** Easing function */
  easing: AnimationEasing;
  /** Direction for directional animations */
  direction?: 'in' | 'out';
}

export interface TextAnimationPreset {
  id: string;
  name: string;
  enter: TextAnimation | null;
  exit: TextAnimation | null;
}

/**
 * Animation presets for text overlays
 */
export const TEXT_ANIMATION_PRESETS: TextAnimationPreset[] = [
  {
    id: 'none',
    name: 'None',
    enter: null,
    exit: null,
  },
  {
    id: 'fade',
    name: 'Fade In/Out',
    enter: { id: 'fade-in', type: 'fade-in', durationMs: 300, delayMs: 0, easing: 'ease-out', direction: 'in' },
    exit: { id: 'fade-out', type: 'fade-out', durationMs: 300, delayMs: 0, easing: 'ease-in', direction: 'out' },
  },
  {
    id: 'slide-up',
    name: 'Slide Up',
    enter: { id: 'slide-up-in', type: 'slide-up', durationMs: 400, delayMs: 0, easing: 'ease-out', direction: 'in' },
    exit: { id: 'slide-up-out', type: 'slide-up', durationMs: 400, delayMs: 0, easing: 'ease-in', direction: 'out' },
  },
  {
    id: 'slide-down',
    name: 'Slide Down',
    enter: { id: 'slide-down-in', type: 'slide-down', durationMs: 400, delayMs: 0, easing: 'ease-out', direction: 'in' },
    exit: { id: 'slide-down-out', type: 'slide-down', durationMs: 400, delayMs: 0, easing: 'ease-in', direction: 'out' },
  },
  {
    id: 'scale',
    name: 'Scale',
    enter: { id: 'scale-in', type: 'scale-in', durationMs: 350, delayMs: 0, easing: 'ease-out', direction: 'in' },
    exit: { id: 'scale-out', type: 'scale-out', durationMs: 350, delayMs: 0, easing: 'ease-in', direction: 'out' },
  },
  {
    id: 'typewriter',
    name: 'Typewriter',
    enter: { id: 'typewriter-in', type: 'typewriter', durationMs: 1000, delayMs: 0, easing: 'linear', direction: 'in' },
    exit: { id: 'fade-out', type: 'fade-out', durationMs: 300, delayMs: 0, easing: 'ease-in', direction: 'out' },
  },
  {
    id: 'bounce',
    name: 'Bounce In',
    enter: { id: 'bounce-in', type: 'bounce', durationMs: 600, delayMs: 0, easing: 'bounce', direction: 'in' },
    exit: { id: 'fade-out', type: 'fade-out', durationMs: 300, delayMs: 0, easing: 'ease-in', direction: 'out' },
  },
];

/**
 * Calculate animation progress (0-1)
 */
export function calculateAnimationProgress(
  currentMs: number,
  startMs: number,
  endMs: number,
  animation: TextAnimation
): number {
  const overlayDuration = endMs - startMs;
  const isExitAnimation = animation.direction === 'out';
  
  let animStart: number;
  let animEnd: number;
  
  if (isExitAnimation) {
    // Exit animations happen at the end
    animEnd = overlayDuration;
    animStart = animEnd - animation.durationMs;
  } else {
    // Enter animations happen at the start
    animStart = animation.delayMs;
    animEnd = animStart + animation.durationMs;
  }
  
  const relativeTime = currentMs - startMs;
  
  if (relativeTime < animStart) {
    return isExitAnimation ? 1 : 0;
  }
  
  if (relativeTime > animEnd) {
    return isExitAnimation ? 0 : 1;
  }
  
  const rawProgress = (relativeTime - animStart) / animation.durationMs;
  return applyEasing(rawProgress, animation.easing);
}

/**
 * Apply easing function
 */
export function applyEasing(t: number, easing: AnimationEasing): number {
  switch (easing) {
    case 'linear':
      return t;
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'bounce':
      if (t < 0.5) {
        return (1 - bounceOut(1 - 2 * t)) / 2;
      }
      return (1 + bounceOut(2 * t - 1)) / 2;
    default:
      return t;
  }
}

function bounceOut(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

/**
 * Get CSS transform for animation
 */
export function getAnimationTransform(
  animation: TextAnimation,
  progress: number
): React.CSSProperties {
  const easedProgress = animation.direction === 'out' ? 1 - progress : progress;
  
  switch (animation.type) {
    case 'fade-in':
    case 'fade-out':
      return { opacity: easedProgress };
      
    case 'slide-up':
      return {
        opacity: easedProgress,
        transform: `translateY(${(1 - easedProgress) * 30}px)`,
      };
      
    case 'slide-down':
      return {
        opacity: easedProgress,
        transform: `translateY(${(1 - easedProgress) * -30}px)`,
      };
      
    case 'slide-left':
      return {
        opacity: easedProgress,
        transform: `translateX(${(1 - easedProgress) * 30}px)`,
      };
      
    case 'slide-right':
      return {
        opacity: easedProgress,
        transform: `translateX(${(1 - easedProgress) * -30}px)`,
      };
      
    case 'scale-in':
    case 'scale-out':
      return {
        opacity: easedProgress,
        transform: `scale(${0.5 + easedProgress * 0.5})`,
      };
      
    case 'bounce':
      return {
        opacity: easedProgress,
        transform: `scale(${easedProgress})`,
      };
      
    case 'shake': {
      const shakeAmount = (1 - easedProgress) * 10;
      return {
        transform: `translateX(${Math.sin(easedProgress * Math.PI * 8) * shakeAmount}px)`,
      };
    }
      
    default:
      return {};
  }
}
