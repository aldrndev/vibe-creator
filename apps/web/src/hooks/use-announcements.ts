import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

interface Announcement {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

// Query: List public announcements
export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const response = await api.get<Announcement[]>('/announcements');
      if (!response.success) throw new Error('Failed to fetch announcements');
      return response.data ?? [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for announcements (rarely changes)
  });
}
