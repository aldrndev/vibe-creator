import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '@/services/dashboard-api';

export const dashboardSummaryQueryKey = ['dashboard-summary'] as const;

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardSummaryQueryKey,
    queryFn: getDashboardSummary,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
