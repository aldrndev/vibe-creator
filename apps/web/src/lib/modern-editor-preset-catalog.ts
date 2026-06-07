import type {
  FitMode,
  ImageLayer,
  Layer,
  ModernProjectSettings,
  TextLayer,
  VideoLayer,
  VisualFilterId,
  VisualMotionId,
} from '@vibe-creator/shared';
import { createDefaultVisualLayerEffects } from '@vibe-creator/shared';

type VisualLayer = ImageLayer | VideoLayer;
export type VisualStylePresetGroup = 'frame' | 'look' | 'motion';

export interface TextStylePreset {
  readonly id: string;
  readonly label: string;
  readonly helper: string;
  readonly sample: string;
  readonly previewClassName: string;
  readonly data: Partial<TextLayer['data']>;
  readonly layer: Pick<Partial<TextLayer>, 'x' | 'y' | 'width' | 'height'>;
}

export interface VisualStylePreset {
  readonly id: string;
  readonly label: string;
  readonly helper: string;
  readonly group: VisualStylePresetGroup;
  readonly previewClassName: string;
  readonly fit?: FitMode;
  readonly filter?: VisualFilterId;
  readonly motion?: VisualMotionId;
  readonly canvasSettings?: Partial<ModernProjectSettings>;
}

export interface CanvasFormatPreset {
  readonly id: string;
  readonly label: string;
  readonly helper: string;
  readonly width: number;
  readonly height: number;
  readonly previewClassName: string;
}

export interface CanvasBackgroundPreset {
  readonly id: string;
  readonly label: string;
  readonly helper: string;
  readonly previewClassName: string;
  readonly settings: Partial<ModernProjectSettings>;
}

export const textStylePresets: readonly TextStylePreset[] = [
  {
    id: 'viral-caption',
    label: 'Viral Caption',
    helper: 'Subtitle tebal untuk short.',
    sample: 'INI DIA CARANYA',
    previewClassName: 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-primary/25',
    layer: { x: 50, y: 78, width: 88, height: 16 },
    data: {
      fontFamily: 'League Spartan',
      fontSize: 54,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      textAlign: 'center',
      animation: 'slide-up',
      animationIn: 'slide-up',
      animationOut: 'fade-out',
      animationLoop: 'none',
    },
  },
  {
    id: 'bold-hook',
    label: 'Bold Hook',
    helper: 'Hook besar 3 detik pertama.',
    sample: 'STOP SCROLLING',
    previewClassName: 'bg-gradient-to-br from-primary/85 via-orange-500/50 to-zinc-950',
    layer: { x: 50, y: 28, width: 86, height: 22 },
    data: {
      fontFamily: 'Bebas Neue',
      fontSize: 76,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: undefined,
      textAlign: 'center',
      animation: 'fade',
      animationIn: 'zoom',
      animationOut: 'fade-out',
      animationLoop: 'none',
    },
  },
  {
    id: 'meme-text',
    label: 'Meme Text',
    helper: 'Teks lucu kontras.',
    sample: 'BRO...',
    previewClassName: 'bg-gradient-to-br from-white via-zinc-200 to-zinc-500',
    layer: { x: 50, y: 18, width: 82, height: 16 },
    data: {
      fontFamily: 'Bangers',
      fontSize: 72,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#111827',
      backgroundColor: undefined,
      textAlign: 'center',
      animation: 'fade',
      animationIn: 'pop',
      animationOut: 'shrink',
      animationLoop: 'shake',
    },
  },
  {
    id: 'clean-subtitle',
    label: 'Clean Subtitle',
    helper: 'Subtitle rapi dan mudah dibaca.',
    sample: 'subtitle bersih',
    previewClassName: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800',
    layer: { x: 50, y: 84, width: 90, height: 13 },
    data: {
      fontFamily: 'Manrope',
      fontSize: 38,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      textAlign: 'center',
      animation: 'fade',
      animationIn: 'fade',
      animationOut: 'fade-out',
      animationLoop: 'none',
    },
  },
  {
    id: 'lower-third',
    label: 'Lower Third',
    helper: 'Nama, narasumber, lokasi.',
    sample: 'Nama Creator',
    previewClassName: 'bg-gradient-to-r from-zinc-950 via-teal-950 to-primary/40',
    layer: { x: 42, y: 76, width: 64, height: 13 },
    data: {
      fontFamily: 'Montserrat',
      fontSize: 34,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: '#ff4b1f',
      textAlign: 'left',
      animation: 'slide-up',
      animationIn: 'slide-up',
      animationOut: 'slide-out',
      animationLoop: 'none',
    },
  },
  {
    id: 'quote',
    label: 'Quote',
    helper: 'Kutipan editorial.',
    sample: '"mulai aja dulu"',
    previewClassName: 'bg-gradient-to-br from-indigo-950 via-zinc-950 to-fuchsia-950',
    layer: { x: 50, y: 50, width: 82, height: 24 },
    data: {
      fontFamily: 'Sora',
      fontSize: 48,
      fontWeight: 'bold',
      fontStyle: 'italic',
      color: '#f8fafc',
      backgroundColor: 'rgba(17, 24, 39, 0.68)',
      textAlign: 'center',
      animation: 'fade',
      animationIn: 'fade',
      animationOut: 'fade-out',
      animationLoop: 'glow',
    },
  },
  {
    id: 'cta',
    label: 'CTA',
    helper: 'Ajak follow, klik, subscribe.',
    sample: 'FOLLOW FOR MORE',
    previewClassName: 'bg-gradient-to-br from-emerald-500/60 via-zinc-950 to-sky-900',
    layer: { x: 50, y: 68, width: 76, height: 18 },
    data: {
      fontFamily: 'Anton',
      fontSize: 54,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: '#0f766e',
      textAlign: 'center',
      animation: 'fade',
      animationIn: 'pop',
      animationOut: 'fade-out',
      animationLoop: 'pulse',
    },
  },
] as const;

