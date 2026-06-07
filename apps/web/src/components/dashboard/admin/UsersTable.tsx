import {
  ArrowDown,
  ArrowUp,
  Edit,
  MoreHorizontal,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserRoundSearch,
  Users,
  UserX,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import type {
  AdminSortBy,
  AdminUserFilters,
  AdminUserStatus,
  UserData,
} from '@/hooks/useAdminData';
import { cn } from '@/lib/utils';

interface UsersTableProps {
  users: UserData[];
  pagination: { page: number; pages: number; total: number; limit: number };
  isLoading: boolean;
  filters: AdminUserFilters;
  currentUserId?: string;
  onFiltersChange: (filters: AdminUserFilters) => void;
  onViewDetails: (user: UserData) => void;
  onEditSubscription: (user: UserData) => void;
  onChangeStatus: (user: UserData, status: AdminUserStatus) => void;
  onSoftDelete: (user: UserData) => void;
}

const tierOptions = ['ALL', 'FREE', 'CREATOR', 'PRO'] as const;
const statusOptions = ['ACTIVE', 'SUSPENDED', 'DELETED', 'ALL'] as const;

function statusBadgeClass(status: AdminUserStatus): string {
  if (status === 'ACTIVE') return 'bg-green-500/10 text-green-500 border-0';
  if (status === 'SUSPENDED') return 'bg-yellow-500/10 text-yellow-500 border-0';
  return 'bg-muted text-muted-foreground border-0';
}

function tierBadgeClass(tier?: string): string {
  if (tier === 'PRO') return 'bg-purple-500/10 text-purple-400 border-0';
  if (tier === 'CREATOR') return 'bg-primary/10 text-primary border-0';
  return 'bg-muted text-muted-foreground border-0';
}

export function UsersTable({
  users,
  pagination,
  isLoading,
  filters,
  currentUserId,
  onFiltersChange,
  onViewDetails,
  onEditSubscription,
  onChangeStatus,
  onSoftDelete,
}: UsersTableProps) {
  const updateFilters = (patch: Partial<AdminUserFilters>) => {
    onFiltersChange({ ...filters, page: patch.page ?? 1, ...patch });
  };

  const handleSort = (sortBy: AdminSortBy) => {
    const nextOrder = filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    updateFilters({ sortBy, sortOrder: nextOrder });
  };

  return (
    <Card className="bg-card/70 border border-border/40 shadow-none rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border/40 flex flex-col gap-4 bg-muted/5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Users</h2>
              <p className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-widest mt-0.5">
                {pagination.total} akun ditemukan
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
            <div className="relative flex-1 sm:min-w-[220px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Cari nama atau email..."
                value={filters.search}
                onChange={(event) => updateFilters({ search: event.target.value })}
                className="pl-9 h-9 bg-background/50 border-border/50 rounded-lg text-sm"
              />
            </div>
            <select
              value={filters.tier}
              onChange={(event) =>
                updateFilters({ tier: event.target.value as AdminUserFilters['tier'] })
              }
              className="h-9 rounded-lg bg-background/50 border border-border/50 text-[11px] font-bold px-3"
            >
              {tierOptions.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) =>
                updateFilters({ status: event.target.value as AdminUserFilters['status'] })
              }
              className="h-9 rounded-lg bg-background/50 border border-border/50 text-[11px] font-bold px-3"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <CardBody className="p-0">
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/40">
                <SortableHead
                  label="User"
                  active={filters.sortBy === 'name'}
                  order={filters.sortOrder}
                  onClick={() => handleSort('name')}
                  className="pl-6 min-w-[240px]"
                />
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground min-w-[130px]">
                  Status
                </TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground min-w-[130px]">
                  Subscription
                </TableHead>
                <SortableHead
                  label="Exports"
                  active={filters.sortBy === 'exportsUsed'}
                  order={filters.sortOrder}
                  onClick={() => handleSort('exportsUsed')}
                  className="text-center min-w-[110px]"
                />
                <SortableHead
                  label="Joined"
                  active={filters.sortBy === 'createdAt'}
                  order={filters.sortOrder}
                  onClick={() => handleSort('createdAt')}
                  className="min-w-[130px]"
                />
                <TableHead className="text-right pr-6 min-w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderRows({
                users,
                isLoading,
                currentUserId,
                onViewDetails,
                onEditSubscription,
                onChangeStatus,
                onSoftDelete,
              })}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden divide-y divide-border/40">
          {(() => {
            if (isLoading) {
              return (
                <div className="p-6 text-center text-xs font-bold text-muted-foreground">
                  Memuat user...
                </div>
              );
            }
            if (users.length === 0) {
              return (
                <div className="p-6 text-center text-xs font-bold text-muted-foreground">
                  Tidak ada user.
                </div>
              );
            }
            return users.map((user) => (
              <UserMobileCard
                key={user.id}
                user={user}
                isSelf={user.id === currentUserId}
                onViewDetails={onViewDetails}
                onEditSubscription={onEditSubscription}
                onChangeStatus={onChangeStatus}
                onSoftDelete={onSoftDelete}
              />
            ));
          })()}
        </div>

        <div className="border-t border-border/40 p-4">
          <Pagination
            page={pagination.page}
            total={pagination.pages}
            onChange={(page) => updateFilters({ page })}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function SortableHead({
  label,
  active,
  order,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  order: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
}) {
  return (
    <TableHead
      className={cn(
        'font-bold text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground',
        className,
      )}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </span>
    </TableHead>
  );
}

