import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AdminActivityPanel } from '@/components/dashboard/admin/AdminActivityPanel';
import { AdminHeader } from '@/components/dashboard/admin/AdminHeader';
import {
  CreateAnnouncementModal,
  EditAnnouncementModal,
  EditSubscriptionModal,
  SoftDeleteModal,
  UserStatusModal,
} from '@/components/dashboard/admin/AdminModals';
import { AnnouncementsPanel } from '@/components/dashboard/admin/AnnouncementsPanel';
import { SystemStats } from '@/components/dashboard/admin/SystemStats';
import { UserDetailModal } from '@/components/dashboard/admin/UserDetailModal';
import { UsersTable } from '@/components/dashboard/admin/UsersTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import {
  type AdminUserFilters,
  type AdminUserStatus,
  type Announcement,
  type UserData,
  useAdminData,
} from '@/hooks/useAdminData';
import { useAuthStore } from '@/stores/auth-store';

const defaultFilters: AdminUserFilters = {
  page: 1,
  limit: 20,
  search: '',
  tier: 'ALL',
  status: 'ACTIVE',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export function AdminPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthStore();
  const [filters, setFilters] = useState<AdminUserFilters>(defaultFilters);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [detailUser, setDetailUser] = useState<UserData | null>(null);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{
    user: UserData;
    nextStatus: AdminUserStatus;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
  const [createAnnouncementOpen, setCreateAnnouncementOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const admin = useAdminData(filters);
  const stats = admin.statsQuery.data ?? null;
  const users = admin.usersQuery.data?.users ?? [];
  const pagination = admin.usersQuery.data?.pagination ?? {
    page: filters.page,
    pages: 1,
    total: 0,
    limit: filters.limit,
  };
  const announcements = admin.announcementsQuery.data ?? [];
  const activity = admin.activityQuery.data?.activity ?? [];

  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') {
      navigate({ to: '/dashboard', replace: true });
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-90 items-center justify-center text-sm font-bold text-muted-foreground">
        Memuat admin console...
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return null;
  }

  const openSubscriptionModal = (targetUser: UserData) => {
    admin.updateSubscriptionMutation.reset();
    setSelectedUser(targetUser);
    setSubscriptionOpen(true);
  };

  const openStatusModal = (targetUser: UserData, nextStatus: AdminUserStatus) => {
    admin.updateUserStatusMutation.reset();
    setStatusTarget({ user: targetUser, nextStatus });
  };

  const openSoftDeleteModal = (targetUser: UserData) => {
    admin.softDeleteUserMutation.reset();
    setDeleteTarget(targetUser);
  };

  const closeAnnouncementModals = () => {
    setCreateAnnouncementOpen(false);
    setEditingAnnouncement(null);
  };

  const announcementMutating =
    admin.createAnnouncementMutation.isPending ||
    admin.updateAnnouncementMutation.isPending ||
    admin.deleteAnnouncementMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-375 space-y-8 px-2 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 lg:pb-0">
      <AdminHeader />

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex justify-center lg:justify-start">
          <TabsList className="h-11 rounded-xl border border-border/40 bg-muted/40 p-1">
            <TabsTrigger value="overview" className="rounded-lg px-4 font-bold">
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg px-4 font-bold">
              Users
            </TabsTrigger>
            <TabsTrigger value="announcements" className="rounded-lg px-4 font-bold">
              Announcements
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <SystemStats stats={stats} />
          <AdminActivityPanel
            activity={activity}
            isLoading={admin.activityQuery.isLoading || admin.activityQuery.isFetching}
          />
        </TabsContent>

        <TabsContent value="users">
          <UsersTable
            users={users}
            pagination={pagination}
            isLoading={admin.usersQuery.isLoading || admin.usersQuery.isFetching}
            filters={filters}
            currentUserId={user.id}
            onFiltersChange={setFilters}
            onViewDetails={setDetailUser}
            onEditSubscription={openSubscriptionModal}
            onChangeStatus={openStatusModal}
            onSoftDelete={openSoftDeleteModal}
          />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementsPanel
            announcements={announcements}
            isLoading={admin.announcementsQuery.isLoading || admin.announcementsQuery.isFetching}
            isMutating={announcementMutating}
            onOpenCreate={() => {
              admin.createAnnouncementMutation.reset();
              setCreateAnnouncementOpen(true);
            }}
            onOpenEdit={(announcement) => {
              admin.updateAnnouncementMutation.reset();
              setEditingAnnouncement(announcement);
            }}
            onUpdate={async (id, data) => {
              await admin.updateAnnouncementMutation.mutateAsync({ id, data });
            }}
            onDelete={async (id) => {
              await admin.deleteAnnouncementMutation.mutateAsync(id);
            }}
          />
        </TabsContent>
      </Tabs>

      <EditSubscriptionModal
        isOpen={subscriptionOpen}
        onClose={() => setSubscriptionOpen(false)}
        user={selectedUser}
        isSubmitting={admin.updateSubscriptionMutation.isPending}
        error={mutationMessage(admin.updateSubscriptionMutation.error)}
        onUpdate={async (input) => {
          if (!selectedUser) return;
          await admin.updateSubscriptionMutation.mutateAsync({
            userId: selectedUser.id,
            ...input,
          });
          setSubscriptionOpen(false);
        }}
      />

      <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} />

      <UserStatusModal
        isOpen={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        user={statusTarget?.user ?? null}
        nextStatus={statusTarget?.nextStatus ?? null}
        isSubmitting={admin.updateUserStatusMutation.isPending}
        error={mutationMessage(admin.updateUserStatusMutation.error)}
        onConfirm={async (reason) => {
          if (!statusTarget) return;
          await admin.updateUserStatusMutation.mutateAsync({
            userId: statusTarget.user.id,
            status: statusTarget.nextStatus,
            reason,
          });
          setStatusTarget(null);
        }}
      />

      <SoftDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        user={deleteTarget}
        isSubmitting={admin.softDeleteUserMutation.isPending}
        error={mutationMessage(admin.softDeleteUserMutation.error)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await admin.softDeleteUserMutation.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <CreateAnnouncementModal
        isOpen={createAnnouncementOpen}
        onClose={() => setCreateAnnouncementOpen(false)}
        isSubmitting={admin.createAnnouncementMutation.isPending}
        error={mutationMessage(admin.createAnnouncementMutation.error)}
        onCreate={async (title, content) => {
          await admin.createAnnouncementMutation.mutateAsync({ title, content });
          closeAnnouncementModals();
        }}
      />

      <EditAnnouncementModal
        isOpen={Boolean(editingAnnouncement)}
        onClose={() => setEditingAnnouncement(null)}
        announcement={editingAnnouncement}
        isSubmitting={admin.updateAnnouncementMutation.isPending}
        error={mutationMessage(admin.updateAnnouncementMutation.error)}
        onUpdate={async (id, data) => {
          await admin.updateAnnouncementMutation.mutateAsync({ id, data });
          closeAnnouncementModals();
        }}
      />
    </div>
  );
}

function mutationMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : null;
}
