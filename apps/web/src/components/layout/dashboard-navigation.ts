import {
  FolderClock,
  LayoutDashboard,
  type LucideIcon,
  MessageSquareReply,
  Radio,
  Repeat,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Wand2,
} from 'lucide-react';

/** Link rendered directly in the dashboard sidebar. */
export interface DashboardNavigationLink {
  name: string;
  href: string;
  icon: LucideIcon;
}

/** Expandable collection of dashboard sidebar links. */
export interface DashboardNavigationGroup {
  name: string;
  icon: LucideIcon;
  children: ReadonlyArray<DashboardNavigationLink>;
}

/** Navigation entry supported by the dashboard sidebar. */
export type DashboardNavigationItem = DashboardNavigationLink | DashboardNavigationGroup;

/** Tool links currently exposed from the dashboard sidebar. */
export const dashboardToolNavigation: ReadonlyArray<DashboardNavigationLink> = [
  {
    name: 'AI Director',
    href: '/tools/ai-director',
    icon: Sparkles,
  },
  {
    name: 'Video Studio',
    href: '/tools/video-studio',
    icon: Wand2,
  },
  { name: 'Loop Creator', href: '/tools/loop-creator', icon: Repeat },
  {
    name: 'Reaction Video',
    href: '/tools/reaction',
    icon: MessageSquareReply,
  },
  { name: 'Live Streaming', href: '/tools/live-stream-history', icon: Radio },
];

export const dashboardNavigation: ReadonlyArray<DashboardNavigationItem> = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Trending', href: '/dashboard/trending', icon: TrendingUp },
  {
    name: 'Tools',
    icon: Video,
    children: dashboardToolNavigation,
  },
  { name: 'Riwayat', href: '/dashboard/history', icon: FolderClock },
  { name: 'Prompt Builder', href: '/dashboard/prompts', icon: Sparkles },
  { name: 'Community', href: '/dashboard/community', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];
