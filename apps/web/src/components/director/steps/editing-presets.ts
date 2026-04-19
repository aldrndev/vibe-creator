import type { ExportSettings, SubtitleStyle } from '@/stores/director-store';

export interface PlatformPreset {
  readonly id: 'shorts' | 'tiktok' | 'reels';
  readonly label: string;
  readonly description: string;
  readonly exportSettings: Partial<ExportSettings>;
  readonly subtitleStyle: Partial<SubtitleStyle>;
}

export interface SubtitlePreset {
  readonly id: 'karaoke' | 'cinema' | 'viral' | 'clean' | 'podcast' | 'social-hook' | 'story';
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
      fontSize: 32,
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
      fontSize: 38,
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
      fontSize: 32,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'bottom',
      animation: 'fade',
    },
  },
];

export const subtitlePresets: SubtitlePreset[] = [
  {
    id: 'karaoke',
    label: 'Karaoke',
    description: 'Highlight kata berjalan supaya subtitle terasa hidup dan ritmis.',
    subtitleStyle: {
      fontToken: 'F_INTER',
      fontSize: 44,
      textColorToken: 'C_YELLOW',
      bgColorToken: 'BG_TRANSPARENT',
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
      fontSize: 28,
      textColorToken: 'C_WHITE',
      bgColorToken: 'BG_TRANSPARENT',
      position: 'cinema-bottom',
      animation: 'phrase',
    },
  },
  {
    id: 'viral',
    label: 'Viral',
    description: 'Tebal, kontras tinggi, dan paling mencolok untuk hook.',
    subtitleStyle: {
      fontToken: 'F_INTER',
      fontSize: 52,
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
      fontSize: 32,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'bottom',
      animation: 'none',
    },
  },
  {
    id: 'social-hook',
    label: 'Social Hook',
    description: 'Word-by-word besar di tengah layar, optimal untuk hook cepat di sosial media.',
    subtitleStyle: {
      fontToken: 'F_INTER',
      fontSize: 48,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'center',
      animation: 'word',
    },
  },
  {
    id: 'podcast',
    label: 'Podcast',
    description: 'Cocok untuk talking head dan percakapan yang lebih panjang.',
    subtitleStyle: {
      fontToken: 'F_SERIF',
      fontSize: 34,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'bottom',
      animation: 'typewriter',
    },
  },
  {
    id: 'story',
    label: 'Story',
    description: 'Per baris penuh, aman untuk storytelling, dokumenter, dan narasi dramatis.',
    subtitleStyle: {
      fontToken: 'F_INTER',
      fontSize: 32,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'safe-bottom',
      animation: 'line',
    },
  },
];
