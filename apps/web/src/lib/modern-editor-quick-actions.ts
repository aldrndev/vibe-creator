import type { ModernProjectSettings, TextLayer } from '@vibe-creator/shared';

export type VideoStudioCanvasPresetId = 'short' | 'landscape' | 'square';

export interface VideoStudioCanvasPreset {
  readonly id: VideoStudioCanvasPresetId;
  readonly label: string;
  readonly helper: string;
  readonly width: number;
  readonly height: number;
}

export type VideoStudioTextActionId =
  | 'opening'
  | 'opening-question'
  | 'opening-breaking'
  | 'opening-countdown'
  | 'title'
  | 'title-clean'
  | 'title-minimal'
  | 'caption'
  | 'caption-clean'
  | 'caption-keyword'
  | 'closing'
  | 'closing-follow'
  | 'closing-save'
  | 'closing-next'
  | 'lower-third'
  | 'lower-third-host'
  | 'lower-third-topic'
  | 'quote'
  | 'quote-soft'
  | 'quote-bold'
  | 'cta'
  | 'cta-comment'
  | 'cta-save'
  | 'highlight'
  | 'highlight-soft'
  | 'highlight-warning'
  | 'marker'
  | 'marker-dot'
  | 'marker-alert'
  | 'strip'
  | 'strip-top'
  | 'strip-bottom';

export type VideoStudioTextPreviewVariant =
  | 'hook'
  | 'title'
  | 'caption'
  | 'closing'
  | 'lower-third'
  | 'quote'
  | 'cta'
  | 'highlight'
  | 'marker'
  | 'strip';

export interface VideoStudioTextPreview {
  readonly variant: VideoStudioTextPreviewVariant;
  readonly badge: string;
  readonly title: string;
  readonly subtitle: string;
}

export interface VideoStudioTextAction {
  readonly id: VideoStudioTextActionId;
  readonly label: string;
  readonly description: string;
  readonly text: string;
  readonly durationMs: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly data: Pick<
    TextLayer['data'],
    'fontSize' | 'fontWeight' | 'color' | 'backgroundColor' | 'textAlign' | 'animation'
  >;
  readonly preview: VideoStudioTextPreview;
}

export const videoStudioCanvasPresets: VideoStudioCanvasPreset[] = [
  {
    id: 'short',
    label: 'Short 9:16',
    helper: '1080 x 1920',
    width: 1080,
    height: 1920,
  },
  {
    id: 'landscape',
    label: 'YouTube 16:9',
    helper: '1920 x 1080',
    width: 1920,
    height: 1080,
  },
  {
    id: 'square',
    label: 'Square 1:1',
    helper: '1080 x 1080',
    width: 1080,
    height: 1080,
  },
];

export const videoStudioOpeningClosingActionIds: VideoStudioTextActionId[] = [
  'opening',
  'opening-question',
  'opening-breaking',
  'opening-countdown',
  'closing',
  'closing-follow',
  'closing-save',
  'closing-next',
];

export const videoStudioTextTemplateActionIds: VideoStudioTextActionId[] = [
  'title',
  'title-clean',
  'title-minimal',
  'caption',
  'caption-clean',
  'caption-keyword',
  'lower-third',
  'lower-third-host',
  'lower-third-topic',
  'quote',
  'quote-soft',
  'quote-bold',
  'cta',
  'cta-comment',
  'cta-save',
];

export const videoStudioElementActionIds: VideoStudioTextActionId[] = [
  'highlight',
  'highlight-soft',
  'highlight-warning',
  'marker',
  'marker-dot',
  'marker-alert',
  'strip',
  'strip-top',
  'strip-bottom',
];

