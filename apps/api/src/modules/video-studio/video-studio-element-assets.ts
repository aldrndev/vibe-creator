import type { StudioAsset, StudioTextLayerData, StudioTextPreview } from './video-studio.schemas';

const originalLicense: StudioAsset['license'] = {
  name: 'Vibe Creator Original',
  sourceUrl: null,
  attributionRequired: false,
  commercialUse: true,
};

interface ElementAssetInput {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  sortOrder: number;
  text: string;
  durationMs: number;
  x: number;
  y: number;
  width: number;
  height: number;
  data: StudioTextLayerData;
  preview: StudioTextPreview;
}

function elementAsset(input: ElementAssetInput): StudioAsset {
  return {
    id: input.id,
    kind: 'element',
    title: input.title,
    description: input.description,
    category: input.category,
    tags: input.tags,
    thumbnailUrl: null,
    previewUrl: null,
    payload: {
      kind: 'element-layer',
      text: input.text,
      durationMs: input.durationMs,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      data: input.data,
      preview: input.preview,
    },
    durationMs: input.durationMs,
    license: originalLicense,
    source: 'vibe-creator-original',
    sortOrder: input.sortOrder,
  };
}

/**
 * Built-in visual element presets served through the Video Studio asset catalog API.
 */
export const studioElementAssets: StudioAsset[] = [
  elementAsset({
    id: 'highlight',
    title: 'Highlight Box',
    description: 'Kotak sorot untuk menekankan objek atau teks.',
    category: 'highlight',
    tags: ['highlight', 'box', 'focus'],
    sortOrder: 600,
    text: '',
    durationMs: 5000,
    x: 50,
    y: 52,
    width: 64,
    height: 18,
    data: {
      fontSize: 18,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#111827',
      backgroundColor: '#fef08a',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: { variant: 'highlight', badge: 'Box', title: 'Highlight', subtitle: 'Focus area' },
  }),
  elementAsset({
    id: 'highlight-warning',
    title: 'Warning Highlight',
    description: 'Sorotan merah untuk poin penting atau risiko.',
    category: 'highlight',
    tags: ['highlight', 'warning', 'alert'],
    sortOrder: 610,
    text: '!',
    durationMs: 5000,
    x: 78,
    y: 28,
    width: 12,
    height: 12,
    data: {
      fontSize: 48,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: '#ef4444',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: { variant: 'marker', badge: 'Alert', title: '!', subtitle: 'Warning marker' },
  }),
  elementAsset({
    id: 'marker',
    title: 'Arrow Marker',
    description: 'Penanda panah untuk menunjuk objek di canvas.',
    category: 'marker',
    tags: ['marker', 'arrow', 'pointer'],
    sortOrder: 700,
    text: '>',
    durationMs: 5000,
    x: 68,
    y: 44,
    width: 16,
    height: 12,
    data: {
      fontSize: 60,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ff4b1f',
      backgroundColor: 'transparent',
      textAlign: 'center',
      animation: 'slide-up',
    },
    preview: { variant: 'marker', badge: 'Arrow', title: 'Marker', subtitle: 'Pointer' },
  }),
  elementAsset({
    id: 'marker-dot',
    title: 'Dot Marker',
    description: 'Titik penanda clean untuk detail kecil.',
    category: 'marker',
    tags: ['marker', 'dot', 'focus'],
    sortOrder: 710,
    text: '•',
    durationMs: 5000,
    x: 60,
    y: 40,
    width: 10,
    height: 10,
    data: {
      fontSize: 84,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#38bdf8',
      backgroundColor: 'transparent',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: { variant: 'marker', badge: 'Dot', title: 'Dot', subtitle: 'Clean marker' },
  }),
  elementAsset({
    id: 'strip',
    title: 'Background Strip',
    description: 'Strip latar agar caption atau CTA lebih terbaca.',
    category: 'strip',
    tags: ['strip', 'background', 'caption'],
    sortOrder: 800,
    text: '',
    durationMs: 5000,
    x: 50,
    y: 82,
    width: 100,
    height: 16,
    data: {
      fontSize: 18,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: 'rgba(15, 23, 42, 0.78)',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: { variant: 'strip', badge: 'Strip', title: 'Background', subtitle: 'Caption base' },
  }),
  elementAsset({
    id: 'strip-top',
    title: 'Top Strip',
    description: 'Strip atas untuk headline atau update singkat.',
    category: 'strip',
    tags: ['strip', 'top', 'headline'],
    sortOrder: 810,
    text: '',
    durationMs: 5000,
    x: 50,
    y: 12,
    width: 100,
    height: 13,
    data: {
      fontSize: 18,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: 'rgba(234, 88, 12, 0.82)',
      textAlign: 'center',
      animation: 'slide-down',
    },
    preview: { variant: 'strip', badge: 'Top', title: 'Top strip', subtitle: 'Headline base' },
  }),
  elementAsset({
    id: 'strip-bottom',
    title: 'Bottom Strip',
    description: 'Strip bawah untuk subtitle atau label pendek.',
    category: 'strip',
    tags: ['strip', 'bottom', 'subtitle'],
    sortOrder: 820,
    text: '',
    durationMs: 5000,
    x: 50,
    y: 90,
    width: 100,
    height: 14,
    data: {
      fontSize: 18,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: 'rgba(2, 6, 23, 0.78)',
      textAlign: 'center',
      animation: 'slide-up',
    },
    preview: { variant: 'strip', badge: 'Bottom', title: 'Bottom', subtitle: 'Subtitle base' },
  }),
];
