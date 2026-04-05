import type { ExportSettings, SubtitleStyle } from '@/stores/director-store';

export interface PlatformPreset {
  readonly id: 'shorts' | 'tiktok' | 'reels';
  readonly label: string;
  readonly description: string;
  readonly exportSettings: Partial<ExportSettings>;
  readonly subtitleStyle: Partial<SubtitleStyle>;
}

export interface SubtitlePreset {
  readonly id: 'viral' | 'clean' | 'podcast' | 'social-hook' | 'cinema' | 'story';
  readonly label: string;
  readonly description: string;
  readonly subtitleStyle: Partial<SubtitleStyle>;
}

export const platformPresets: PlatformPreset[] = [
  {
    id: 'shorts',
    label: 'YouTube Shorts',
    description: 'Aman untuk 9:16 dengan subtitle rapi di bawah.',
    exportSettings: {
      aspectRatio: '9:16',
      quality: '1080p',
      includeSubtitles: true,
      normalizeAudio: true,
    },
    subtitleStyle: {
      fontToken: 'F_INTER',
      fontSize: 28,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'bottom',
      animation: 'none',
    },
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    description: 'Subtitle lebih besar dan lebih dekat ke tengah frame.',
    exportSettings: {
      aspectRatio: '9:16',
      quality: '1080p',
      includeSubtitles: true,
      normalizeAudio: true,
    },
    subtitleStyle: {
      fontToken: 'F_INTER',
      fontSize: 32,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'center',
      animation: 'fade',
    },
  },
  {
    id: 'reels',
    label: 'Instagram Reels',
    description: 'Subtitle sedikit lebih kecil agar frame tetap lega.',
    exportSettings: {
      aspectRatio: '9:16',
      quality: '1080p',
      includeSubtitles: true,
      normalizeAudio: true,
    },
    subtitleStyle: {
      fontToken: 'F_INTER',
      fontSize: 26,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'bottom',
      animation: 'fade',
    },
  },
];

export const subtitlePresets: SubtitlePreset[] = [
  {
    id: 'viral',
    label: 'Viral',
    description: 'Tebal, kontras tinggi, dan paling mencolok untuk hook.',
    subtitleStyle: {
      fontToken: 'F_INTER',
      fontSize: 30,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'center',
      animation: 'fade',
    },
  },
  {
    id: 'clean',
    label: 'Clean',
    description: 'Minimalis dan aman untuk berbagai jenis konten.',
    subtitleStyle: {
      fontToken: 'F_INTER',
      fontSize: 24,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'bottom',
      animation: 'none',
    },
  },
  {
    id: 'podcast',
    label: 'Podcast',
    description: 'Cocok untuk talking head dan percakapan yang lebih panjang.',
    subtitleStyle: {
      fontToken: 'F_SERIF',
      fontSize: 26,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'bottom',
      animation: 'typewriter',
    },
  },
  {
    id: 'social-hook',
    label: 'Social Hook',
    description: 'Word-by-word besar di tengah layar, optimal untuk hook cepat di sosial media.',
    subtitleStyle: {
      fontToken: 'F_INTER',
      fontSize: 32,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'center',
      animation: 'typewriter',
    },
  },
  {
    id: 'cinema',
    label: 'Cinema',
    description: 'Per frasa, posisi cinematic bawah. Cocok untuk movie, short film, dan montage.',
    subtitleStyle: {
      fontToken: 'F_SERIF',
      fontSize: 22,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'cinema-bottom',
      animation: 'phrase',
    },
  },
  {
    id: 'story',
    label: 'Story',
    description: 'Per baris penuh, aman untuk storytelling, dokumenter, dan narasi dramatis.',
    subtitleStyle: {
      fontToken: 'F_INTER',
      fontSize: 24,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'safe-bottom',
      animation: 'line',
    },
  },
];
