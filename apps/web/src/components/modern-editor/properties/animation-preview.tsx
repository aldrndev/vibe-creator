import { motion, type TargetAndTransition, type Transition } from 'framer-motion';
import type { EditorAnimationPreset } from '@/lib/modern-editor-animation-catalog';
import { cn } from '@/lib/utils';

interface AnimationPreviewProps {
  readonly isPlaying?: boolean;
  readonly preset: EditorAnimationPreset;
}

const animationPreviewBaseClassName =
  'relative flex h-8 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/35 shadow-xl';

interface AnimationMotionState {
  readonly animate: TargetAndTransition;
  readonly initial: TargetAndTransition;
  readonly transition: Transition;
}

const idleMotionState: AnimationMotionState = {
  initial: { clipPath: 'inset(0 0% 0 0)', opacity: 1, scale: 1, x: 0, y: 0 },
  animate: { clipPath: 'inset(0 0% 0 0)', opacity: 1, scale: 1, x: 0, y: 0 },
  transition: { duration: 0 },
};

const LOOP_REPEAT_DELAY_SEC = 0.24;

export function getAnimationPreviewClassName(
  _preset: EditorAnimationPreset,
  isPlaying: boolean,
): string {
  return cn(animationPreviewBaseClassName, isPlaying && 'will-change-transform');
}

export function getAnimationPreviewMotionState(
  preset: EditorAnimationPreset,
  isPlaying: boolean,
): AnimationMotionState {
  if (!isPlaying || preset.durationMs <= 0) {
    return idleMotionState;
  }

  const duration = Math.max(0.3, preset.durationMs / 1000);

  if ('textIn' in preset.payload) {
    return buildEnterMotionState(preset.payload.textIn, duration);
  }

  if ('textOut' in preset.payload) {
    return buildExitMotionState(preset.payload.textOut, duration);
  }

  if ('textLoop' in preset.payload) {
    return buildLoopMotionState(preset.payload.textLoop, duration);
  }

  if ('visualTransition' in preset.payload) {
    return buildVisualTransitionMotionState(
      preset.payload.visualTransition,
      preset.slot === 'out' ? 'out' : 'in',
      duration,
    );
  }

  if ('visualMotion' in preset.payload) {
    return buildVisualMotionState(preset.payload.visualMotion, duration);
  }

  return idleMotionState;
}

export function AnimationPreview({ isPlaying = false, preset }: Readonly<AnimationPreviewProps>) {
  const motionState = getAnimationPreviewMotionState(preset, isPlaying);
  const isTextPreview = preset.layerTypes.includes('text');

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-primary/20">
      <motion.div
        key={`${preset.id}-${isPlaying ? 'preview' : 'idle'}`}
        className={getAnimationPreviewClassName(preset, isPlaying)}
        initial={motionState.initial}
        animate={motionState.animate}
        transition={motionState.transition}
      >
        {isTextPreview ? <TextPreviewMark /> : <VisualPreviewMark />}
      </motion.div>
    </div>
  );
}

function TextPreviewMark() {
  return (
    <div className="flex w-10 flex-col items-center gap-1">
      <span className="h-1.5 w-full rounded-full bg-white/95" />
      <span className="h-1.5 w-7 rounded-full bg-primary/90" />
    </div>
  );
}

function VisualPreviewMark() {
  return (
    <div className="relative h-5 w-10 overflow-hidden rounded-md border border-white/15 bg-gradient-to-br from-primary/80 via-orange-500/35 to-cyan-400/45">
      <span className="absolute bottom-1 left-1 h-1 w-4 rounded-full bg-white/70" />
      <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-black/35" />
    </div>
  );
}

function buildEnterMotionState(animation: string, duration: number): AnimationMotionState {
  if (animation === 'fade') {
    return {
      initial: { opacity: 0, scale: 1, x: 0, y: 0 },
      animate: { opacity: 1, scale: 1, x: 0, y: 0 },
      transition: withLoop({ duration, ease: 'easeOut' }),
    };
  }

  if (animation === 'slide-up') {
    return {
      initial: { opacity: 0, scale: 1, x: 0, y: 22 },
      animate: { opacity: 1, scale: 1, x: 0, y: 0 },
      transition: withLoop({ duration, ease: 'easeOut' }),
    };
  }

  if (animation === 'slide-down') {
    return {
      initial: { opacity: 0, scale: 1, x: 0, y: -22 },
      animate: { opacity: 1, scale: 1, x: 0, y: 0 },
      transition: withLoop({ duration, ease: 'easeOut' }),
    };
  }

  if (animation === 'pop') {
    return {
      initial: { opacity: 0, scale: 0.68, x: 0, y: 0 },
      animate: { opacity: [0, 1, 1], scale: [0.68, 1.18, 1], x: 0, y: 0 },
      transition: withLoop({ duration, ease: 'easeOut', times: [0, 0.72, 1] }),
    };
  }

  if (animation === 'zoom') {
    return {
      initial: { opacity: 0, scale: 0.55, x: 0, y: 0 },
      animate: { opacity: 1, scale: 1, x: 0, y: 0 },
      transition: withLoop({ duration, ease: 'easeOut' }),
    };
  }

  if (animation === 'typewriter') {
    return {
      initial: { clipPath: 'inset(0 100% 0 0)', opacity: 1, scale: 1, x: 0, y: 0 },
      animate: { clipPath: 'inset(0 0% 0 0)', opacity: 1, scale: 1, x: 0, y: 0 },
      transition: withLoop({ duration, ease: 'linear' }),
    };
  }

  return idleMotionState;
}

