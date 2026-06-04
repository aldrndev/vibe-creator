import { createFileRoute } from '@tanstack/react-router';
import { DownloadsPage } from '@/pages/dashboard/DownloadsPage';

export const Route = createFileRoute('/_app/dashboard_/downloads')({
  component: DownloadsPage,
});
