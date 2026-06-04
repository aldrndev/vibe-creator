import { createFileRoute } from '@tanstack/react-router';
import { parseRouteSearch, trendingSearchSchema } from '@/lib/route-search';
import { TrendingPage } from '@/pages/dashboard/TrendingPage';

export const Route = createFileRoute('/_app/dashboard_/trending')({
  validateSearch: (search) => parseRouteSearch(trendingSearchSchema, search),
  component: TrendingPage,
});
