import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Switch,
} from "@heroui/react";
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
        <Button
          color="primary"
          size="sm"
          startContent={<Plus size={16} />}
          onPress={onOpenCreate}
        >
          Buat Pengumuman
        </Button>
      </CardHeader>
      <CardBody>
        {isLoading ? (
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
                          color={a.isActive ? "success" : "default"}
                          variant="flat"
                        >
                          {a.isActive ? "Aktif" : "Nonaktif"}
                        </Chip>
                      </div>
                      <p className="text-sm text-foreground/60">{a.content}</p>
                      <p className="text-xs text-foreground/40 mt-2">
                        {new Date(a.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        size="sm"
                        isSelected={a.isActive}
                        onValueChange={(value) =>
                          onUpdate(a.id, { isActive: value })
                        }
                      />
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        color="danger"
                        onPress={() => onDelete(a.id)}
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
