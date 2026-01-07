import { useEffect } from "react";
import { Tabs, Tab } from "@heroui/react";
import { Users, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { AdminHeader } from "@/components/dashboard/admin/AdminHeader";
import { SystemStats } from "@/components/dashboard/admin/SystemStats";
import { UsersTable } from "@/components/dashboard/admin/UsersTable";
import { AnnouncementsPanel } from "@/components/dashboard/admin/AnnouncementsPanel";
import {
  EditSubscriptionModal,
  CreateAnnouncementModal,
} from "@/components/dashboard/admin/AdminModals";
import { useAdminData } from "@/hooks/useAdminData";

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
    if (user && user.role !== "ADMIN") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  if (user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <AdminHeader />

      <SystemStats stats={stats} />

      {/* Tabs for Users and Announcements */}
      <Tabs aria-label="Admin sections" color="primary" variant="underlined">
        <Tab
          key="users"
          title={
            <div className="flex items-center gap-2">
              <Users size={16} /> Users
            </div>
          }
        >
          <UsersTable
            users={users}
            isLoading={isLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onEditUser={(u) => {
              setSelectedUser(u);
              setSelectedTier(u.subscription?.tier || "FREE");
              editModal.onOpen();
            }}
          />
        </Tab>

        <Tab
          key="announcements"
          title={
            <div className="flex items-center gap-2">
              <Megaphone size={16} /> Pengumuman
            </div>
          }
        >
          <AnnouncementsPanel
            announcements={announcements}
            isLoading={announcementsLoading}
            onOpenCreate={announcementModal.onOpen}
            onUpdate={updateAnnouncement}
            onDelete={deleteAnnouncement}
          />
        </Tab>
      </Tabs>

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
