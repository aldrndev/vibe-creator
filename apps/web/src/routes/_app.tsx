import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { requireAuthenticatedRoute } from '@/lib/route-guards';

export const Route = createFileRoute('/_app')({
  beforeLoad: requireAuthenticatedRoute,
  component: DashboardLayout,
});
