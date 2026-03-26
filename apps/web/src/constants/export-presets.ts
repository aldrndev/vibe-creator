// Platform presets configuration
export const EXPORT_PRESETS = [
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'Music2', // Lucide icon name
    description: 'Portrait 9:16 • 1080p • 60fps',
    specs: { format: 'MP4', resolution: 'HD', width: 1080, height: 1920, fps: 60 },
  },
  {
    id: 'instagram-reels',
    name: 'Instagram Reels',
    icon: 'Instagram',
    description: 'Portrait 9:16 • 1080p • 30fps',
    specs: { format: 'MP4', resolution: 'HD', width: 1080, height: 1920, fps: 30 },
  },
  {
    id: 'youtube-shorts',
    name: 'YouTube Shorts',
    icon: 'Youtube',
    description: 'Portrait 9:16 • 1080p • 60fps',
    specs: { format: 'MP4', resolution: 'HD', width: 1080, height: 1920, fps: 60 },
  },
  {
    id: 'youtube-landscape',
    name: 'YouTube Video',
    icon: 'Youtube',
    description: 'Landscape 16:9 • 1080p • 60fps',
    specs: { format: 'MP4', resolution: 'HD', width: 1920, height: 1080, fps: 60 },
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Video',
    icon: 'Linkedin',
    description: 'Square 1:1 • 1080p • 30fps',
    specs: { format: 'MP4', resolution: 'HD', width: 1080, height: 1080, fps: 30 },
  },
  {
    id: 'custom',
    name: 'Custom / Manual',
    icon: 'Settings',
    description: 'Atur format & resolusi sendiri',
    specs: null,
  },
] as const;

export type ExportPresetId = (typeof EXPORT_PRESETS)[number]['id'];
