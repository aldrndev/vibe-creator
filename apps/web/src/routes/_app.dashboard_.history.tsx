import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceHistoryPage } from '@/pages/dashboard/WorkspaceHistoryPage';

export const Route = createFileRoute('/_app/dashboard_/history')({
  component: WorkspaceHistoryPage,
});
