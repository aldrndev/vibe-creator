import type {
  ImageLayer,
  Layer,
  TextAnimationInId,
  TextAnimationLoopId,
  TextAnimationOutId,
  TextLayer,
  VideoLayer,
  VisualLayerEffects,
  VisualMotionId,
  VisualTransitionId,
} from '@vibe-creator/shared';

export type AnimationLayerType = 'text' | 'visual';
export type AnimationSlot = 'in' | 'out' | 'loop' | 'motion';

type VisualLayer = ImageLayer | VideoLayer;

export interface EditorAnimationPreset {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  readonly slot: AnimationSlot;
  readonly layerTypes: readonly AnimationLayerType[];
  readonly durationMs: number;
  readonly previewClassName: string;
  readonly payload:
    | { readonly textIn: TextAnimationInId }
    | { readonly textOut: TextAnimationOutId }
    | { readonly textLoop: TextAnimationLoopId }
    | { readonly visualTransition: VisualTransitionId }
    | { readonly visualMotion: VisualMotionId };
}

export const editorAnimationCatalog: readonly EditorAnimationPreset[] = [
  {
    id: 'text-in-none',
    label: 'None',
    category: 'Text In',
    slot: 'in',
    layerTypes: ['text'],
    durationMs: 0,
    previewClassName: 'animate-none',
    payload: { textIn: 'none' },
  },
  {
    id: 'text-in-fade',
    label: 'Fade',
    category: 'Text In',
    slot: 'in',
    layerTypes: ['text'],
    durationMs: 500,
    previewClassName: 'animate-in fade-in duration-500',
    payload: { textIn: 'fade' },
  },
  {
    id: 'text-in-slide-up',
    label: 'Slide Up',
    category: 'Text In',
    slot: 'in',
    layerTypes: ['text'],
    durationMs: 500,
    previewClassName: 'animate-in fade-in slide-in-from-bottom-3 duration-500',
    payload: { textIn: 'slide-up' },
  },
  {
    id: 'text-in-slide-down',
    label: 'Slide Down',
    category: 'Text In',
    slot: 'in',
    layerTypes: ['text'],
    durationMs: 500,
    previewClassName: 'animate-in fade-in slide-in-from-top-3 duration-500',
    payload: { textIn: 'slide-down' },
  },
  {
    id: 'text-in-pop',
    label: 'Pop',
    category: 'Text In',
    slot: 'in',
    layerTypes: ['text'],
    durationMs: 450,
    previewClassName: 'animate-in zoom-in-75 fade-in duration-500',
    payload: { textIn: 'pop' },
  },
  {
    id: 'text-in-zoom',
    label: 'Zoom',
    category: 'Text In',
    slot: 'in',
    layerTypes: ['text'],
    durationMs: 500,
    previewClassName: 'animate-in zoom-in-50 fade-in duration-500',
    payload: { textIn: 'zoom' },
  },
  {
    id: 'text-in-typewriter',
    label: 'Typewriter',
    category: 'Text In',
    slot: 'in',
    layerTypes: ['text'],
    durationMs: 900,
    previewClassName: 'animate-pulse',
    payload: { textIn: 'typewriter' },
  },
  {
    id: 'text-out-none',
    label: 'None',
    category: 'Text Out',
    slot: 'out',
    layerTypes: ['text'],
    durationMs: 0,
    previewClassName: 'animate-none',
    payload: { textOut: 'none' },
  },
  {
    id: 'text-out-fade',
    label: 'Fade Out',
    category: 'Text Out',
    slot: 'out',
    layerTypes: ['text'],
    durationMs: 500,
    previewClassName: 'animate-pulse',
    payload: { textOut: 'fade-out' },
  },
  {
    id: 'text-out-slide',
    label: 'Slide Out',
    category: 'Text Out',
    slot: 'out',
    layerTypes: ['text'],
    durationMs: 500,
    previewClassName: 'animate-pulse',
    payload: { textOut: 'slide-out' },
  },
  {
    id: 'text-out-shrink',
    label: 'Shrink',
    category: 'Text Out',
    slot: 'out',
    layerTypes: ['text'],
    durationMs: 500,
    previewClassName: 'animate-pulse',
    payload: { textOut: 'shrink' },
  },
  {
    id: 'text-loop-none',
    label: 'None',
    category: 'Text Loop',
    slot: 'loop',
    layerTypes: ['text'],
    durationMs: 0,
    previewClassName: 'animate-none',
    payload: { textLoop: 'none' },
  },
  {
    id: 'text-loop-pulse',
    label: 'Pulse',
    category: 'Text Loop',
    slot: 'loop',
    layerTypes: ['text'],
    durationMs: 1200,
    previewClassName: 'animate-pulse',
    payload: { textLoop: 'pulse' },
  },
  {
    id: 'text-loop-shake',
    label: 'Shake',
    category: 'Text Loop',
    slot: 'loop',
    layerTypes: ['text'],
    durationMs: 800,
    previewClassName: 'animate-bounce',
    payload: { textLoop: 'shake' },
  },
  {
    id: 'text-loop-glow',
    label: 'Glow',
    category: 'Text Loop',
    slot: 'loop',
    layerTypes: ['text'],
    durationMs: 1200,
    previewClassName: 'animate-pulse',
    payload: { textLoop: 'glow' },
  },
  {
    id: 'visual-in-none',
    label: 'None',
    category: 'Visual In',
    slot: 'in',
    layerTypes: ['visual'],
    durationMs: 0,
    previewClassName: 'animate-none',
    payload: { visualTransition: 'none' },
  },
  {
    id: 'visual-in-fade',
    label: 'Fade',
    category: 'Visual In',
    slot: 'in',
    layerTypes: ['visual'],
    durationMs: 500,
    previewClassName: 'animate-in fade-in duration-500',
    payload: { visualTransition: 'fade' },
  },
  {
    id: 'visual-in-left',
    label: 'Slide Left',
    category: 'Visual In',
    slot: 'in',
    layerTypes: ['visual'],
    durationMs: 500,
    previewClassName: 'animate-in slide-in-from-right-4 fade-in duration-500',
    payload: { visualTransition: 'slide-left' },
  },
  {
    id: 'visual-in-right',
    label: 'Slide Right',
    category: 'Visual In',
    slot: 'in',
    layerTypes: ['visual'],
    durationMs: 500,
    previewClassName: 'animate-in slide-in-from-left-4 fade-in duration-500',
    payload: { visualTransition: 'slide-right' },
  },
  {
    id: 'visual-in-zoom',
    label: 'Zoom',
    category: 'Visual In',
    slot: 'in',
    layerTypes: ['visual'],
    durationMs: 500,
    previewClassName: 'animate-in zoom-in-75 fade-in duration-500',
    payload: { visualTransition: 'zoom' },
  },
  {
    id: 'visual-out-none',
    label: 'None',
    category: 'Visual Out',
    slot: 'out',
    layerTypes: ['visual'],
    durationMs: 0,
    previewClassName: 'animate-none',
    payload: { visualTransition: 'none' },
  },
  {
    id: 'visual-out-fade',
    label: 'Fade',
    category: 'Visual Out',
    slot: 'out',
    layerTypes: ['visual'],
    durationMs: 500,
    previewClassName: 'animate-pulse',
    payload: { visualTransition: 'fade' },
  },
  {
    id: 'visual-out-left',
    label: 'Slide Left',
    category: 'Visual Out',
    slot: 'out',
    layerTypes: ['visual'],
    durationMs: 500,
    previewClassName: 'animate-pulse',
    payload: { visualTransition: 'slide-left' },
  },
  {
    id: 'visual-out-right',
    label: 'Slide Right',
    category: 'Visual Out',
    slot: 'out',
    layerTypes: ['visual'],
    durationMs: 500,
    previewClassName: 'animate-pulse',
    payload: { visualTransition: 'slide-right' },
  },
  {
    id: 'visual-out-zoom',
    label: 'Zoom',
    category: 'Visual Out',
    slot: 'out',
    layerTypes: ['visual'],
    durationMs: 500,
    previewClassName: 'animate-pulse',
    payload: { visualTransition: 'zoom' },
  },
  {
    id: 'visual-motion-none',
    label: 'Still',
    category: 'Visual Motion',
    slot: 'motion',
    layerTypes: ['visual'],
    durationMs: 0,
    previewClassName: 'animate-none',
    payload: { visualMotion: 'none' },
  },
  {
    id: 'visual-motion-zoom-in',
    label: 'Slow Zoom In',
    category: 'Visual Motion',
    slot: 'motion',
    layerTypes: ['visual'],
    durationMs: 3000,
    previewClassName: 'animate-pulse',
    payload: { visualMotion: 'zoom-in' },
  },
  {
    id: 'visual-motion-zoom-out',
    label: 'Slow Zoom Out',
    category: 'Visual Motion',
    slot: 'motion',
    layerTypes: ['visual'],
    durationMs: 3000,
    previewClassName: 'animate-pulse',
    payload: { visualMotion: 'zoom-out' },
  },
] as const;

