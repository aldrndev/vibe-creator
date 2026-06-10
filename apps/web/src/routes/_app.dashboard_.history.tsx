import { createFileRoute } from '@tanstack/react-router';
import { historySearchSchema, parseRouteSearch } from '@/lib/route-search';
import { WorkspaceHistoryPage } from '@/pages/dashboard/WorkspaceHistoryPage';

export const Route = createFileRoute('/_app/dashboard_/history')({
  validateSearch: (search) => parseRouteSearch(historySearchSchema, search),
  component: WorkspaceHistoryPage,
});
