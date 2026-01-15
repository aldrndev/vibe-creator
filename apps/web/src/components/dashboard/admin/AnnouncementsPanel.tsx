import { Card, CardBody, Button, Badge, Switch } from "@/components/ui";
import { Plus, Trash2, Megaphone } from "lucide-react";
import { Announcement } from "@/hooks/useAdminData";

interface AnnouncementsPanelProps {
  announcements: Announcement[];
  isLoading: boolean;
  onOpenCreate: () => void;
  onUpdate: (id: string, data: Partial<Announcement>) => void;
  onDelete: (id: string) => void;
}

export function AnnouncementsPanel({
  announcements,
  isLoading,
  onOpenCreate,
  onUpdate,
  onDelete,
}: AnnouncementsPanelProps) {
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
              {announcements.length} Active
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
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-[11px] font-bold tracking-widest animate-pulse">
            LOADING ANNOUNCEMENTS...
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-[11px] font-bold uppercase tracking-widest">
            NO ANNOUNCEMENTS CREATED YET
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="p-5 flex items-start justify-between gap-6 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="font-bold text-sm tracking-tight">
                      {a.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className={
                        a.isActive
                          ? "bg-green-500/10 text-green-600 border-none text-[9px] font-black h-4.5 px-1.5"
                          : "bg-muted text-muted-foreground border-none text-[9px] font-black h-4.5 px-1.5"
                      }
                    >
                      {a.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {a.content}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      {new Date(a.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Visibility
                    </span>
                    <Switch
                      checked={a.isActive}
                      onCheckedChange={(checked: boolean) =>
                        onUpdate(a.id, { isActive: checked })
                      }
                      className="scale-90"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-colors"
                    onClick={() => onDelete(a.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
