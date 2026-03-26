import { ChevronDown, ChevronUp, Edit, Filter, Search, Shield, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import type { UserData } from '@/hooks/useAdminData';
import { cn } from '@/lib/utils';

interface UsersTableProps {
  users: UserData[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onEditUser: (user: UserData) => void;
}

type SortField = 'name' | 'exports' | 'date';
type SortOrder = 'asc' | 'desc';

export function UsersTable({
  users,
  isLoading,
  searchQuery,
  setSearchQuery,
  onEditUser,
}: UsersTableProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterTier, setFilterTier] = useState<string>('ALL');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredUsers = useMemo(() => {
    if (filterTier === 'ALL') return users;
    return users.filter((u) => (u.subscription?.tier || 'FREE') === filterTier);
  }, [users, filterTier]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'exports') {
        comparison = (a.subscription?.exportsUsed || 0) - (b.subscription?.exportsUsed || 0);
      } else if (sortField === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredUsers, sortField, sortOrder]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp size={12} className="ml-1" />
    ) : (
      <ChevronDown size={12} className="ml-1" />
    );
  };

  return (
    <Card className="bg-card/70 border border-border/40 shadow-none rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border/40 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-muted/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Users size={18} /> {/* This will likely need Users imported if not already */}
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">User Management</h2>
            <p className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-widest mt-0.5">
              {sortedUsers.length} Users Found
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
          <div className="relative flex-1 sm:min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background/50 border-border/50 focus:bg-background transition-all rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="h-9 rounded-lg bg-background/50 border border-border/50 text-[11px] font-bold px-3 py-1 outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
            >
              <option value="ALL">ALL TIERS</option>
              <option value="FREE">FREE</option>
              <option value="CREATOR">CREATOR</option>
              <option value="PRO">PRO</option>
            </select>
          </div>
        </div>
      </div>
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead
                  className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground pl-6 cursor-pointer hover:text-foreground transition-colors min-w-[200px]"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    USER PROFILE <SortIcon field="name" />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground min-w-[120px]">
                  SUBSCRIPTION
                </TableHead>
                <TableHead
                  className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center cursor-pointer hover:text-foreground transition-colors min-w-[100px]"
                  onClick={() => handleSort('exports')}
                >
                  <div className="flex items-center justify-center">
                    EXPORTS <SortIcon field="exports" />
                  </div>
                </TableHead>
                <TableHead
                  className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors min-w-[120px]"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    JOINED <SortIcon field="date" />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-right pr-6 min-w-[80px]">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-muted-foreground animate-pulse text-[11px] font-bold tracking-widest"
                  >
                    LOADING USER DATA...
                  </TableCell>
                </TableRow>
              ) : sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-muted-foreground text-[11px] font-bold"
                  >
                    NO USERS MATCHING YOUR CRITERIA
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((u) => (
                  <TableRow
                    key={u.id}
                    className="border-border/40 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={u.avatarUrl || undefined}
                          name={u.name}
                          className="w-8 h-8 border border-border/50 rounded-lg"
                        />
                        <div className="space-y-0.5">
                          <p className="font-bold text-sm text-foreground flex items-center gap-1.5 whitespace-nowrap">
                            {u.name}
                            {u.role === 'ADMIN' && (
                              <Shield size={12} className="text-primary fill-primary/20" />
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-medium">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-5 px-2 rounded text-[9px] font-black uppercase tracking-tighter border-0 whitespace-nowrap',
                          u.subscription?.tier === 'PRO'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : u.subscription?.tier === 'CREATOR'
                              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {u.subscription?.tier || 'FREE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-[11px] font-black">
                          {u.subscription?.exportsUsed || 0}
                        </span>
                        <div className="w-12 h-1 bg-muted rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${Math.min(
                                ((u.subscription?.exportsUsed || 0) /
                                  (u.subscription?.exportsLimit || 5)) *
                                  100,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => onEditUser(u)}
                      >
                        <Edit size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardBody>
    </Card>
  );
}
