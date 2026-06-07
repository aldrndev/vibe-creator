import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@/components/ui';
import type { AdminTier, AdminUserStatus, Announcement, UserData } from '@/hooks/useAdminData';

interface EditSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
  isSubmitting: boolean;
  error?: string | null;
  onUpdate: (input: { tier: AdminTier; validDays: number; resetUsage: boolean }) => Promise<void>;
}

export function EditSubscriptionModal({
  isOpen,
  onClose,
  user,
  isSubmitting,
  error,
  onUpdate,
}: EditSubscriptionModalProps) {
  const [tier, setTier] = useState<AdminTier>('FREE');
  const [validDays, setValidDays] = useState('30');
  const [resetUsage, setResetUsage] = useState(false);

  useEffect(() => {
    if (!user || !isOpen) return;
    setTier((user.subscription?.tier ?? 'FREE') as AdminTier);
    setValidDays('30');
    setResetUsage(false);
  }, [user, isOpen]);

  const usageText = `${user?.subscription?.exportsUsed ?? 0}/${user?.subscription?.exportsLimit ?? 5}`;
  const expiryText = user?.subscription?.validUntil
    ? new Date(user.subscription.validUntil).toLocaleString('id-ID')
    : 'Tidak ada expiry';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
        </DialogHeader>
        {user && (
          <div className="space-y-4 py-4">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <p className="font-bold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="mt-2 text-xs font-bold text-muted-foreground">
                Usage {usageText} • Expiry {expiryText}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-bold">Tier</div>
              <Select value={tier} onValueChange={(value) => setTier(value as AdminTier)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="CREATOR">Creator</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tier !== 'FREE' && (
              <Input
                label="Valid days"
                type="number"
                min={1}
                max={365}
                value={validDays}
                onChange={(event) => setValidDays(event.target.value)}
              />
            )}

            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-3">
              <div>
                <p className="text-sm font-bold">Reset usage</p>
                <p className="text-xs font-medium text-muted-foreground">
                  Kosongkan pemakaian export user untuk cycle baru.
                </p>
              </div>
              <Switch checked={resetUsage} onCheckedChange={setResetUsage} />
            </div>

            {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            onClick={() =>
              onUpdate({
                tier,
                validDays: Number.parseInt(validDays || '30', 10),
                resetUsage,
              })
            }
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UserStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
  nextStatus: AdminUserStatus | null;
  isSubmitting: boolean;
  error?: string | null;
  onConfirm: (reason?: string) => Promise<void>;
}

export function UserStatusModal({
  isOpen,
  onClose,
  user,
  nextStatus,
  isSubmitting,
  error,
  onConfirm,
}: UserStatusModalProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  let title = 'Restore User';
  if (nextStatus === 'SUSPENDED') {
    title = 'Suspend User';
  } else if (nextStatus === 'DELETED') {
    title = 'Soft Delete User';
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {user && (
          <div className="space-y-4 py-4">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <p className="font-bold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            {nextStatus !== 'ACTIVE' && (
              <Textarea
                label="Reason"
                placeholder="Catatan internal opsional..."
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
              />
            )}
            {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={() => onConfirm(reason.trim() || undefined)} disabled={isSubmitting}>
            {isSubmitting ? 'Memproses...' : 'Konfirmasi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SoftDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
  isSubmitting: boolean;
  error?: string | null;
  onConfirm: () => Promise<void>;
}

export function SoftDeleteModal({
  isOpen,
  onClose,
  user,
  isSubmitting,
  error,
  onConfirm,
}: SoftDeleteModalProps) {
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    if (isOpen) setConfirmation('');
  }, [isOpen]);

  const canSubmit = Boolean(user) && confirmation === user?.email;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Soft Delete User</DialogTitle>
        </DialogHeader>
        {user && (
          <div className="space-y-4 py-4">
            <p className="text-sm font-medium text-muted-foreground">
              User akan ditandai deleted dan sesi aktifnya dicabut. Data project, export, dan
              payment tetap disimpan.
            </p>
            <Input
              label={`Ketik email: ${user.email}`}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Menghapus...' : 'Soft Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSubmitting: boolean;
  error?: string | null;
  onCreate: (title: string, content: string) => Promise<void>;
}

export function CreateAnnouncementModal({
  isOpen,
  onClose,
  isSubmitting,
  error,
  onCreate,
}: CreateAnnouncementModalProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const handleCreate = async () => {
    await onCreate(newTitle, newContent);
    setNewTitle('');
    setNewContent('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat Pengumuman</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            label="Judul"
            placeholder="Contoh: Fitur Baru"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            maxLength={200}
          />
          <Textarea
            label="Konten"
            placeholder="Isi pengumuman..."
            value={newContent}
            onChange={(event) => setNewContent(event.target.value)}
            maxLength={1000}
          />
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!newTitle.trim() || !newContent.trim() || isSubmitting}
          >
            {isSubmitting ? 'Membuat...' : 'Buat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
  isSubmitting: boolean;
  error?: string | null;
  onUpdate: (id: string, data: Partial<Announcement>) => Promise<void>;
}

export function EditAnnouncementModal({
  announcement,
  isOpen,
  onClose,
  isSubmitting,
  error,
  onUpdate,
}: EditAnnouncementModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!announcement || !isOpen) return;
    setTitle(announcement.title);
    setContent(announcement.content);
    setIsActive(announcement.isActive);
  }, [announcement, isOpen]);

  const handleUpdate = async () => {
    if (!announcement) return;
    await onUpdate(announcement.id, { title, content, isActive });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Pengumuman</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            label="Judul"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
          />
          <Textarea
            label="Konten"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={1000}
          />
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-3">
            <div>
              <p className="text-sm font-bold">Aktif</p>
              <p className="text-xs font-medium text-muted-foreground">
                Tampil di halaman Community.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={!title.trim() || !content.trim() || isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