export const visualStylePresets: readonly VisualStylePreset[] = [
  {
    id: 'fit',
    label: 'Fit',
    helper: 'Utuh tanpa crop.',
    group: 'frame',
    previewClassName: 'bg-gradient-to-br from-zinc-950 to-slate-700',
    fit: 'contain',
    canvasSettings: { backgroundMode: 'solid' },
  },
  {
    id: 'fill',
    label: 'Fill',
    helper: 'Penuhi canvas.',
    group: 'frame',
    previewClassName: 'bg-gradient-to-br from-primary/80 to-zinc-950',
    fit: 'cover',
  },
  {
    id: 'blur-bg',
    label: 'Blur BG',
    helper: 'Background ikut konten.',
    group: 'frame',
    previewClassName: 'bg-gradient-to-br from-sky-900 via-orange-500/40 to-zinc-950 blur-[0.2px]',
    fit: 'contain',
    canvasSettings: {
      backgroundMode: 'blur',
      backgroundBlurAmount: 18,
      backgroundBlurZoom: 1.08,
      backgroundDim: 0.08,
      backgroundSaturation: 1.05,
    },
  },
  {
    id: 'normal',
    label: 'Normal',
    helper: 'Warna asli.',
    group: 'look',
    previewClassName: 'bg-gradient-to-br from-slate-800 via-zinc-700 to-slate-950',
    filter: 'none',
  },
  {
    id: 'bw',
    label: 'B&W',
    helper: 'Hitam putih.',
    group: 'look',
    previewClassName: 'bg-gradient-to-br from-zinc-950 via-zinc-400 to-white',
    filter: 'grayscale',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    helper: 'Kalem + push-in.',
    group: 'look',
    previewClassName: 'bg-gradient-to-br from-zinc-950 via-slate-800 to-amber-900',
    filter: 'warm',
    motion: 'zoom-in',
  },
  {
    id: 'vivid',
    label: 'Vivid',
    helper: 'Warna lebih pop.',
    group: 'look',
    previewClassName: 'bg-gradient-to-br from-fuchsia-500 via-primary to-emerald-400',
    filter: 'vivid',
  },
  {
    id: 'warm',
    label: 'Warm',
    helper: 'Tone hangat.',
    group: 'look',
    previewClassName: 'bg-gradient-to-br from-orange-300 via-primary/80 to-rose-950',
    filter: 'warm',
  },
  {
    id: 'cold',
    label: 'Cold',
    helper: 'Tone dingin.',
    group: 'look',
    previewClassName: 'bg-gradient-to-br from-sky-300 via-blue-700 to-slate-950',
    filter: 'cold',
  },
  {
    id: 'still',
    label: 'Still',
    helper: 'Tanpa gerak.',
    group: 'motion',
    previewClassName: 'bg-gradient-to-br from-zinc-950 via-slate-800 to-zinc-700',
    motion: 'none',
  },
  {
    id: 'zoom-in',
    label: 'Zoom In',
    helper: 'Gerak masuk halus.',
    group: 'motion',
    previewClassName: 'bg-gradient-to-br from-slate-950 via-sky-800 to-primary/50',
    motion: 'zoom-in',
  },
  {
    id: 'zoom-out',
    label: 'Zoom Out',
    helper: 'Gerak keluar halus.',
    group: 'motion',
    previewClassName: 'bg-gradient-to-br from-teal-800 via-slate-950 to-zinc-800',
    motion: 'zoom-out',
  },
] as const;

