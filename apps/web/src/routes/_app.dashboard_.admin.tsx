import { createFileRoute } from '@tanstack/react-router';
import { requireAdminRoute } from '@/lib/route-guards';
import { AdminPage } from '@/pages/dashboard/AdminPage';

export const Route = createFileRoute('/_app/dashboard_/admin')({
  beforeLoad: requireAdminRoute,
  component: AdminPage,
});