export const videoStudioTextActions: VideoStudioTextAction[] = [
  {
    id: 'opening',
    label: 'Hook Pembuka',
    description: 'Teks pembuka yang kuat untuk 3 detik pertama.',
    text: '3 HAL YANG WAJIB TAU',
    durationMs: 3_000,
    x: 50,
    y: 22,
    width: 82,
    height: 16,
    data: {
      fontSize: 56,
      fontWeight: 'bold',
      color: '#fff7ed',
      backgroundColor: 'rgba(234, 88, 12, 0.82)',
      textAlign: 'center',
      animation: 'slide-down',
    },
    preview: {
      variant: 'hook',
      badge: 'Intro',
      title: '3 HAL',
      subtitle: 'WAJIB TAU',
    },
  },
  {
    id: 'opening-question',
    label: 'Pertanyaan Pembuka',
    description: 'Mulai video dengan pertanyaan yang bikin penasaran.',
    text: 'KAMU PERNAH MERASA BEGINI?',
    durationMs: 3_000,
    x: 50,
    y: 28,
    width: 84,
    height: 14,
    data: {
      fontSize: 44,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(88, 28, 135, 0.78)',
      textAlign: 'center',
      animation: 'slide-down',
    },
    preview: {
      variant: 'hook',
      badge: 'Hook',
      title: 'PERNAH?',
      subtitle: 'Question opener',
    },
  },
  {
    id: 'opening-breaking',
    label: 'Breaking Hook',
    description: 'Pembuka bergaya berita atau update penting.',
    text: 'INI UPDATE PENTING',
    durationMs: 3_000,
    x: 50,
    y: 18,
    width: 88,
    height: 14,
    data: {
      fontSize: 48,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(220, 38, 38, 0.86)',
      textAlign: 'center',
      animation: 'slide-down',
    },
    preview: {
      variant: 'hook',
      badge: 'News',
      title: 'UPDATE',
      subtitle: 'PENTING',
    },
  },
  {
    id: 'opening-countdown',
    label: 'Countdown Hook',
    description: 'Pembuka listicle untuk tips, ranking, atau fakta.',
    text: 'TOP 5 TIPS CEPAT',
    durationMs: 3_500,
    x: 50,
    y: 24,
    width: 78,
    height: 14,
    data: {
      fontSize: 50,
      fontWeight: 'bold',
      color: '#0f172a',
      backgroundColor: '#facc15',
      textAlign: 'center',
      animation: 'slide-down',
    },
    preview: {
      variant: 'hook',
      badge: 'List',
      title: 'TOP 5',
      subtitle: 'Tips cepat',
    },
  },
  {
    id: 'title',
    label: 'Judul Besar',
    description: 'Judul besar di tengah untuk cover atau scene utama.',
    text: 'BIG IDEA',
    durationMs: 5_000,
    x: 50,
    y: 46,
    width: 76,
    height: 18,
    data: {
      fontSize: 64,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'title',
      badge: 'Title',
      title: 'BIG',
      subtitle: 'IDEA',
    },
  },
  {
    id: 'title-clean',
    label: 'Judul Clean',
    description: 'Judul rapi untuk video edukasi, tutorial, atau review.',
    text: 'Judul Utama',
    durationMs: 5_000,
    x: 50,
    y: 40,
    width: 70,
    height: 16,
    data: {
      fontSize: 54,
      fontWeight: 'bold',
      color: '#0f172a',
      backgroundColor: 'rgba(255, 255, 255, 0.86)',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'title',
      badge: 'Clean',
      title: 'JUDUL',
      subtitle: 'Rapi',
    },
  },
  {
    id: 'title-minimal',
    label: 'Judul Minimal',
    description: 'Judul kecil dan elegan untuk opening yang tidak ramai.',
    text: 'Topik Hari Ini',
    durationMs: 5_000,
    x: 50,
    y: 18,
    width: 64,
    height: 10,
    data: {
      fontSize: 34,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'title',
      badge: 'Minimal',
      title: 'TOPIK',
      subtitle: 'Hari ini',
    },
  },
  {
    id: 'caption',
    label: 'Caption Bawah',
    description: 'Caption aman untuk short, reels, dan tutorial.',
    text: 'Caption singkat yang mudah dibaca',
    durationMs: 5_000,
    x: 50,
    y: 82,
    width: 86,
    height: 12,
    data: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.74)',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'caption',
      badge: 'Caption',
      title: 'Subtitle',
      subtitle: 'Readable bar',
    },
  },
  {
    id: 'caption-clean',
    label: 'Caption Clean',
    description: 'Subtitle bersih dengan latar tipis agar tetap natural.',
    text: 'Teks subtitle yang lebih ringan',
    durationMs: 5_000,
    x: 50,
    y: 84,
    width: 86,
    height: 10,
    data: {
      fontSize: 30,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(15, 23, 42, 0.54)',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'caption',
      badge: 'Clean',
      title: 'Subtitle',
      subtitle: 'Soft bar',
    },
  },
  {
    id: 'caption-keyword',
    label: 'Caption Keyword',
    description: 'Caption pendek untuk menonjolkan kata penting.',
    text: 'KATA KUNCI PENTING',
    durationMs: 4_000,
    x: 50,
    y: 76,
    width: 72,
    height: 10,
    data: {
      fontSize: 34,
      fontWeight: 'bold',
      color: '#0f172a',
      backgroundColor: '#fde68a',
      textAlign: 'center',
      animation: 'slide-up',
    },
    preview: {
      variant: 'caption',
      badge: 'Keyword',
      title: 'Kata Kunci',
      subtitle: 'Highlight caption',
    },
  },
  {
    id: 'closing',
    label: 'Penutup CTA',
    description: 'Closing cepat untuk follow, save, atau next part.',
    text: 'Follow untuk part berikutnya',
    durationMs: 4_000,
    x: 50,
    y: 74,
    width: 82,
    height: 12,
    data: {
      fontSize: 38,
      fontWeight: 'bold',
      color: '#d9f99d',
      backgroundColor: 'rgba(20, 83, 45, 0.68)',
      textAlign: 'center',
      animation: 'slide-up',
    },
    preview: {
      variant: 'closing',
      badge: 'Outro',
      title: 'FOLLOW',
      subtitle: 'Next part',
    },
  },
  {
    id: 'closing-follow',
    label: 'Ajak Follow',
    description: 'Penutup untuk mengajak user follow akun.',
    text: 'Follow untuk tips lainnya',
    durationMs: 4_000,
    x: 50,
    y: 78,
    width: 72,
    height: 11,
    data: {
      fontSize: 34,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(14, 165, 233, 0.78)',
      textAlign: 'center',
      animation: 'slide-up',
    },
    preview: {
      variant: 'closing',
      badge: 'Follow',
      title: 'FOLLOW',
      subtitle: 'Tips lainnya',
    },
  },
  {
    id: 'closing-save',
    label: 'Ajak Simpan',
    description: 'Penutup untuk konten tips yang ingin disimpan.',
    text: 'Simpan video ini',
    durationMs: 4_000,
    x: 50,
    y: 82,
    width: 66,
    height: 10,
    data: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#0f172a',
      backgroundColor: '#fef08a',
      textAlign: 'center',
      animation: 'slide-up',
    },
    preview: {
      variant: 'cta',
      badge: 'Save',
      title: 'SIMPAN',
      subtitle: 'Video ini',
    },
  },
  {
    id: 'closing-next',
    label: 'Next Part',
    description: 'Penutup untuk mengarahkan penonton ke lanjutan video.',
    text: 'Part 2 ada di video berikutnya',
    durationMs: 4_000,
    x: 50,
    y: 74,
    width: 82,
    height: 12,
    data: {
      fontSize: 34,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(124, 58, 237, 0.74)',
      textAlign: 'center',
      animation: 'slide-up',
    },
    preview: {
      variant: 'closing',
      badge: 'Series',
      title: 'PART 2',
      subtitle: 'Video berikutnya',
    },
  },
  {
    id: 'lower-third',
    label: 'Label Bawah',
    description: 'Label nama, topik, atau lokasi di area bawah.',
    text: 'Nama / Topik Utama',
    durationMs: 5_000,
    x: 34,
    y: 76,
    width: 58,
    height: 12,
    data: {
      fontSize: 34,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(234, 88, 12, 0.78)',
      textAlign: 'left',
      animation: 'slide-up',
    },
    preview: {
      variant: 'lower-third',
      badge: 'Info',
      title: 'Nama',
      subtitle: 'Topik utama',
    },
  },
  {
    id: 'lower-third-host',
    label: 'Nama Host',
    description: 'Label nama pembicara atau kreator di area bawah.',
    text: 'Nama Host',
    durationMs: 5_000,
    x: 31,
    y: 78,
    width: 52,
    height: 11,
    data: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(15, 23, 42, 0.78)',
      textAlign: 'left',
      animation: 'slide-up',
    },
    preview: {
      variant: 'lower-third',
      badge: 'Host',
      title: 'Nama',
      subtitle: 'Host',
    },
  },
  {
    id: 'lower-third-topic',
    label: 'Topik Video',
    description: 'Label topik untuk menjelaskan bagian yang sedang dibahas.',
    text: 'Topik Pembahasan',
    durationMs: 5_000,
    x: 36,
    y: 70,
    width: 62,
    height: 11,
    data: {
      fontSize: 30,
      fontWeight: 'bold',
      color: '#0f172a',
      backgroundColor: '#f8fafc',
      textAlign: 'left',
      animation: 'slide-up',
    },
    preview: {
      variant: 'lower-third',
      badge: 'Topik',
      title: 'Topik',
      subtitle: 'Pembahasan',
    },
  },
  {
    id: 'quote',
    label: 'Kartu Quote',
    description: 'Quote block untuk statement, insight, atau testimoni.',
    text: '"Kutipan penting di sini"',
    durationMs: 5_000,
    x: 50,
    y: 48,
    width: 82,
    height: 20,
    data: {
      fontSize: 42,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(17, 24, 39, 0.62)',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'quote',
      badge: 'Quote',
      title: '"Insight"',
      subtitle: 'Statement card',
    },
  },
  {
    id: 'quote-soft',
    label: 'Quote Soft',
    description: 'Quote dengan tampilan halus untuk insight atau narasi.',
    text: '"Mulai kecil, tapi konsisten"',
    durationMs: 5_000,
    x: 50,
    y: 48,
    width: 78,
    height: 18,
    data: {
      fontSize: 36,
      fontWeight: 'bold',
      color: '#0f172a',
      backgroundColor: 'rgba(255, 255, 255, 0.82)',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'quote',
      badge: 'Soft',
      title: '"Insight"',
      subtitle: 'Clean quote',
    },
  },
  {
    id: 'quote-bold',
    label: 'Quote Bold',
    description: 'Quote tegas untuk statement penting atau punchline.',
    text: '"Ini yang paling penting"',
    durationMs: 5_000,
    x: 50,
    y: 46,
    width: 84,
    height: 18,
    data: {
      fontSize: 44,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(190, 24, 93, 0.74)',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'quote',
      badge: 'Bold',
      title: '"Penting"',
      subtitle: 'Punchline',
    },
  },
  {
    id: 'cta',
    label: 'Tombol CTA',
    description: 'Ajakan aksi yang tampil seperti tombol kecil.',
    text: 'Simpan dan bagikan',
    durationMs: 4_000,
    x: 50,
    y: 88,
    width: 72,
    height: 10,
    data: {
      fontSize: 30,
      fontWeight: 'bold',
      color: '#0f172a',
      backgroundColor: '#facc15',
      textAlign: 'center',
      animation: 'slide-up',
    },
    preview: {
      variant: 'cta',
      badge: 'CTA',
      title: 'SAVE',
      subtitle: 'Share',
    },
  },
  {
    id: 'cta-comment',
    label: 'Ajak Komentar',
    description: 'CTA untuk meminta opini atau jawaban dari penonton.',
    text: 'Tulis pendapatmu',
    durationMs: 4_000,
    x: 50,
    y: 86,
    width: 66,
    height: 10,
    data: {
      fontSize: 30,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(37, 99, 235, 0.78)',
      textAlign: 'center',
      animation: 'slide-up',
    },
    preview: {
      variant: 'cta',
      badge: 'Comment',
      title: 'KOMENTAR',
      subtitle: 'Opini kamu',
    },
  },
  {
    id: 'cta-save',
    label: 'Ajak Save',
    description: 'CTA untuk konten checklist, tips, atau tutorial.',
    text: 'Save untuk nanti',
    durationMs: 4_000,
    x: 50,
    y: 88,
    width: 64,
    height: 10,
    data: {
      fontSize: 30,
      fontWeight: 'bold',
      color: '#111827',
      backgroundColor: '#bef264',
      textAlign: 'center',
      animation: 'slide-up',
    },
    preview: {
      variant: 'cta',
      badge: 'Save',
      title: 'SAVE',
      subtitle: 'Untuk nanti',
    },
  },
  {
    id: 'highlight',
    label: 'Kotak Highlight',
    description: 'Kotak sorot untuk kata atau objek penting.',
    text: 'Highlight',
    durationMs: 5_000,
    x: 50,
    y: 50,
    width: 58,
    height: 10,
    data: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#111827',
      backgroundColor: '#fef08a',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'highlight',
      badge: 'Shape',
      title: 'Highlight',
      subtitle: 'Box',
    },
  },
  {
    id: 'highlight-soft',
    label: 'Highlight Soft',
    description: 'Sorotan lembut untuk catatan tanpa terlalu ramai.',
    text: 'Catatan penting',
    durationMs: 5_000,
    x: 50,
    y: 52,
    width: 60,
    height: 10,
    data: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#0f172a',
      backgroundColor: 'rgba(255, 255, 255, 0.78)',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'highlight',
      badge: 'Soft',
      title: 'Catatan',
      subtitle: 'Soft box',
    },
  },
  {
    id: 'highlight-warning',
    label: 'Highlight Warning',
    description: 'Sorotan untuk peringatan, larangan, atau perhatian.',
    text: 'Perhatikan ini',
    durationMs: 5_000,
    x: 50,
    y: 50,
    width: 62,
    height: 10,
    data: {
      fontSize: 30,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: '#dc2626',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'highlight',
      badge: 'Alert',
      title: 'Warning',
      subtitle: 'Attention box',
    },
  },
  {
    id: 'marker',
    label: 'Penanda',
    description: 'Marker kecil untuk menarik perhatian ke area tertentu.',
    text: '!',
    durationMs: 5_000,
    x: 78,
    y: 28,
    width: 10,
    height: 10,
    data: {
      fontSize: 48,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: '#ef4444',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'marker',
      badge: 'Pin',
      title: '!',
      subtitle: 'Marker',
    },
  },
  {
    id: 'marker-dot',
    label: 'Titik Fokus',
    description: 'Penanda bulat untuk menunjukkan objek di layar.',
    text: '.',
    durationMs: 5_000,
    x: 74,
    y: 34,
    width: 8,
    height: 8,
    data: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: '#facc15',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'marker',
      badge: 'Dot',
      title: 'DOT',
      subtitle: 'Focus point',
    },
  },
  {
    id: 'marker-alert',
    label: 'Penanda Alert',
    description: 'Penanda tanda seru untuk bagian yang perlu diperhatikan.',
    text: '!',
    durationMs: 5_000,
    x: 80,
    y: 24,
    width: 11,
    height: 11,
    data: {
      fontSize: 50,
      fontWeight: 'bold',
      color: '#111827',
      backgroundColor: '#f97316',
      textAlign: 'center',
      animation: 'fade',
    },
    preview: {
      variant: 'marker',
      badge: 'Alert',
      title: '!',
      subtitle: 'Attention',
    },
  },
  {
    id: 'strip',
    label: 'Strip Latar',
    description: 'Strip penuh untuk section, episode, atau label scene.',
    text: 'SECTION',
    durationMs: 5_000,
    x: 50,
    y: 12,
    width: 100,
    height: 9,
    data: {
      fontSize: 26,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(15, 23, 42, 0.86)',
      textAlign: 'center',
      animation: 'slide-down',
    },
    preview: {
      variant: 'strip',
      badge: 'Bar',
      title: 'SECTION',
      subtitle: 'Full strip',
    },
  },
  {
    id: 'strip-top',
    label: 'Strip Atas',
    description: 'Strip di bagian atas untuk judul section atau episode.',
    text: 'BAGIAN 1',
    durationMs: 5_000,
    x: 50,
    y: 8,
    width: 100,
    height: 8,
    data: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(88, 28, 135, 0.82)',
      textAlign: 'center',
      animation: 'slide-down',
    },
    preview: {
      variant: 'strip',
      badge: 'Top',
      title: 'BAGIAN 1',
      subtitle: 'Top strip',
    },
  },
  {
    id: 'strip-bottom',
    label: 'Strip Bawah',
    description: 'Strip bawah untuk label, disclaimer, atau context singkat.',
    text: 'INFO TAMBAHAN',
    durationMs: 5_000,
    x: 50,
    y: 92,
    width: 100,
    height: 8,
    data: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(15, 23, 42, 0.88)',
      textAlign: 'center',
      animation: 'slide-up',
    },
    preview: {
      variant: 'strip',
      badge: 'Bottom',
      title: 'INFO',
      subtitle: 'Bottom strip',
    },
  },
];

