import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  Textarea,
} from "@/components/ui";
import { UserData } from "@/hooks/useAdminData";
import { useState } from "react";

interface EditSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
  selectedTier: string;
  onSelectionChange: (tier: string) => void;
  onUpdate: () => void;
}

export function EditSubscriptionModal({
  isOpen,
  onClose,
  user,
  selectedTier,
  onSelectionChange,
  onUpdate,
}: EditSubscriptionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {user && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Subscription Tier</label>
                <Select value={selectedTier} onValueChange={onSelectionChange}>
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
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onUpdate}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, content: string) => void;
}

export function CreateAnnouncementModal({
  isOpen,
  onClose,
  onCreate,
}: CreateAnnouncementModalProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const handleCreate = () => {
    onCreate(newTitle, newContent);
    setNewTitle("");
    setNewContent("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat Pengumuman</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            label="Judul"
            placeholder="Contoh: 🎉 Fitur Baru!"
            value={newTitle}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewTitle(e.target.value)
            }
            maxLength={200}
          />
          <Textarea
            label="Konten"
            placeholder="Isi pengumuman..."
            value={newContent}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNewContent(e.target.value)
            }
            maxLength={1000}
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!newTitle.trim() || !newContent.trim()}
          >
            Buat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
