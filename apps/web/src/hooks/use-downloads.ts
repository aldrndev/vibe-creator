import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

interface DownloadJob {
  id: string;
  sourceUrl: string;
  title: string | null;
  platform: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  localPath: string | null;
  r2Key: string | null;
  metadata: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

// Query: List download history
export function useDownloads() {
  return useQuery({
    queryKey: ['downloads'],
    queryFn: async () => {
      const response = await api.get<DownloadJob[]>('/download/history');
      if (!response.success) throw new Error('Failed to fetch downloads');
      return response.data ?? [];
    },
  });
}

// Hook to manually refetch downloads (for refresh button)
export function useRefreshDownloads() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['downloads'] });
  };
}
