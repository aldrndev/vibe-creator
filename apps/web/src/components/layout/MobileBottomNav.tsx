import { NavLink, useMatch } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Download, 
  Settings,
  Plus
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard, end: true },
  { name: 'Exports', href: '/dashboard/exports', icon: FolderOpen },
  { name: 'Create', href: '/dashboard/prompts', icon: Plus, isMain: true },
  { name: 'Downloads', href: '/dashboard/downloads', icon: Download },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function MobileBottomNav() {
  // Use useMatch to check if we're on editor page - more specific than useLocation
  const isEditorPage = useMatch('/editor/:projectId');
  const isToolsEditor = useMatch('/tools/editor');
  
  // Don't show on editor page
  if (isEditorPage || isToolsEditor) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-content1/95 backdrop-blur-lg border-t border-divider safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          if (item.isMain) {
            // Use same pattern as other items - no Button component
            return (
              <NavLink 
                key={item.name} 
                to={item.href}
                className="flex items-center justify-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg -mt-4 flex items-center justify-center">
                  <item.icon size={24} />
                </div>
              </NavLink>
            );
          }
          
          // Use NavLink's className function for isActive - exactly like sidebar
          return (
            <NavLink 
              key={item.name} 
              to={item.href}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative',
                  isActive ? 'text-primary' : 'text-foreground/50'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                  {isActive && (
                    <div className="absolute -bottom-0 w-8 h-0.5 bg-primary rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
