import { useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { AdminHeader } from '@/components/dashboard/admin/AdminHeader';
import {
  CreateAnnouncementModal,
  EditSubscriptionModal,
} from '@/components/dashboard/admin/AdminModals';
import { AnnouncementsPanel } from '@/components/dashboard/admin/AnnouncementsPanel';
import { SystemStats } from '@/components/dashboard/admin/SystemStats';
import { UsersTable } from '@/components/dashboard/admin/UsersTable';
import { useAdminData } from '@/hooks/useAdminData';
import { useAuthStore } from '@/stores/auth-store';

export function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
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
  } = useAdminData();

  // Check admin role
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="pb-20 pt-6 px-6 w-full mx-auto space-y-10">
      <AdminHeader />

      <SystemStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Users Table (2/3) */}
        <div className="lg:col-span-2">
          <UsersTable
            users={users}
            isLoading={isLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onEditUser={(u) => {
              setSelectedUser(u);
              setSelectedTier(u.subscription?.tier || 'FREE');
              editModal.onOpen();
            }}
          />
        </div>

        {/* Right Column: Announcements (1/3) */}
        <div className="lg:col-span-1">
          <AnnouncementsPanel
            announcements={announcements}
            isLoading={announcementsLoading}
            onOpenCreate={announcementModal.onOpen}
            onUpdate={updateAnnouncement}
            onDelete={deleteAnnouncement}
          />
        </div>
      </div>

      <EditSubscriptionModal
        isOpen={editModal.isOpen}
        onClose={editModal.onClose}
        user={selectedUser}
        selectedTier={selectedTier}
        onSelectionChange={setSelectedTier}
        onUpdate={updateSubscription}
      />

      <CreateAnnouncementModal
        isOpen={announcementModal.isOpen}
        onClose={announcementModal.onClose}
        onCreate={createAnnouncement}
      />
    </div>
  );
}
