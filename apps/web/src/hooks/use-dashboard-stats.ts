import { useQuery } from '@tanstack/react-query';
import type { ApiResponse } from '@vibe-creator/shared';
import { api } from '@/services/api';

interface DashboardStats {
  projects: number;
  prompts: number;
  exports: number;
  downloads: number;
}

interface CursorListResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

function getPaginatedCount<T>(response: ApiResponse<T[]>): number {
  if (!response.success) {
    return 0;
  }

  return response.meta?.total ?? response.data.length;
}

function getCursorCount<T>(response: ApiResponse<CursorListResult<T>>): number {
  if (!response.success) {
    return 0;
  }

  return response.data.total ?? response.data.items.length;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch all stats in parallel
      const [projectsRes, promptsRes, exportsRes, downloadsRes] = await Promise.all([
        api.get<unknown[]>('/projects?limit=1'),
        api.get<unknown[]>('/prompts?limit=1'),
        api.get<CursorListResult<unknown>>('/export/history'),
        api.get<CursorListResult<unknown>>('/download/history'),
      ]);

      return {
        projects: getPaginatedCount(projectsRes),
        prompts: getPaginatedCount(promptsRes),
        exports: getCursorCount(exportsRes),
        downloads: getCursorCount(downloadsRes),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for dashboard stats
  });
}