export function getAnimationPresetsForLayer(layerType: Layer['type']): EditorAnimationPreset[] {
  const normalizedLayerType: AnimationLayerType = layerType === 'text' ? 'text' : 'visual';
  if (layerType === 'audio') {
    return [];
  }

  return editorAnimationCatalog.filter((preset) => preset.layerTypes.includes(normalizedLayerType));
}

export function buildTextAnimationUpdate(
  layer: TextLayer,
  preset: EditorAnimationPreset,
): Partial<Layer> {
  if ('textIn' in preset.payload) {
    const legacyAnimation = toLegacyTextAnimation(preset.payload.textIn);
    return {
      data: {
        ...layer.data,
        animation: legacyAnimation,
        animationIn: preset.payload.textIn,
      },
    } as Partial<Layer>;
  }

  if ('textOut' in preset.payload) {
    return {
      data: { ...layer.data, animationOut: preset.payload.textOut },
    } as Partial<Layer>;
  }

  if ('textLoop' in preset.payload) {
    return {
      data: { ...layer.data, animationLoop: preset.payload.textLoop },
    } as Partial<Layer>;
  }

  return {};
}

export function buildVisualAnimationUpdate(
  layer: VisualLayer,
  preset: EditorAnimationPreset,
  slot: 'in' | 'out' | 'motion',
): Partial<Layer> {
  const effects = layer.data.effects;
  const updates: Partial<VisualLayerEffects> = {};

  if ('visualTransition' in preset.payload) {
    if (slot === 'out') {
      updates.transitionOut = preset.payload.visualTransition;
    } else {
      updates.transitionIn = preset.payload.visualTransition;
    }
  }

  if ('visualMotion' in preset.payload) {
    updates.motion = preset.payload.visualMotion;
  }

  return {
    data: {
      ...layer.data,
      effects: {
        ...effects,
        ...updates,
      },
    },
  } as Partial<Layer>;
}

export function toLegacyTextAnimation(
  animationIn: TextAnimationInId | undefined,
): TextLayer['data']['animation'] {
  if (
    animationIn === 'fade' ||
    animationIn === 'slide-up' ||
    animationIn === 'slide-down' ||
    animationIn === 'typewriter'
  ) {
    return animationIn;
  }

  if (animationIn === 'pop' || animationIn === 'zoom') {
    return 'fade';
  }

  return 'none';
}

export function resolveTextAnimationIn(layer: TextLayer): TextAnimationInId {
  return layer.data.animationIn ?? layer.data.animation ?? 'none';
}
