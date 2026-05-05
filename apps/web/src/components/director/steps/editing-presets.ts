import type { ExportSettings, SubtitleStyle } from '@/stores/director-store';

export interface PlatformPreset {
  readonly id: 'shorts' | 'tiktok' | 'reels';
  readonly label: string;
  readonly description: string;
  readonly exportSettings: Partial<ExportSettings>;
  readonly subtitleStyle: Partial<SubtitleStyle>;
}

export interface SubtitlePreset {
  readonly id: 'viral-pop' | 'meme-pop' | 'clean-bold' | 'neon-glow' | 'creator-box' | 'cinema';
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
    id: 'viral-pop',
    label: 'Viral Pop',
    description: 'Kata aktif membesar dengan warna hook mencolok untuk Shorts, Reels, dan TikTok.',
    subtitleStyle: {
      stylePreset: 'viral-pop',
      fontToken: 'F_DISPLAY',
      fontSize: 52,
      textColorToken: 'C_YELLOW',
      bgColorToken: 'BG_TRANSPARENT',
      position: 'center',
      animation: 'pop-word',
    },
  },
  {
    id: 'meme-pop',
    label: 'Meme Pop',
    description:
      'Teks hijau neon ala meme, outline hitam tebal, cocok untuk punchline dan reaction.',
    subtitleStyle: {
      stylePreset: 'meme-pop',
      fontToken: 'F_MEME',
      fontSize: 52,
      textColorToken: 'C_GREEN',
      bgColorToken: 'BG_TRANSPARENT',
      position: 'center',
      animation: 'pop-word',
    },
  },
  {
    id: 'clean-bold',
    label: 'Clean Bold',
    description: 'Tebal, bersih, dan kontras tinggi. Aman untuk hampir semua jenis video.',
    subtitleStyle: {
      stylePreset: 'clean-bold',
      fontToken: 'F_GROTESK',
      fontSize: 38,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'bottom',
      animation: 'fade',
    },
  },
  {
    id: 'neon-glow',
    label: 'Neon Glow',
    description: 'Teks terang dengan nuansa glow untuk footage gelap dan konten energetic.',
    subtitleStyle: {
      stylePreset: 'neon-glow',
      fontToken: 'F_CONDENSED',
      fontSize: 46,
      textColorToken: 'C_ORANGE',
      bgColorToken: 'BG_TRANSPARENT',
      position: 'center',
      animation: 'typewriter',
    },
  },
  {
    id: 'creator-box',
    label: 'Creator Box',
    description: 'Caption besar dengan box gelap transparan, cocok untuk talking head dan edukasi.',
    subtitleStyle: {
      stylePreset: 'creator-box',
      fontToken: 'F_ROUNDED',
      fontSize: 44,
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      position: 'center',
      animation: 'word',
    },
  },
  {
    id: 'cinema',
    label: 'Cinema',
    description: 'Frasa elegan di bawah frame untuk storytelling, montage, dan short film.',
    subtitleStyle: {
      stylePreset: 'cinema',
      fontToken: 'F_SERIF',
      fontSize: 30,
      textColorToken: 'C_WHITE',
      bgColorToken: 'BG_TRANSPARENT',
      position: 'bottom',
      animation: 'phrase',
    },
  },
];