export function getCanvasPresetSettings(
  presetId: VideoStudioCanvasPresetId,
): Pick<ModernProjectSettings, 'width' | 'height'> {
  const preset = videoStudioCanvasPresets.find((item) => item.id === presetId);
  return {
    width: preset?.width ?? 1080,
    height: preset?.height ?? 1920,
  };
}

export function getTextQuickAction(actionId: VideoStudioTextActionId): VideoStudioTextAction {
  const fallback = videoStudioTextActions[0];
  if (!fallback) {
    throw new Error('Video Studio text actions are not configured.');
  }

  return videoStudioTextActions.find((action) => action.id === actionId) ?? fallback;
}

/**
 * Narrows backend catalog IDs to the built-in text action union used by the UI.
 */
export function isVideoStudioTextActionId(value: string): value is VideoStudioTextActionId {
  return videoStudioTextActions.some((action) => action.id === value);
}

export function buildTextQuickActionLayerUpdate(
  layer: TextLayer,
  action: VideoStudioTextAction,
): Partial<TextLayer> {
  return {
    x: action.x,
    y: action.y,
    width: action.width,
    height: action.height,
    endMs: layer.startMs + action.durationMs,
    data: {
      ...layer.data,
      text: action.text,
      ...action.data,
    },
  };
}
