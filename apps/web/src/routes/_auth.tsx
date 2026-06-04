import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { requirePublicRoute } from '@/lib/route-guards';

function AuthRouteLayout() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}

export const Route = createFileRoute('/_auth')({
  beforeLoad: requirePublicRoute,
  component: AuthRouteLayout,
});
