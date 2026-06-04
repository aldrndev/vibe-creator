import { createFileRoute } from '@tanstack/react-router';
import { LiveStreamHistoryPage } from '@/pages/tools/LiveStreamHistoryPage';

export const Route = createFileRoute('/_app/tools/live-stream-history')({
  component: LiveStreamHistoryPage,
});
