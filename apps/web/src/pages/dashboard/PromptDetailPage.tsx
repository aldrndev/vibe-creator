import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  Badge,
  Tabs,
  TabsList,
  Tab,
  TabsContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
} from "@/components/ui";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  Clock,
  MoreVertical,
  Edit,
  Trash,
  RefreshCw,
} from "lucide-react";
import {
  usePrompt,
  useUpdatePrompt,
  useDeletePrompt,
  useRegeneratePrompt,
} from "@/hooks/use-prompts";

const promptTypeLabels: Record<string, string> = {
  SCRIPT: "Script / Ide",
  VOICE: "Voice / TTS",
  VIDEO_GEN: "Video Generation",
  IMAGE: "Image / Thumbnail",
  RELAXING: "Relaxing / Ambient",
  CREATIVE_SCAN: "Creative Scan",
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
  const [newTitle, setNewTitle] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = async () => {
    try {
      await updatePrompt.mutateAsync({ title: newTitle });
      setIsEditOpen(false);
    } catch {
      // Error is logged by mutation
    }
  };

  const handleDelete = async () => {
    try {
      await deletePrompt.mutateAsync(id!);
      navigate("/dashboard/prompts");
    } catch {
      // Error is logged by mutation
    }
  };

  const handleRegenerate = async () => {
    try {
      await regeneratePrompt.mutateAsync();
    } catch {
      // Error is logged by mutation
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
        <p className="text-muted-foreground">Prompt tidak ditemukan</p>
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/prompts")}
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
            size="icon"
            variant="ghost"
            onClick={() => navigate("/dashboard/prompts")}
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{prompt.title}</h1>
              <Badge variant="default">
                {promptTypeLabels[prompt.type] || prompt.type}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {prompt.versions.length} versi • Dibuat{" "}
              {new Date(prompt.createdAt).toLocaleDateString("id-ID")}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreVertical size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                setNewTitle(prompt.title);
                setIsEditOpen(true);
              }}
            >
              <Edit size={16} />
              Edit Judul
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRegenerate}>
              <RefreshCw size={16} />
              Regenerate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash size={16} />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                      selectedVersion === version.id ||
                      (!selectedVersion &&
                        version.id === prompt.versions[0]?.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        Versi {version.version}
                      </span>
                      {version.id === prompt.currentVersionId && (
                        <Badge variant="default">Aktif</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock size={12} />
                      {new Date(version.createdAt).toLocaleString("id-ID")}
                    </div>
                    {version.userNotes && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
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
              <Tabs defaultValue="prompt" className="flex-1 flex flex-col">
                <TabsList className="px-4 pt-4">
                  <Tab value="prompt">Generated Prompt</Tab>
                  <Tab value="input">Input Data</Tab>
                </TabsList>

                <TabsContent value="prompt" className="p-4">
                  <div className="flex justify-end mb-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        handleCopy(currentVersion?.generatedPrompt || "")
                      }
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? "Disalin!" : "Salin"}
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm font-mono text-muted-foreground bg-muted p-4 rounded-lg max-h-[60vh] overflow-auto">
                    {currentVersion?.generatedPrompt || "Tidak ada prompt"}
                  </pre>
                </TabsContent>

                <TabsContent value="input" className="p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono text-muted-foreground bg-muted p-4 rounded-lg max-h-[60vh] overflow-auto">
                    {JSON.stringify(currentVersion?.inputData || {}, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Judul</DialogTitle>
          </DialogHeader>
          <Input
            label="Judul"
            value={newTitle}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewTitle(e.target.value)
            }
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleEdit} isLoading={updatePrompt.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Prompt</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Apakah kamu yakin ingin menghapus prompt ini? Tindakan ini tidak
            dapat dibatalkan.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              isLoading={deletePrompt.isPending}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
