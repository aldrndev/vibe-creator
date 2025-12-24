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
  Tabs,
  Tab,
  Textarea,
  Switch,
} from '@heroui/react';
import { Users, DollarSign, FileVideo, TrendingUp, Search, Shield, Edit, Trash2, Megaphone, Plus } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { authFetch } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

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

interface Announcement {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
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
  
  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  // TODO: Implement announcement editing
  const [_editingAnnouncement, _setEditingAnnouncement] = useState<Announcement | null>(null);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isAnnouncementOpen, 
    onOpen: onAnnouncementOpen, 
    onClose: onAnnouncementClose 
  } = useDisclosure();

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
        const res = await authFetch('/api/v1/admin/stats');
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
        const res = await authFetch(url);
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

  // Fetch announcements
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setAnnouncementsLoading(true);
    try {
      const res = await authFetch('/api/v1/admin/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!selectedUser || !selectedTier) return;
    
    try {
      const res = await authFetch(`/api/v1/admin/users/${selectedUser.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier }),
      });
      
      if (res.ok) {
        const usersRes = await authFetch('/api/v1/admin/users');
        const data = await usersRes.json();
        setUsers(data.data.users);
        onClose();
        toast.success('Subscription updated');
      }
    } catch (err) {
      console.error('Failed to update subscription:', err);
      toast.error('Failed to update subscription');
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    
    try {
      const res = await authFetch('/api/v1/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      });
      
      if (res.ok) {
        toast.success('Pengumuman berhasil dibuat');
        setNewTitle('');
        setNewContent('');
        onAnnouncementClose();
        fetchAnnouncements();
      }
    } catch (err) {
      console.error('Failed to create announcement:', err);
      toast.error('Gagal membuat pengumuman');
    }
  };

  const handleUpdateAnnouncement = async (id: string, data: Partial<Announcement>) => {
    try {
      const res = await authFetch(`/api/v1/admin/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (res.ok) {
        toast.success('Pengumuman berhasil diupdate');
        fetchAnnouncements();
      }
    } catch (err) {
      console.error('Failed to update announcement:', err);
      toast.error('Gagal mengupdate pengumuman');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pengumuman ini?')) return;
    
    try {
      const res = await authFetch(`/api/v1/admin/announcements/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast.success('Pengumuman berhasil dihapus');
        fetchAnnouncements();
      }
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      toast.error('Gagal menghapus pengumuman');
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

      {/* Tabs for Users and Announcements */}
      <Tabs aria-label="Admin sections" color="primary" variant="underlined">
        <Tab key="users" title={<div className="flex items-center gap-2"><Users size={16} /> Users</div>}>
          <Card className="mt-4">
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
        </Tab>

        <Tab key="announcements" title={<div className="flex items-center gap-2"><Megaphone size={16} /> Pengumuman</div>}>
          <Card className="mt-4">
            <CardHeader className="flex flex-row justify-between items-center">
              <h2 className="text-lg font-semibold">Pengumuman</h2>
              <Button 
                color="primary" 
                size="sm"
                startContent={<Plus size={16} />}
                onPress={onAnnouncementOpen}
              >
                Buat Pengumuman
              </Button>
            </CardHeader>
            <CardBody>
              {announcementsLoading ? (
                <div className="text-center py-8 text-foreground/60">Loading...</div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-8 text-foreground/60">
                  Belum ada pengumuman
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <Card key={a.id} className="bg-content2">
                      <CardBody className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{a.title}</h3>
                              <Chip 
                                size="sm" 
                                color={a.isActive ? 'success' : 'default'}
                                variant="flat"
                              >
                                {a.isActive ? 'Aktif' : 'Nonaktif'}
                              </Chip>
                            </div>
                            <p className="text-sm text-foreground/60">{a.content}</p>
                            <p className="text-xs text-foreground/40 mt-2">
                              {new Date(a.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch 
                              size="sm"
                              isSelected={a.isActive}
                              onValueChange={(value) => handleUpdateAnnouncement(a.id, { isActive: value })}
                            />
                            <Button 
                              isIconOnly 
                              size="sm" 
                              variant="flat"
                              color="danger"
                              onPress={() => handleDeleteAnnouncement(a.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Tab>
      </Tabs>

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

      {/* Create Announcement Modal */}
      <Modal isOpen={isAnnouncementOpen} onClose={onAnnouncementClose}>
        <ModalContent>
          <ModalHeader>Buat Pengumuman</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Judul"
                placeholder="Contoh: 🎉 Fitur Baru!"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={200}
              />
              <Textarea
                label="Konten"
                placeholder="Isi pengumuman..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                maxLength={1000}
                minRows={3}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onAnnouncementClose}>Batal</Button>
            <Button 
              color="primary" 
              onPress={handleCreateAnnouncement}
              isDisabled={!newTitle.trim() || !newContent.trim()}
            >
              Buat
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
