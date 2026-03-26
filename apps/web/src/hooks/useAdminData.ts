import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { authFetch } from '@/services/api';

export interface AdminStats {
  users: {
    total: number;
    recent: number;
    byTier: { free: number; creator: number; pro: number };
  };
  projects: number;
  exports: { total: number; recent: number };
  revenue: { total: number; payments: number };
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  avatarUrl?: string | null;
  subscription: {
    tier: string;
    status: string;
    exportsUsed: number;
    exportsLimit: number;
  } | null;
  _count: { projects: number; exports: number };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Custom hook to replace @heroui/react useDisclosure
 */
function useDisclosure(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);
  const onOpenChange = useCallback((open: boolean) => setIsOpen(open), []);

  return { isOpen, onOpen, onClose, onOpenChange };
}

export function useAdminData() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Announcement state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  // Selection state
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('');

  // Modals
  const editModal = useDisclosure();
  const announcementModal = useDisclosure();

  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch('/api/v1/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (err) {
      logger.error('Failed to fetch stats', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = searchQuery
        ? `/api/v1/admin/users?search=${encodeURIComponent(searchQuery)}`
        : '/api/v1/admin/users';
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data.users);
      }
    } catch (err) {
      logger.error('Failed to fetch users', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const fetchAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const res = await authFetch('/api/v1/admin/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.data);
      }
    } catch (err) {
      logger.error('Failed to fetch announcements', err);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  // Actions
  const updateSubscription = async () => {
    if (!selectedUser || !selectedTier) return;
    try {
      const res = await authFetch(`/api/v1/admin/users/${selectedUser.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier }),
      });

      if (res.ok) {
        fetchUsers();
        editModal.onClose();
        return true;
      }
    } catch (err) {
      logger.error('Failed to update subscription', err);
    }
    return false;
  };

  const createAnnouncement = async (title: string, content: string) => {
    if (!title.trim() || !content.trim()) return;
    try {
      const res = await authFetch('/api/v1/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });

      if (res.ok) {
        fetchAnnouncements();
        announcementModal.onClose();
        return true;
      }
    } catch (err) {
      logger.error('Failed to create announcement', err);
    }
    return false;
  };

  const updateAnnouncement = async (id: string, data: Partial<Announcement>) => {
    try {
      const res = await authFetch(`/api/v1/admin/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        fetchAnnouncements();
      }
    } catch (err) {
      logger.error('Failed to update announcement', err);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    // Using inline confirmation instead of window.confirm per Digitesia standards
    try {
      const res = await authFetch(`/api/v1/admin/announcements/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchAnnouncements();
      }
    } catch (err) {
      logger.error('Failed to delete announcement', err);
    }
  };

  // Initial loads
  useEffect(() => {
    fetchStats();
    fetchAnnouncements();
  }, [fetchStats, fetchAnnouncements]);

  // Debounced search
  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [fetchUsers]);

  return {
    stats,
    users,
    searchQuery,
    setSearchQuery,
    isLoading,
    announcements,
    announcementsLoading,
    selectedUser,
    setSelectedUser,
    selectedTier,
    setSelectedTier,
    editModal,
    announcementModal,
    updateSubscription,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
  };
}