export const visualFramePresets = visualStylePresets.filter((preset) => preset.group === 'frame');
export const visualLookPresets = visualStylePresets.filter((preset) => preset.group === 'look');
export const visualMotionPresets = visualStylePresets.filter((preset) => preset.group === 'motion');

export const canvasFormatPresets: readonly CanvasFormatPreset[] = [
  {
    id: 'short',
    label: 'Short',
    helper: '9:16',
    width: 1080,
    height: 1920,
    previewClassName: 'aspect-[9/16]',
  },
  {
    id: 'landscape',
    label: 'Landscape',
    helper: '16:9',
    width: 1920,
    height: 1080,
    previewClassName: 'aspect-video',
  },
  {
    id: 'square',
    label: 'Square',
    helper: '1:1',
    width: 1080,
    height: 1080,
    previewClassName: 'aspect-square',
  },
  {
    id: 'portrait',
    label: 'Portrait',
    helper: '4:5',
    width: 1080,
    height: 1350,
    previewClassName: 'aspect-[4/5]',
  },
] as const;

export const canvasBackgroundPresets: readonly CanvasBackgroundPreset[] = [
  {
    id: 'blur-content',
    label: 'Blur Content',
    helper: 'Isi ruang dengan blur media.',
    previewClassName: 'bg-gradient-to-br from-slate-950 via-orange-500/55 to-sky-900',
    settings: {
      backgroundMode: 'blur',
      backgroundOpacity: 1,
      backgroundBlurAmount: 18,
      backgroundBlurZoom: 1.08,
      backgroundDim: 0.08,
      backgroundSaturation: 1.05,
    },
  },
  {
    id: 'auto-color',
    label: 'Auto Color',
    helper: 'Warna gelap netral.',
    previewClassName: 'bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-800',
    settings: { backgroundMode: 'solid', backgroundColor: '#111827', backgroundOpacity: 1 },
  },
  {
    id: 'dark',
    label: 'Dark',
    helper: 'Hitam bersih.',
    previewClassName: 'bg-zinc-950',
    settings: { backgroundMode: 'solid', backgroundColor: '#000000', backgroundOpacity: 1 },
  },
  {
    id: 'light',
    label: 'Light',
    helper: 'Putih lembut.',
    previewClassName: 'bg-slate-100',
    settings: { backgroundMode: 'solid', backgroundColor: '#f8fafc', backgroundOpacity: 1 },
  },
  {
    id: 'brand',
    label: 'Brand',
    helper: 'Orange Vibe.',
    previewClassName: 'bg-primary',
    settings: { backgroundMode: 'solid', backgroundColor: '#ff4b1f', backgroundOpacity: 1 },
  },
  {
    id: 'clean',
    label: 'Clean',
    helper: 'Teal modern.',
    previewClassName: 'bg-teal-700',
    settings: { backgroundMode: 'solid', backgroundColor: '#0f766e', backgroundOpacity: 1 },
  },
  {
    id: 'gradient-dark-fade',
    label: 'Dark Fade',
    helper: 'Gradient gelap editorial.',
    previewClassName: 'bg-gradient-to-br from-slate-950 to-slate-700',
    settings: {
      backgroundMode: 'gradient',
      backgroundOpacity: 1,
      backgroundGradientFrom: '#020617',
      backgroundGradientTo: '#334155',
      backgroundGradientAngle: 135,
    },
  },
  {
    id: 'gradient-warm-glow',
    label: 'Warm Glow',
    helper: 'Hangat untuk hook.',
    previewClassName: 'bg-gradient-to-br from-[#26110b] to-primary',
    settings: {
      backgroundMode: 'gradient',
      backgroundOpacity: 1,
      backgroundGradientFrom: '#26110b',
      backgroundGradientTo: '#ff4b1f',
      backgroundGradientAngle: 135,
    },
  },
  {
    id: 'gradient-brand-orange',
    label: 'Brand Orange',
    helper: 'Orange Vibe premium.',
    previewClassName: 'bg-gradient-to-br from-[#3b1608] to-primary',
    settings: {
      backgroundMode: 'gradient',
      backgroundOpacity: 1,
      backgroundGradientFrom: '#3b1608',
      backgroundGradientTo: '#ff4b1f',
      backgroundGradientAngle: 120,
    },
  },
  {
    id: 'gradient-blue-night',
    label: 'Blue Night',
    helper: 'Biru gelap modern.',
    previewClassName: 'bg-gradient-to-br from-slate-950 to-blue-600',
    settings: {
      backgroundMode: 'gradient',
      backgroundOpacity: 1,
      backgroundGradientFrom: '#020617',
      backgroundGradientTo: '#2563eb',
      backgroundGradientAngle: 135,
    },
  },
  {
    id: 'gradient-clean-light',
    label: 'Clean Light',
    helper: 'Terang minimal.',
    previewClassName: 'bg-gradient-to-br from-slate-50 to-slate-300',
    settings: {
      backgroundMode: 'gradient',
      backgroundOpacity: 1,
      backgroundGradientFrom: '#f8fafc',
      backgroundGradientTo: '#cbd5e1',
      backgroundGradientAngle: 135,
    },
  },
  {
    id: 'gradient-teal-pop',
    label: 'Teal Pop',
    helper: 'Teal creator.',
    previewClassName: 'bg-gradient-to-br from-[#042f2e] to-teal-700',
    settings: {
      backgroundMode: 'gradient',
      backgroundOpacity: 1,
      backgroundGradientFrom: '#042f2e',
      backgroundGradientTo: '#0f766e',
      backgroundGradientAngle: 135,
    },
  },
] as const;