function renderRows(props: {
  users: UserData[];
  isLoading: boolean;
  currentUserId?: string;
  onViewDetails: (user: UserData) => void;
  onEditSubscription: (user: UserData) => void;
  onChangeStatus: (user: UserData, status: AdminUserStatus) => void;
  onSoftDelete: (user: UserData) => void;
}) {
  if (props.isLoading) {
    return (
      <TableRow>
        <TableCell
          colSpan={6}
          className="text-center py-12 text-muted-foreground text-xs font-bold"
        >
          Memuat user...
        </TableCell>
      </TableRow>
    );
  }

  if (props.users.length === 0) {
    return (
      <TableRow>
        <TableCell
          colSpan={6}
          className="text-center py-12 text-muted-foreground text-xs font-bold"
        >
          Tidak ada user.
        </TableCell>
      </TableRow>
    );
  }

  return props.users.map((user) => (
    <TableRow key={user.id} className="border-border/40 hover:bg-muted/30">
      <TableCell className="pl-6 py-4">
        <UserIdentity user={user} />
      </TableCell>
      <TableCell>
        <Badge className={cn('text-[9px] font-black uppercase', statusBadgeClass(user.status))}>
          {user.status}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          className={cn('text-[9px] font-black uppercase', tierBadgeClass(user.subscription?.tier))}
        >
          {user.subscription?.tier ?? 'FREE'}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <span className="text-xs font-black">
          {user.subscription?.exportsUsed ?? 0}/{user.subscription?.exportsLimit ?? 5}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
          {formatDate(user.createdAt)}
        </span>
      </TableCell>
      <TableCell className="text-right pr-6">
        <UserActions
          user={user}
          isSelf={user.id === props.currentUserId}
          onViewDetails={props.onViewDetails}
          onEditSubscription={props.onEditSubscription}
          onChangeStatus={props.onChangeStatus}
          onSoftDelete={props.onSoftDelete}
        />
      </TableCell>
    </TableRow>
  ));
}

function UserIdentity({ user }: { user: UserData }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar
        src={user.avatarUrl ?? undefined}
        name={user.name}
        className="w-9 h-9 border border-border/50 rounded-lg"
      />
      <div className="min-w-0">
        <p className="font-bold text-sm text-foreground flex items-center gap-1.5 truncate">
          {user.name}
          {user.role === 'ADMIN' && <Shield size={12} className="text-primary" />}
        </p>
        <p className="text-[11px] text-muted-foreground font-medium truncate">{user.email}</p>
      </div>
    </div>
  );
}

function UserMobileCard({
  user,
  isSelf,
  onViewDetails,
  onEditSubscription,
  onChangeStatus,
  onSoftDelete,
}: {
  user: UserData;
  isSelf: boolean;
  onViewDetails: (user: UserData) => void;
  onEditSubscription: (user: UserData) => void;
  onChangeStatus: (user: UserData, status: AdminUserStatus) => void;
  onSoftDelete: (user: UserData) => void;
}) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <UserIdentity user={user} />
        <UserActions
          user={user}
          isSelf={isSelf}
          onViewDetails={onViewDetails}
          onEditSubscription={onEditSubscription}
          onChangeStatus={onChangeStatus}
          onSoftDelete={onSoftDelete}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge className={cn('text-[9px] font-black uppercase', statusBadgeClass(user.status))}>
          {user.status}
        </Badge>
        <Badge
          className={cn('text-[9px] font-black uppercase', tierBadgeClass(user.subscription?.tier))}
        >
          {user.subscription?.tier ?? 'FREE'}
        </Badge>
        <Badge variant="outline" className="text-[9px] font-black uppercase">
          {user.subscription?.exportsUsed ?? 0}/{user.subscription?.exportsLimit ?? 5} exports
        </Badge>
      </div>
    </div>
  );
}

function UserActions({
  user,
  isSelf,
  onViewDetails,
  onEditSubscription,
  onChangeStatus,
  onSoftDelete,
}: {
  user: UserData;
  isSelf: boolean;
  onViewDetails: (user: UserData) => void;
  onEditSubscription: (user: UserData) => void;
  onChangeStatus: (user: UserData, status: AdminUserStatus) => void;
  onSoftDelete: (user: UserData) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg">
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewDetails(user)}>
          <UserRoundSearch size={14} /> Detail
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onEditSubscription(user)}>
          <Edit size={14} /> Edit Subscription
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.status === 'ACTIVE' ? (
          <DropdownMenuItem disabled={isSelf} onClick={() => onChangeStatus(user, 'SUSPENDED')}>
            <UserX size={14} /> Suspend
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled={isSelf} onClick={() => onChangeStatus(user, 'ACTIVE')}>
            <RotateCcw size={14} /> Restore Active
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={isSelf || user.status === 'DELETED'}
          className="text-destructive focus:text-destructive"
          onClick={() => onSoftDelete(user)}
        >
          <Trash2 size={14} /> Soft Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}
