import type { DashboardTool } from '@vibe-creator/shared';
import { type LucideIcon, Radio, Repeat, Sparkles, TrendingUp, Video, Wand2 } from 'lucide-react';

export interface DashboardQuickAction {
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly accentClass: string;
}

export const dashboardQuickActions: readonly DashboardQuickAction[] = [
  {
    title: 'AI Director',
    description: 'Analisis video dan buat short otomatis.',
    href: '/tools/ai-director',
    icon: Sparkles,
    accentClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  },
  {
    title: 'Video Studio',
    description: 'Edit timeline, layer, audio, dan export.',
    href: '/tools/video-studio',
    icon: Wand2,
    accentClass: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  },
  {
    title: 'Loop Creator',
    description: 'Perpanjang video ambience menjadi loop.',
    href: '/tools/loop-creator',
    icon: Repeat,
    accentClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    title: 'Reaction Recorder',
    description: 'Record atau upload reaction sambil menonton.',
    href: '/tools/reaction',
    icon: Video,
    accentClass: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
  {
    title: 'Live Streaming',
    description: 'Kelola stream, quota, dan history RTMP.',
    href: '/tools/live-stream-history',
    icon: Radio,
    accentClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
];

export function getDashboardToolLabel(tool: DashboardTool): string {
  if (tool === 'ai-director') return 'AI Director';
  if (tool === 'video-studio') return 'Video Studio';
  if (tool === 'loop-creator') return 'Loop Creator';
  if (tool === 'reaction-video') return 'Reaction';
  return 'Live Stream';
}

export function getDashboardToolIcon(tool: DashboardTool): LucideIcon {
  if (tool === 'ai-director') return Sparkles;
  if (tool === 'loop-creator') return Repeat;
  if (tool === 'reaction-video') return Video;
  if (tool === 'live-stream') return TrendingUp;
  return Wand2;
}
