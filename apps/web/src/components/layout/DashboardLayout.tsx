import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Button, Avatar, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Chip } from '@heroui/react';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Sparkles, 
  Download, 
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Shield,
  Users,
  ChevronDown,
  ChevronRight,
  Video,
  Repeat,
  MessageSquareReply,
  Radio
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { clsx } from 'clsx';
import { MobileBottomNav } from './MobileBottomNav';

// Main navigation items
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Exports', href: '/dashboard/exports', icon: FolderOpen },
  { 
    name: 'Tools', 
    icon: Video,
    children: [
      { name: 'Edit Video', href: '/tools/editor', icon: Video },
      { name: 'Loop Creator', href: '/tools/loop-creator', icon: Repeat },
      { name: 'Reaction Video', href: '/tools/reaction-creator', icon: MessageSquareReply },
      { name: 'Live Streaming', href: '/tools/live-stream', icon: Radio },
    ]
  },
  { name: 'Prompt Builder', href: '/dashboard/prompts', icon: Sparkles },
  { name: 'Downloads', href: '/dashboard/downloads', icon: Download },
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
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-content1 border-r border-divider transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-divider">
            <span className="text-xl font-bold gradient-text">Vibe Creator</span>
            <Button
              isIconOnly
              variant="light"
              size="sm"
              className="lg:hidden"
              onPress={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto scrollbar-hide">
            {navigation.map((item) => {
              // Check if this is a parent menu with children
              if ('children' in item && item.children) {
                const isChildActive = item.children.some(child => location.pathname === child.href);
                
                return (
                  <div key={item.name}>
                    {/* Parent menu button */}
                    <button
                      onClick={() => setToolsExpanded(!toolsExpanded)}
                      className={clsx(
                        'w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors touch-target',
                        isChildActive
                          ? 'bg-primary/20 text-primary'
                          : 'text-foreground/70 hover:bg-default-100 hover:text-foreground'
                      )}
                    >
                      <item.icon size={20} />
                      {item.name}
                      <span className="ml-auto">
                        {toolsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </button>
                    
                    {/* Child menu items */}
                    {toolsExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-divider pl-2">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.name}
                            to={child.href}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                              clsx(
                                'flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-foreground/60 hover:bg-default-100 hover:text-foreground'
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
              return (
                <NavLink
                  key={item.name}
                  to={item.href!}
                  end={item.href === '/dashboard'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors touch-target',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground/70 hover:bg-default-100 hover:text-foreground'
                    )
                  }
                >
                  <item.icon size={20} />
                  {item.name}
                </NavLink>
              );
            })}
            
            {/* Admin Menu - only visible for ADMIN role */}
            {user?.role === 'ADMIN' && (
              <NavLink
                to={adminNav.href}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-warning text-warning-foreground'
                      : 'text-warning hover:bg-warning/20'
                  )
                }
              >
                <adminNav.icon size={20} />
                {adminNav.name}
                <Chip size="sm" color="warning" variant="flat" className="ml-auto">
                  Admin
                </Chip>
              </NavLink>
            )}
          </nav>

          {/* User section */}
          <div className="border-t border-divider p-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={user?.name ?? 'User'}
                size="sm"
                className="bg-primary text-primary-foreground"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-foreground/60 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-divider px-6 bg-content1/80 backdrop-blur-md sticky top-0 z-30">
          <Button
            isIconOnly
            variant="light"
            className="lg:hidden"
            onPress={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              isIconOnly
              variant="light"
              onPress={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </Button>

            {/* User menu */}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button isIconOnly variant="light" className="rounded-full">
                  <Avatar
                    name={user?.name ?? 'User'}
                    size="sm"
                    className="bg-primary text-primary-foreground"
                  />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="User menu">
                <DropdownItem
                  key="profile"
                  className="h-14 gap-2"
                  textValue="Profile"
                >
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-sm text-foreground/60">{user?.email}</p>
                </DropdownItem>
                <DropdownItem key="settings" href="/dashboard/settings">
                  Settings
                </DropdownItem>
                <DropdownItem 
                  key="logout" 
                  color="danger"
                  startContent={<LogOut size={16} />}
                  onPress={handleLogout}
                >
                  Logout
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>

        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
