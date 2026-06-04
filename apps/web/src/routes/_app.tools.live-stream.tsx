import { createFileRoute } from '@tanstack/react-router';
import { parseRouteSearch, sessionSearchSchema } from '@/lib/route-search';
import { LiveStreamPage } from '@/pages/tools/LiveStreamPage';

export const Route = createFileRoute('/_app/tools/live-stream')({
  validateSearch: (search) => parseRouteSearch(sessionSearchSchema, search),
  component: LiveStreamPage,
});
