import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { LayoutDashboard, MessageSquareReply, Repeat, Sparkles, Wand2 } from 'lucide-react';
import { NavLink, useLocation, useMatch } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard, end: true },
  { name: 'AI Director', href: '/tools/ai-director', icon: Sparkles },
  {
    name: 'Video Studio',
    href: '/tools/modern-editor',
    icon: Wand2,
    isMain: true,
  },
  { name: 'Loop Creator', href: '/tools/loop-creator', icon: Repeat },
  {
    name: 'Reaction',
    href: '/tools/reaction-creator',
    icon: MessageSquareReply,
  },
];

export function MobileBottomNav() {
  const location = useLocation();
  // Use useMatch for specific legacy routes
  const isEditorPage = useMatch('/editor/:projectId');
  const isToolsEditor = useMatch('/tools/editor');

  // Hide on ALL /tools/* routes (they are focused task pages with their own layouts)
  const isToolPage = location.pathname.startsWith('/tools/');

  if (isEditorPage || isToolsEditor || isToolPage) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/80 backdrop-blur-xl border-t border-border/50 safe-area-bottom shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-around h-16 px-4">
        {navItems.map((item) => {
          if (item.isMain) {
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className="flex items-center justify-center relative z-10"
              >
                <div className="w-14 h-14 rounded-full bg-linear-to-br from-primary via-orange-500 to-rose-600 text-white shadow-lg shadow-primary/30 -mt-10 flex items-center justify-center border-4 border-background transition-transform active:scale-90">
                  <item.icon size={26} strokeWidth={3} />
                </div>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-all relative active:scale-95',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={22}
                    className={cn('transition-transform', isActive && 'scale-110')}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-bold tracking-tight uppercase transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground/70',
                    )}
                  >
                    {item.name}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -bottom-1 w-6 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                    />
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
