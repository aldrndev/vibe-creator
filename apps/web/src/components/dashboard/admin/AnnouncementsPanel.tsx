import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Badge,
  Switch,
} from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";
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
    <Card className="mt-4">
      <CardHeader className="flex flex-row justify-between items-center">
        <h2 className="text-lg font-semibold">Pengumuman</h2>
        <Button size="sm" onClick={onOpenCreate}>
          <Plus size={16} />
          Buat Pengumuman
        </Button>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Belum ada pengumuman
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id} className="bg-muted/50">
                <CardBody className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{a.title}</h3>
                        <Badge variant={a.isActive ? "default" : "secondary"}>
                          {a.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {a.content}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        {new Date(a.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={a.isActive}
                        onCheckedChange={(checked: boolean) =>
                          onUpdate(a.id, { isActive: checked })
                        }
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(a.id)}
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
  );
}
