import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import type { UserData } from '@/hooks/useAdminData';

interface UserDetailModalProps {
  user: UserData | null;
  onClose: () => void;
}

export function UserDetailModal({ user, onClose }: UserDetailModalProps) {
  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Detail</DialogTitle>
        </DialogHeader>
        {user && (
          <div className="space-y-4 py-4">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-lg font-black">{user.name}</p>
              <p className="text-sm font-medium text-muted-foreground">{user.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Role" value={user.role} />
              <DetailItem label="Status" value={user.status} />
              <DetailItem label="Tier" value={user.subscription?.tier ?? 'FREE'} />
              <DetailItem
                label="Exports"
                value={`${user.subscription?.exportsUsed ?? 0}/${user.subscription?.exportsLimit ?? 5}`}
              />
              <DetailItem label="Projects" value={String(user._count.projects)} />
              <DetailItem label="Exports Created" value={String(user._count.exports)} />
            </div>

            {user.suspensionReason && (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Suspension reason
                </p>
                <p className="mt-2 text-sm font-medium">{user.suspensionReason}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold">{value}</p>
    </div>
  );
}
