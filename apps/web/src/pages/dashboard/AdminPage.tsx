import { useState, useEffect } from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Chip,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@heroui/react';
import { Users, DollarSign, FileVideo, TrendingUp, Search, Shield, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigate } from 'react-router-dom';

interface AdminStats {
  users: {
    total: number;
    recent: number;
    byTier: { free: number; creator: number; pro: number };
  };
  projects: number;
  exports: { total: number; recent: number };
  revenue: { total: number; payments: number };
}

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  subscription: {
    tier: string;
    status: string;
    exportsUsed: number;
    exportsLimit: number;
  } | null;
  _count: { projects: number; exports: number };
}

export function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('');
  
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Check admin role
  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/v1/admin/stats', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setStats(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, []);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const url = searchQuery 
          ? `/api/v1/admin/users?search=${encodeURIComponent(searchQuery)}`
          : '/api/v1/admin/users';
        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.data.users);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleUpdateSubscription = async () => {
    if (!selectedUser || !selectedTier) return;
    
    try {
      const res = await fetch(`/api/v1/admin/users/${selectedUser.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier }),
        credentials: 'include',
      });
      
      if (res.ok) {
        // Refresh users
        const usersRes = await fetch('/api/v1/admin/users', { credentials: 'include' });
        const data = await usersRes.json();
        setUsers(data.data.users);
        onClose();
      }
    } catch (err) {
      console.error('Failed to update subscription:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield size={24} />
        Admin Dashboard
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20 text-primary">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-foreground/60">Total Users</p>
              <p className="text-2xl font-bold">{stats?.users.total || 0}</p>
              <p className="text-xs text-success">+{stats?.users.recent || 0} this week</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-xl bg-success/20 text-success">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-foreground/60">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(stats?.revenue.total || 0)}</p>
              <p className="text-xs text-foreground/60">{stats?.revenue.payments || 0} payments</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/20 text-warning">
              <FileVideo size={24} />
            </div>
            <div>
              <p className="text-sm text-foreground/60">Total Exports</p>
              <p className="text-2xl font-bold">{stats?.exports.total || 0}</p>
              <p className="text-xs text-foreground/60">{stats?.exports.recent || 0} today</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-xl bg-secondary/20 text-secondary">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-foreground/60">By Tier</p>
              <div className="flex gap-2 mt-1">
                <Chip size="sm" color="default">{stats?.users.byTier.free || 0} Free</Chip>
                <Chip size="sm" color="primary">{stats?.users.byTier.creator || 0} Creator</Chip>
                <Chip size="sm" color="warning">{stats?.users.byTier.pro || 0} Pro</Chip>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <h2 className="text-lg font-semibold">Users</h2>
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Search size={16} />}
            className="max-w-xs"
            size="sm"
          />
        </CardHeader>
        <CardBody>
          <Table aria-label="Users table">
            <TableHeader>
              <TableColumn>USER</TableColumn>
              <TableColumn>TIER</TableColumn>
              <TableColumn>EXPORTS</TableColumn>
              <TableColumn>JOINED</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody isLoading={isLoading}>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-foreground/60">{u.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      size="sm"
                      color={
                        u.subscription?.tier === 'PRO' ? 'warning' :
                        u.subscription?.tier === 'CREATOR' ? 'primary' : 'default'
                      }
                    >
                      {u.subscription?.tier || 'FREE'}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    {u.subscription?.exportsUsed || 0} / {u.subscription?.exportsLimit || 5}
                  </TableCell>
                  <TableCell>
                    {new Date(u.createdAt).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        isIconOnly 
                        size="sm" 
                        variant="flat"
                        onPress={() => {
                          setSelectedUser(u);
                          setSelectedTier(u.subscription?.tier || 'FREE');
                          onOpen();
                        }}
                      >
                        <Edit size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Edit Subscription Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Edit Subscription</ModalHeader>
          <ModalBody>
            {selectedUser && (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-sm text-foreground/60">{selectedUser.email}</p>
                </div>
                <Select
                  label="Subscription Tier"
                  selectedKeys={[selectedTier]}
                  onSelectionChange={(keys) => setSelectedTier(Array.from(keys)[0] as string)}
                >
                  <SelectItem key="FREE">Free</SelectItem>
                  <SelectItem key="CREATOR">Creator</SelectItem>
                  <SelectItem key="PRO">Pro</SelectItem>
                </Select>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>Cancel</Button>
            <Button color="primary" onPress={handleUpdateSubscription}>
              Update
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
