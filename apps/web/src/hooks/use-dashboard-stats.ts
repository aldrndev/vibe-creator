import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

interface DashboardStats {
  projects: number;
  prompts: number;
  exports: number;
  downloads: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch all stats in parallel
      const [projectsRes, promptsRes, exportsRes, downloadsRes] = await Promise.all([
        api.get<unknown[]>('/projects?limit=1'),
        api.get<unknown[]>('/prompts?limit=1'),
        api.get<unknown[]>('/export/history'),
        api.get<unknown[]>('/download/history'),
      ]);

      return {
        projects: (projectsRes as { meta?: { total?: number }; data?: unknown[] }).meta?.total ?? 
                  (projectsRes as { data?: unknown[] }).data?.length ?? 0,
        prompts: (promptsRes as { meta?: { total?: number }; data?: unknown[] }).meta?.total ?? 
                 (promptsRes as { data?: unknown[] }).data?.length ?? 0,
        exports: (exportsRes as { data?: unknown[] }).data?.length ?? 0,
        downloads: (downloadsRes as { data?: unknown[] }).data?.length ?? 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for dashboard stats
  });
}
