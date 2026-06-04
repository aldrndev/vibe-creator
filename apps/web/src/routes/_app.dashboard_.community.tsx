import { createFileRoute } from '@tanstack/react-router';
import { CommunityPage } from '@/pages/dashboard/CommunityPage';

export const Route = createFileRoute('/_app/dashboard_/community')({
  component: CommunityPage,
});
