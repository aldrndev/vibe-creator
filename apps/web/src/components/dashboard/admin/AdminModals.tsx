import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
  Input,
  Textarea,
} from "@heroui/react";
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
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Edit Subscription</ModalHeader>
        <ModalBody>
          {user && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-foreground/60">{user.email}</p>
              </div>
              <Select
                label="Subscription Tier"
                selectedKeys={selectedTier ? [selectedTier] : []}
                onSelectionChange={(keys) =>
                  onSelectionChange(Array.from(keys)[0] as string)
                }
              >
                <SelectItem key="FREE">Free</SelectItem>
                <SelectItem key="CREATOR">Creator</SelectItem>
                <SelectItem key="PRO">Pro</SelectItem>
              </Select>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" onPress={onUpdate}>
            Update
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
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
    <Modal isOpen={isOpen} onClose={onClose}>
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
          <Button variant="flat" onPress={onClose}>
            Batal
          </Button>
          <Button
            color="primary"
            onPress={handleCreate}
            isDisabled={!newTitle.trim() || !newContent.trim()}
          >
            Buat
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
