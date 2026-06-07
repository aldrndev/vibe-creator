import { createRootRouteWithContext, Outlet, useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/ui';
import { useScrollToTopOnChange } from '@/hooks/use-scroll-to-top-on-change';
import { useAuthStore } from '@/stores/auth-store';
import type { AppRouterContext } from '../router';

function RootShell() {
  const { checkAuth } = useAuthStore();
  const location = useLocation();

  useScrollToTopOnChange(`${location.pathname}${location.searchStr}`);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootShell,
});
