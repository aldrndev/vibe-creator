import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import type { AppRouterContext } from '../router';

function RootShell() {
  const { checkAuth } = useAuthStore();

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