export function buildTextStylePresetUpdate(
  layer: TextLayer,
  preset: TextStylePreset,
): Partial<Layer> {
  return {
    ...preset.layer,
    data: {
      ...layer.data,
      ...preset.data,
    },
  } as Partial<Layer>;
}

export function buildVisualStylePresetUpdate(
  layer: VisualLayer,
  preset: VisualStylePreset,
): Partial<Layer> {
  const effects = layer.data.effects ?? createDefaultVisualLayerEffects();

  return {
    data: {
      ...layer.data,
      fit: preset.fit ?? layer.data.fit,
      effects: {
        ...effects,
        filter: preset.filter ?? effects.filter,
        motion: preset.motion ?? effects.motion,
      },
    },
  } as Partial<Layer>;
}

function isFramePresetActive(
  layer: VisualLayer,
  preset: VisualStylePreset,
  settings?: ModernProjectSettings,
): boolean {
  if (preset.canvasSettings?.backgroundMode !== undefined) {
    if (preset.canvasSettings.backgroundMode !== 'blur') {
      return layer.data.fit === preset.fit && settings?.backgroundMode !== 'blur';
    }
    return (
      layer.data.fit === preset.fit &&
      settings?.backgroundMode === preset.canvasSettings.backgroundMode
    );
  }
  return preset.fit !== undefined && layer.data.fit === preset.fit;
}

function isLookPresetActive(
  _layer: VisualLayer,
  preset: VisualStylePreset,
  effects: NonNullable<VisualLayer['data']['effects']>,
): boolean {
  if (preset.filter === undefined) {
    return false;
  }

  if (preset.motion !== undefined) {
    return effects.filter === preset.filter && effects.motion === preset.motion;
  }

  const compositeLookActive = visualStylePresets.some(
    (otherPreset) =>
      otherPreset.group === 'look' &&
      otherPreset.id !== preset.id &&
      otherPreset.filter === preset.filter &&
      otherPreset.motion !== undefined &&
      effects.filter === otherPreset.filter &&
      effects.motion === otherPreset.motion,
  );

  return effects.filter === preset.filter && !compositeLookActive;
}

export function isVisualStylePresetActive(
  layer: VisualLayer,
  preset: VisualStylePreset,
  settings?: ModernProjectSettings,
): boolean {
  const effects = layer.data.effects ?? createDefaultVisualLayerEffects();

  if (preset.group === 'frame') {
    return isFramePresetActive(layer, preset, settings);
  }

  if (preset.group === 'look') {
    return isLookPresetActive(layer, preset, effects);
  }

  if (preset.group === 'motion') {
    return preset.motion !== undefined && effects.motion === preset.motion;
  }

  return false;
}