function buildExitMotionState(animation: string, duration: number): AnimationMotionState {
  if (animation === 'fade-out') {
    return {
      initial: { opacity: 1, scale: 1, x: 0, y: 0 },
      animate: { opacity: 0.12, scale: 1, x: 0, y: 0 },
      transition: withLoop({ duration, ease: 'easeIn' }),
    };
  }

  if (animation === 'slide-out') {
    return {
      initial: { opacity: 1, scale: 1, x: 0, y: 0 },
      animate: { opacity: 0, scale: 1, x: 0, y: 26 },
      transition: withLoop({ duration, ease: 'easeIn' }),
    };
  }

  if (animation === 'shrink') {
    return {
      initial: { opacity: 1, scale: 1, x: 0, y: 0 },
      animate: { opacity: 0.25, scale: 0.62, x: 0, y: 0 },
      transition: withLoop({ duration, ease: 'easeIn' }),
    };
  }

  return idleMotionState;
}

function buildLoopMotionState(animation: string, duration: number): AnimationMotionState {
  if (animation === 'pulse') {
    return {
      initial: { opacity: 1, scale: 1, x: 0, y: 0 },
      animate: { opacity: [1, 0.72, 1], scale: [1, 1.14, 1], x: 0, y: 0 },
      transition: withLoop({ duration, ease: 'easeInOut', times: [0, 0.5, 1] }),
    };
  }

  if (animation === 'shake') {
    return {
      initial: { opacity: 1, scale: 1, x: 0, y: 0 },
      animate: { opacity: 1, scale: 1, x: [0, -10, 10, -8, 8, 0], y: 0 },
      transition: withLoop({
        duration,
        ease: 'easeInOut',
        times: [0, 0.18, 0.36, 0.54, 0.72, 1],
      }),
    };
  }

  if (animation === 'glow') {
    return {
      initial: { boxShadow: '0 0 0 rgba(255,255,255,0)', opacity: 1, scale: 1 },
      animate: {
        boxShadow: [
          '0 0 0 rgba(255,255,255,0)',
          '0 0 22px rgba(255,255,255,0.65)',
          '0 0 0 rgba(255,255,255,0)',
        ],
        opacity: [1, 1, 1],
        scale: [1, 1.07, 1],
        x: 0,
        y: 0,
      },
      transition: withLoop({ duration, ease: 'easeInOut', times: [0, 0.5, 1] }),
    };
  }

  return idleMotionState;
}

function buildVisualMotionState(animation: string, duration: number): AnimationMotionState {
  if (animation === 'zoom-in') {
    return {
      initial: { opacity: 1, scale: 0.86, x: 0, y: 0 },
      animate: { opacity: 1, scale: 1.16, x: 0, y: 0 },
      transition: withLoop({ duration, ease: 'easeInOut' }),
    };
  }

  if (animation === 'zoom-out') {
    return {
      initial: { opacity: 1, scale: 1.16, x: 0, y: 0 },
      animate: { opacity: 1, scale: 0.86, x: 0, y: 0 },
      transition: withLoop({ duration, ease: 'easeInOut' }),
    };
  }

  return idleMotionState;
}

function buildVisualTransitionMotionState(
  animation: string,
  slot: 'in' | 'out',
  duration: number,
): AnimationMotionState {
  if (animation === 'fade') {
    return slot === 'out'
      ? buildExitMotionState('fade-out', duration)
      : buildEnterMotionState('fade', duration);
  }

  if (animation === 'zoom') {
    return slot === 'out'
      ? buildExitMotionState('shrink', duration)
      : buildEnterMotionState('zoom', duration);
  }

  if (animation === 'slide-left' || animation === 'slide-right') {
    const direction = animation === 'slide-left' ? 1 : -1;
    return slot === 'out'
      ? {
          initial: { opacity: 1, scale: 1, x: 0, y: 0 },
          animate: { opacity: 0, scale: 1, x: direction * -34, y: 0 },
          transition: withLoop({ duration, ease: 'easeIn' }),
        }
      : {
          initial: { opacity: 0, scale: 1, x: direction * 34, y: 0 },
          animate: { opacity: 1, scale: 1, x: 0, y: 0 },
          transition: withLoop({ duration, ease: 'easeOut' }),
        };
  }

  return idleMotionState;
}

function withLoop(transition: Transition): Transition {
  return {
    ...transition,
    repeat: Number.POSITIVE_INFINITY,
    repeatDelay: LOOP_REPEAT_DELAY_SEC,
    repeatType: 'loop',
  };
}
