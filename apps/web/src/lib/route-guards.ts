import { redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';

async function settleAuthState(): Promise<ReturnType<typeof useAuthStore.getState>> {
  const auth = useAuthStore.getState();

  if (auth.isLoading) {
    await auth.checkAuth();
  }

  return useAuthStore.getState();
}

export async function requireAuthenticatedRoute(): Promise<void> {
  const auth = await settleAuthState();

  if (!auth.isAuthenticated) {
    throw redirect({ to: '/login', replace: true });
  }
}

export async function requirePublicRoute(): Promise<void> {
  const auth = await settleAuthState();

  if (auth.isAuthenticated) {
    throw redirect({ to: '/dashboard', replace: true });
  }
}

export async function requireAdminRoute(): Promise<void> {
  await requireAuthenticatedRoute();

  const { user } = useAuthStore.getState();

  if (user?.role !== 'ADMIN') {
    throw redirect({ to: '/dashboard', replace: true });
  }
}

export async function redirectUnknownRoute(): Promise<void> {
  const auth = await settleAuthState();

  throw redirect({ to: auth.isAuthenticated ? '/dashboard' : '/', replace: true });
}
