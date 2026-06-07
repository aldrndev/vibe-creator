import { Check, Edit3, Megaphone, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, CardBody, Switch } from '@/components/ui';
import type { Announcement } from '@/hooks/useAdminData';

interface AnnouncementsPanelProps {
  announcements: Announcement[];
  isLoading: boolean;
  isMutating: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (announcement: Announcement) => void;
  onUpdate: (id: string, data: Partial<Announcement>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function AnnouncementsPanel({
  announcements,
  isLoading,
  isMutating,
  onOpenCreate,
  onOpenEdit,
  onUpdate,
  onDelete,
}: AnnouncementsPanelProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const activeCount = useMemo(
    () => announcements.filter((announcement) => announcement.isActive).length,
    [announcements],
  );

  return (
    <Card className="bg-card/70 border border-border/40 shadow-none rounded-xl overflow-hidden h-full">
      <div className="p-5 border-b border-border/40 flex justify-between gap-x-4 items-center bg-muted/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Megaphone size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Announcements</h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 block">
              {activeCount} Active
            </span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={onOpenCreate}
          className="h-8 px-3 rounded-lg font-bold text-[10px] uppercase tracking-widest"
        >
          <Plus size={14} />
          Create
        </Button>
      </div>
      <CardBody className="p-0">
        {(() => {
          if (isLoading) {
            return (
              <div className="text-center py-12 text-muted-foreground text-[11px] font-bold tracking-widest animate-pulse">
                LOADING ANNOUNCEMENTS...
              </div>
            );
          }
          if (announcements.length === 0) {
            return (
              <div className="text-center py-12 text-muted-foreground text-[11px] font-bold uppercase tracking-widest">
                NO ANNOUNCEMENTS CREATED YET
              </div>
            );
          }
          return (
            <div className="divide-y divide-border/40">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="p-5 flex items-start justify-between gap-6 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="font-bold text-sm tracking-tight">{a.title}</h3>
                      <Badge
                        variant="outline"
                        className={
                          a.isActive
                            ? 'bg-green-500/10 text-green-600 border-none text-[9px] font-black h-4.5 px-1.5'
                            : 'bg-muted text-muted-foreground border-none text-[9px] font-black h-4.5 px-1.5'
                        }
                      >
                        {a.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {a.content}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                        {new Date(a.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Visibility
                      </span>
                      <Switch
                        checked={a.isActive}
                        disabled={isMutating}
                        onCheckedChange={(checked: boolean) =>
                          onUpdate(a.id, { isActive: checked })
                        }
                        className="scale-90"
                      />
                    </div>
                    {pendingDeleteId === a.id ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg px-2 text-muted-foreground"
                          onClick={() => setPendingDeleteId(null)}
                        >
                          <X size={14} />
                          Batal
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 rounded-lg px-2 text-[10px] font-black uppercase tracking-widest"
                          disabled={isMutating}
                          onClick={async () => {
                            await onDelete(a.id);
                            setPendingDeleteId(null);
                          }}
                        >
                          <Check size={14} />
                          Hapus
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/5 hover:text-primary"
                          onClick={() => onOpenEdit(a)}
                          aria-label="Edit announcement"
                        >
                          <Edit3 size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg text-destructive/70 transition-colors hover:bg-destructive/5 hover:text-destructive"
                          onClick={() => setPendingDeleteId(a.id)}
                          aria-label="Delete announcement"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </CardBody>
    </Card>
  );
}
