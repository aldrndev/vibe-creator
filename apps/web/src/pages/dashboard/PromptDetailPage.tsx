import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Button, 
  Card, 
  CardBody,
  Chip,
  Tabs,
  Tab,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  useDisclosure,
} from '@heroui/react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Clock, 
  MoreVertical,
  Edit,
  Trash,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePrompt, useUpdatePrompt, useDeletePrompt, useRegeneratePrompt } from '@/hooks/use-prompts';

const promptTypeLabels: Record<string, string> = {
  SCRIPT: 'Script / Ide',
  VOICE: 'Voice / TTS',
  VIDEO_GEN: 'Video Generation',
  IMAGE: 'Image / Thumbnail',
  RELAXING: 'Relaxing / Ambient',
  CREATIVE_SCAN: 'Creative Scan',
};

export function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: prompt, isLoading, error } = usePrompt(id!);
  const updatePrompt = useUpdatePrompt(id!);
  const deletePrompt = useDeletePrompt();
  const regeneratePrompt = useRegeneratePrompt(id!);
  
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  
  const editModal = useDisclosure();
  const deleteModal = useDisclosure();

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Prompt disalin ke clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = async () => {
    try {
      await updatePrompt.mutateAsync({ title: newTitle });
      toast.success('Judul berhasil diubah');
      editModal.onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah judul');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePrompt.mutateAsync(id!);
      toast.success('Prompt berhasil dihapus');
      navigate('/dashboard/prompts');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus prompt');
    }
  };

  const handleRegenerate = async () => {
    try {
      const result = await regeneratePrompt.mutateAsync();
      toast.success(`Prompt di-regenerate (versi ${result.version})`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal regenerate prompt');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground/60">Prompt tidak ditemukan</p>
        <Button 
          variant="light" 
          onPress={() => navigate('/dashboard/prompts')}
          className="mt-4"
        >
          Kembali ke Prompt
        </Button>
      </div>
    );
  }

  const currentVersion = selectedVersion 
    ? prompt.versions.find((v) => v.id === selectedVersion)
    : prompt.versions[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            isIconOnly
            variant="light"
            onPress={() => navigate('/dashboard/prompts')}
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{prompt.title}</h1>
              <Chip size="sm" variant="flat" color="primary">
                {promptTypeLabels[prompt.type] || prompt.type}
              </Chip>
            </div>
            <p className="text-foreground/60 text-sm">
              {prompt.versions.length} versi • Dibuat {new Date(prompt.createdAt).toLocaleDateString('id-ID')}
            </p>
          </div>
        </div>

        <Dropdown>
          <DropdownTrigger>
            <Button isIconOnly variant="light">
              <MoreVertical size={20} />
            </Button>
          </DropdownTrigger>
          <DropdownMenu>
            <DropdownItem
              key="edit"
              startContent={<Edit size={16} />}
              onPress={() => {
                setNewTitle(prompt.title);
                editModal.onOpen();
              }}
            >
              Edit Judul
            </DropdownItem>
            <DropdownItem
              key="regenerate"
              startContent={<RefreshCw size={16} />}
              onPress={handleRegenerate}
            >
              Regenerate
            </DropdownItem>
            <DropdownItem
              key="delete"
              startContent={<Trash size={16} />}
              className="text-danger"
              color="danger"
              onPress={deleteModal.onOpen}
            >
              Hapus
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left - Version List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card>
            <CardBody className="p-4">
              <h3 className="font-medium mb-4">Riwayat Versi</h3>
              <div className="space-y-2">
                {prompt.versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => setSelectedVersion(version.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      (selectedVersion === version.id || (!selectedVersion && version.id === prompt.versions[0]?.id))
                        ? 'border-primary bg-primary/10'
                        : 'border-divider hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Versi {version.version}</span>
                      {version.id === prompt.currentVersionId && (
                        <Chip size="sm" color="success" variant="flat">Aktif</Chip>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-foreground/60 mt-1">
                      <Clock size={12} />
                      {new Date(version.createdAt).toLocaleString('id-ID')}
                    </div>
                    {version.userNotes && (
                      <p className="text-xs text-foreground/60 mt-2 line-clamp-2">
                        {version.userNotes}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Right - Prompt Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <Card className="h-full">
            <CardBody className="p-0 flex flex-col">
              <Tabs 
                aria-label="Prompt tabs"
                classNames={{
                  tabList: "px-4 pt-4",
                }}
              >
                <Tab key="prompt" title="Generated Prompt">
                  <div className="p-4">
                    <div className="flex justify-end mb-4">
                      <Button
                        size="sm"
                        variant="flat"
                        startContent={copied ? <Check size={16} /> : <Copy size={16} />}
                        onPress={() => handleCopy(currentVersion?.generatedPrompt || '')}
                      >
                        {copied ? 'Disalin!' : 'Salin'}
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm font-mono text-foreground/80 bg-content2 p-4 rounded-lg max-h-[60vh] overflow-auto">
                      {currentVersion?.generatedPrompt || 'Tidak ada prompt'}
                    </pre>
                  </div>
                </Tab>
                <Tab key="input" title="Input Data">
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono text-foreground/80 bg-content2 p-4 rounded-lg max-h-[60vh] overflow-auto">
                      {JSON.stringify(currentVersion?.inputData || {}, null, 2)}
                    </pre>
                  </div>
                </Tab>
              </Tabs>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={editModal.isOpen} onClose={editModal.onClose}>
        <ModalContent>
          <ModalHeader>Edit Judul</ModalHeader>
          <ModalBody>
            <Input
              label="Judul"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={editModal.onClose}>
              Batal
            </Button>
            <Button 
              color="primary" 
              onPress={handleEdit}
              isLoading={updatePrompt.isPending}
            >
              Simpan
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.onClose}>
        <ModalContent>
          <ModalHeader>Hapus Prompt</ModalHeader>
          <ModalBody>
            <p>Apakah kamu yakin ingin menghapus prompt ini? Tindakan ini tidak dapat dibatalkan.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={deleteModal.onClose}>
              Batal
            </Button>
            <Button 
              color="danger" 
              onPress={handleDelete}
              isLoading={deletePrompt.isPending}
            >
              Hapus
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
