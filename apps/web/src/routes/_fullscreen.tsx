import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireAuthenticatedRoute } from '@/lib/route-guards';

export const Route = createFileRoute('/_fullscreen')({
  beforeLoad: requireAuthenticatedRoute,
  component: Outlet,
});
