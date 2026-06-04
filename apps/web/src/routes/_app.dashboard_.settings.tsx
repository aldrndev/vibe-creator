import { createFileRoute } from '@tanstack/react-router';
import { parseRouteSearch, paymentSearchSchema } from '@/lib/route-search';
import SettingsPage from '@/pages/dashboard/SettingsPage';

export const Route = createFileRoute('/_app/dashboard_/settings')({
  validateSearch: (search) => parseRouteSearch(paymentSearchSchema, search),
  component: SettingsPage,
});
