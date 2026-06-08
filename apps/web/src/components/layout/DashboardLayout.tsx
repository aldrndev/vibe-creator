import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { dashboardNavigation } from '@/components/layout/dashboard-navigation';
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
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

const adminNav = { name: 'Admin', href: '/dashboard/admin', icon: Shield };

function isNavigationActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === href;
  }

  if (href === '/tools/live-stream-history') {
    return pathname === href || pathname.startsWith('/tools/live-stream');
  }

  return pathname === href;
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate({ to: '/login' });
  };

  return (
    <div
      className="flex h-screen bg-background text-foreground group/layout"
      data-sidebar-collapsed={sidebarCollapsed}
    >
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transform bg-background border-border transition-all duration-300 lg:bg-card/60 lg:backdrop-blur-xl lg:relative',
          sidebarOpen ? 'translate-x-0 w-64 border-r' : '-translate-x-full w-64 border-r',
          sidebarCollapsed
            ? 'lg:translate-x-0 lg:w-0 lg:border-r-0 lg:pointer-events-none'
            : 'lg:translate-x-0 lg:w-64 lg:border-r lg:pointer-events-auto',
        )}
      >
        <div
          className={cn(
            'flex h-full flex-col transition-all duration-300',
            sidebarCollapsed
              ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden lg:pointer-events-none'
              : 'lg:opacity-100 lg:w-64 lg:pointer-events-auto',
          )}
        >
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-border shadow-sm">
            <Link
              to="/"
              className="flex items-center gap-2 text-xl font-black tracking-tighter hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-linear-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center">
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
            {dashboardNavigation.map((item) => {
              // Check if this is a parent menu with children
              if ('children' in item) {
                const isChildActive = item.children.some((child) =>
                  isNavigationActive(location.pathname, child.href),
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
                          ? 'border-primary/70 bg-primary/10 text-primary font-bold'
                          : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <item.icon
                        size={20}
                        className={cn('transition-colors', isChildActive && 'text-primary')}
                      />
                      {item.name}
                      <span className="ml-auto">
                        {toolsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </button>

                    {/* Child menu items */}
                    {toolsExpanded && (
                      <div className="ml-4 mt-1 space-y-1 pl-2 border-l border-border/40">
                        {item.children.map((child) => {
                          const isActive = isNavigationActive(location.pathname, child.href);

                          return (
                            <Link
                              key={child.name}
                              to={child.href}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                'flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                                isActive
                                  ? 'text-primary bg-primary/10 font-semibold'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                              )}
                            >
                              <child.icon size={16} />
                              {child.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Regular menu item
              if (!item.href) {
                return null;
              }

              const isActive = isNavigationActive(location.pathname, item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-r-xl px-4 py-3 text-sm font-medium transition-all duration-200 touch-target border-l-[3px]',
                    isActive
                      ? 'border-primary/70 bg-primary/10 text-primary font-bold'
                      : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <item.icon
                    size={20}
                    className={cn('transition-colors', isActive && 'text-primary')}
                  />
                  {item.name}
                </Link>
              );
            })}

            {/* Admin Menu - only visible for ADMIN role */}
            {user?.role === 'ADMIN' &&
              (() => {
                const isActive = isNavigationActive(location.pathname, adminNav.href);

                return (
                  <Link
                    to={adminNav.href}
                    className={cn(
                      'flex items-center gap-3 rounded-r-xl border-l-[3px] px-4 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-primary/70 bg-primary/10 text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <adminNav.icon size={20} />
                    {adminNav.name}
                    <Badge
                      variant="outline"
                      className="ml-auto border-primary/20 bg-primary/10 text-primary"
                    >
                      Admin
                    </Badge>
                  </Link>
                );
              })()}
          </nav>

          {/* User section */}
          <div className="border-t border-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent"
                >
                  <Avatar name={user?.name ?? 'User'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-bold">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSidebarOpen(false);
                    navigate({ to: '/dashboard/settings' });
                  }}
                >
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSidebarOpen(false);
                    void handleLogout();
                  }}
                  className="text-destructive focus:bg-destructive focus:text-white"
                >
                  <LogOut size={16} />
                  <span className="font-bold">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Floating Toggle Button positioned near the top on the border line */}
        <button
          type="button"
          onClick={toggleSidebar}
          className={cn(
            'hidden lg:flex absolute top-4 z-50 h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md transition-all duration-200 hover:scale-110 hover:text-foreground active:scale-95 cursor-pointer lg:pointer-events-auto',
            sidebarCollapsed ? 'left-4' : '-right-4',
          )}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className={cn(
            'flex h-16 items-center justify-between border-b border-border px-6 sticky top-0 z-30 transition-all duration-300 lg:hidden',
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
                <DropdownMenuItem onClick={() => navigate({ to: '/dashboard/settings' })}>
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
          data-scroll-root="true"
          className={cn(
            'flex-1 flex flex-col min-h-0 min-w-0 transition-all duration-300', // base styles
            // For Modern Editor (Full Screen Tool), remove padding/overflow to let tool handle it
            location.pathname.includes('/video-studio')
              ? 'overflow-hidden p-0'
              : cn(
                  'overflow-y-auto overflow-x-hidden p-4 pb-4 md:p-6 md:pb-6 lg:pb-0',
                  sidebarCollapsed && 'lg:pl-16',
                ),
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
