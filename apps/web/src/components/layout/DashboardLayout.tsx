import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareReply,
  Moon,
  Radio,
  Repeat,
  Settings,
  Shield,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { FEATURES } from '@/lib/feature-flags';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { MobileBottomNav } from './MobileBottomNav';

// Build Tools children based on feature flags
const toolsChildren = [
  {
    name: 'AI Director',
    href: '/tools/ai-director',
    icon: Sparkles,
  },
  FEATURES.MODERN_EDITOR && {
    name: 'Video Studio',
    href: '/tools/video-studio',
    icon: Wand2,
  },
  { name: 'Edit Video', href: '/tools/editor', icon: Video },
  { name: 'Loop Creator', href: '/tools/loop-creator', icon: Repeat },
  {
    name: 'Reaction Video',
    href: '/tools/reaction-creator',
    icon: MessageSquareReply,
  },
  { name: 'Live Streaming', href: '/tools/live-stream-history', icon: Radio },
].filter(Boolean) as Array<{ name: string; href: string; icon: typeof Video }>;

// Main navigation items
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Trending', href: '/dashboard/trending', icon: TrendingUp },
  // { name: "My Exports", href: "/dashboard/exports", icon: FolderOpen },
  {
    name: 'Tools',
    icon: Video,
    children: toolsChildren,
  },
  { name: 'Prompt Builder', href: '/dashboard/prompts', icon: Sparkles },
  // { name: "Downloads", href: "/dashboard/downloads", icon: Download },
  { name: 'Community', href: '/dashboard/community', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const adminNav = { name: 'Admin', href: '/dashboard/admin', icon: Shield };

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-background border-r border-border transition-transform duration-300 lg:static lg:translate-x-0 lg:bg-card/60 lg:backdrop-blur-xl',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-border shadow-sm">
            <Link
              to="/"
              className="flex items-center gap-2 text-xl font-black tracking-tighter hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-linear-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="text-white w-5 h-5" />
              </div>
              <span className="bg-clip-text text-transparent bg-linear-to-r from-primary via-orange-500 to-rose-600">
                Vibe Creator
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto scrollbar-hide">
            {navigation.map((item) => {
              // Check if this is a parent menu with children
              if ('children' in item && item.children) {
                const isChildActive = item.children.some(
                  (child) => location.pathname === child.href,
                );

                return (
                  <div key={item.name}>
                    {/* Parent menu button */}
                    <button
                      type="button"
                      onClick={() => setToolsExpanded(!toolsExpanded)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-r-xl px-4 py-3 text-sm font-medium transition-all duration-200 touch-target border-l-[3px]',
                        isChildActive
                          ? 'border-primary bg-linear-to-r from-primary/15 to-transparent text-primary font-bold'
                          : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <item.icon
                        size={20}
                        className={cn(
                          'transition-colors',
                          isChildActive &&
                            'text-primary drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]',
                        )}
                      />
                      {item.name}
                      <span className="ml-auto">
                        {toolsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </button>

                    {/* Child menu items */}
                    {toolsExpanded && (
                      <div className="ml-4 mt-1 space-y-1 pl-2 border-l border-border/40">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.name}
                            to={child.href}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                                isActive
                                  ? 'text-primary bg-primary/10 font-semibold'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                              )
                            }
                          >
                            <child.icon size={16} />
                            {child.name}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // Regular menu item
              if (!item.href) {
                return null;
              }

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/dashboard'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-r-xl px-4 py-3 text-sm font-medium transition-all duration-200 touch-target border-l-[3px]',
                      isActive
                        ? 'border-primary bg-linear-to-r from-primary/15 to-transparent text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        size={20}
                        className={cn(
                          'transition-colors',
                          isActive && 'text-primary drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]',
                        )}
                      />
                      {item.name}
                    </>
                  )}
                </NavLink>
              );
            })}

            {/* Admin Menu - only visible for ADMIN role */}
            {user?.role === 'ADMIN' && (
              <NavLink
                to={adminNav.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-yellow-500/20 text-yellow-500'
                      : 'text-yellow-500 hover:bg-yellow-500/10',
                  )
                }
              >
                <adminNav.icon size={20} />
                {adminNav.name}
                <Badge variant="warning" className="ml-auto">
                  Admin
                </Badge>
              </NavLink>
            )}
          </nav>

          {/* User section */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <Avatar name={user?.name ?? 'User'} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className={cn(
            'flex h-16 items-center justify-between border-b border-border px-6 sticky top-0 z-30 transition-all duration-300',
            location.pathname.includes('/video-studio')
              ? 'bg-background border-b-0' // More solid background for editor to avoid ghosting
              : 'bg-card/80 backdrop-blur-md',
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar name={user?.name ?? 'User'} size="sm" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-3 px-3 py-3 mb-1">
                  <Avatar
                    name={user?.name ?? 'User'}
                    size="sm"
                    className="ring-2 ring-primary/20"
                  />
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-black tracking-tight truncate">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-white focus:bg-destructive mt-1 mx-1 rounded-xl"
                >
                  <LogOut size={16} />
                  <span className="font-bold">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main
          key={location.pathname}
          className={cn(
            'flex-1 flex flex-col min-w-0', // base styles
            // For Modern Editor (Full Screen Tool), remove padding/overflow to let tool handle it
            location.pathname.includes('/video-studio')
              ? 'overflow-hidden p-0'
              : 'overflow-auto p-4 md:p-6 pb-20 md:pb-6',
          )}
        >
          <Outlet />
        </main>

        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
