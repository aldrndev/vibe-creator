import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/services/api';

const announcementSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

const announcementListSchema = z.array(announcementSchema);

export type Announcement = z.infer<typeof announcementSchema>;

// Query: List public announcements
export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const response = await api.get<Announcement[]>('/announcements');
      if (!response.success) throw new Error('Failed to fetch announcements');
      const parsed = announcementListSchema.safeParse(response.data ?? []);
      if (!parsed.success) throw new Error('Invalid announcements response');
      return parsed.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for announcements (rarely changes)
  });
}
