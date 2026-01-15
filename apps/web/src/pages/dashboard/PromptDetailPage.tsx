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
  Divider,
} from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  Clock,
  MoreVertical,
  Edit,
  Trash,
  RefreshCw,
  Sparkles,
  History,
  FileText,
  Terminal,
} from "lucide-react";
import {
  usePrompt,
  useUpdatePrompt,
  useDeletePrompt,
  useRegeneratePrompt,
} from "@/hooks/use-prompts";
import { PageTransition } from "@/components/ui/PageTransition";
import { cn } from "@/lib/utils";

const promptTypeLabels: Record<string, string> = {
  SCRIPT: "Script / Ide",
  VOICE: "Voice / TTS",
  VIDEO_GEN: "Video Generation",
  IMAGE: "Image / Thumbnail",
  RELAXING: "Relaxing / Ambient",
  CREATIVE_SCAN: "Creative Scan",
  TIMELAPSE: "Timelapse / Sora",
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <PageTransition className="text-center py-20">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto">
            <Trash className="text-muted-foreground w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-widest text-foreground">
              Prompt Tidak Ditemukan
            </h2>
            <p className="text-muted-foreground font-medium text-sm">
              Prompt mungkin telah dihapus atau tidak tersedia.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard/prompts")}
            className="rounded-full px-8 border-border/50 font-black uppercase text-[10px] tracking-widest h-11"
          >
            Kembali ke Prompts
          </Button>
        </div>
      </PageTransition>
    );
  }

  const currentVersion = selectedVersion
    ? prompt.versions.find((v) => v.id === selectedVersion)
    : prompt.versions[0];

  return (
    <PageTransition className="pb-20 lg:pb-10">
      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full w-10 h-10 bg-muted/20 border border-border/50"
                onClick={() => navigate("/dashboard/prompts")}
              >
                <ArrowLeft size={18} />
              </Button>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black tracking-tighter text-foreground">
                    {prompt.title}
                  </h1>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[9px] tracking-widest px-3 py-1"
                  >
                    {promptTypeLabels[prompt.type] || prompt.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <History size={12} /> {prompt.versions.length} Versi
                  </span>
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} />{" "}
                    {new Date(prompt.createdAt).toLocaleDateString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="hidden sm:flex rounded-full h-10 px-4 border-border/50 font-black uppercase text-[10px] tracking-widest bg-card/60 backdrop-blur-xl transition-all active:scale-95"
                onClick={handleRegenerate}
                isLoading={regeneratePrompt.isPending}
              >
                <RefreshCw size={14} className="mr-2" /> Regenerate
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full w-10 h-10 bg-muted/20 border border-border/50"
                  >
                    <MoreVertical size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-xl border-border/50 w-48">
                  <DropdownMenuItem
                    className="gap-3 font-bold uppercase text-[10px] tracking-widest py-3"
                    onClick={() => {
                      setNewTitle(prompt.title);
                      setIsEditOpen(true);
                    }}
                  >
                    <Edit size={14} className="text-info" /> Edit Judul
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="sm:hidden gap-3 font-bold uppercase text-[10px] tracking-widest py-3"
                    onClick={handleRegenerate}
                  >
                    <RefreshCw size={14} className="text-primary" /> Regenerate
                  </DropdownMenuItem>
                  <Divider className="my-1 opacity-50" />
                  <DropdownMenuItem
                    className="text-destructive gap-3 font-bold uppercase text-[10px] tracking-widest py-3"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    <Trash size={14} /> Hapus Prompt
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 lg:gap-10">
          {/* Left - Version List */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="flex items-center gap-2 px-1">
                <History size={14} className="text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/80">
                  Riwayat Versi
                </h3>
              </div>
              <Card className="bg-card/60 backdrop-blur-xl border-border/50 max-h-[70vh] overflow-auto">
                <CardBody className="p-3 space-y-2">
                  {prompt.versions.map((version) => (
                    <button
                      key={version.id}
                      onClick={() => setSelectedVersion(version.id)}
                      className={cn(
                        "w-full p-4 rounded-xl border transition-all duration-300 group/v text-left flex flex-col gap-2",
                        selectedVersion === version.id ||
                          (!selectedVersion &&
                            version.id === prompt.versions[0]?.id)
                          ? "bg-primary/10 border-primary shadow-lg shadow-primary/5"
                          : "bg-muted/10 border-transparent hover:border-border/50 hover:bg-muted/20"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-xs font-black uppercase tracking-widest",
                              selectedVersion === version.id ||
                                (!selectedVersion &&
                                  version.id === prompt.versions[0]?.id)
                                ? "text-primary"
                                : "text-foreground"
                            )}
                          >
                            Versi {version.version}
                          </span>
                          {version.id === prompt.currentVersionId && (
                            <div className="w-1 h-1 rounded-full bg-primary" />
                          )}
                        </div>
                        {version.id === prompt.currentVersionId && (
                          <Badge
                            variant="secondary"
                            className="bg-primary/20 text-primary border-primary/20 text-[8px] font-black uppercase py-0.5 px-1.5"
                          >
                            Aktif
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">
                        <Clock size={10} />
                        {new Date(version.createdAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <AnimatePresence>
                        {version.userNotes && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            className="text-[10px] font-medium text-muted-foreground line-clamp-2 mt-1 italic border-l-2 border-muted-foreground/20 pl-2"
                          >
                            {version.userNotes}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </button>
                  ))}
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Right - Prompt Content */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9">
            <Card className="bg-card/60 backdrop-blur-xl border-border/50 min-h-[600px] flex flex-col">
              <CardBody className="p-0 flex flex-col flex-1">
                <Tabs defaultValue="prompt" className="flex-1 flex flex-col">
                  <TabsList className="px-6 pt-6 gap-6 bg-transparent border-b border-border/30">
                    <Tab
                      value="prompt"
                      className="flex items-center gap-2 pb-4 text-[10px] font-black uppercase tracking-widest border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary transition-all"
                    >
                      <Terminal size={12} /> Generated Prompt
                    </Tab>
                    <Tab
                      value="input"
                      className="flex items-center gap-2 pb-4 text-[10px] font-black uppercase tracking-widest border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary transition-all"
                    >
                      <FileText size={12} /> Input Data
                    </Tab>
                  </TabsList>

                  <TabsContent
                    value="prompt"
                    className="p-0 flex-1 flex flex-col"
                  >
                    <div className="p-6 flex items-center justify-between bg-muted/5 border-b border-border/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Sparkles size={14} className="text-primary" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Prompt v{currentVersion?.version}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          "rounded-full h-9 px-4 font-black uppercase text-[10px] tracking-widest transition-all",
                          copied
                            ? "text-success bg-success/10"
                            : "text-primary hover:bg-primary/10"
                        )}
                        onClick={() =>
                          handleCopy(currentVersion?.generatedPrompt || "")
                        }
                      >
                        {copied ? (
                          <Check size={14} className="mr-2" />
                        ) : (
                          <Copy size={14} className="mr-2" />
                        )}
                        {copied ? "Disalin!" : "Salin Prompt"}
                      </Button>
                    </div>
                    <div className="p-6 flex-1 bg-muted/20">
                      <pre className="whitespace-pre-wrap text-sm font-mono text-foreground leading-relaxed selection:bg-primary/20 p-6 rounded-2xl bg-card border border-border/50 shadow-inner min-h-[400px]">
                        {currentVersion?.generatedPrompt || "Tidak ada prompt"}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="input"
                    className="p-0 flex-1 flex flex-col grayscale opacity-80"
                  >
                    <div className="p-6 flex-1 bg-muted/10">
                      <pre className="whitespace-pre-wrap text-xs font-mono text-muted-foreground p-6 rounded-2xl bg-card/40 border border-border/50 shadow-inner">
                        {JSON.stringify(
                          currentVersion?.inputData || {},
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-3xl border-border/50 bg-card/95 backdrop-blur-2xl p-0 overflow-hidden sm:max-w-[400px]">
          <DialogHeader className="p-6 bg-muted/10 border-b border-border/30">
            <DialogTitle className="text-lg font-black uppercase tracking-widest text-foreground">
              Edit Judul Prompt
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Nama Prompt Baru
              </label>
              <Input
                placeholder="Masukkan judul baru"
                value={newTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewTitle(e.target.value)
                }
                className="h-12 rounded-xl bg-muted/20 border-border/50 font-bold px-4"
              />
            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/5 border-t border-border/30 flex-row gap-3">
            <Button
              variant="ghost"
              className="flex-1 rounded-xl h-12 uppercase text-[10px] font-black tracking-widest"
              onClick={() => setIsEditOpen(false)}
            >
              Batal
            </Button>
            <Button
              className="flex-2 rounded-xl h-12 uppercase text-[10px] font-black tracking-widest shadow-lg shadow-primary/20"
              onClick={handleEdit}
              isLoading={updatePrompt.isPending}
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="rounded-3xl border-border/50 bg-card/95 backdrop-blur-2xl p-0 overflow-hidden sm:max-w-[400px]">
          <DialogHeader className="p-6 bg-destructive/10 border-b border-border/30 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
              <Trash size={20} className="text-destructive" />
            </div>
            <DialogTitle className="text-lg font-black uppercase tracking-widest text-destructive">
              Hapus Prompt
            </DialogTitle>
          </DialogHeader>
          <div className="p-8">
            <p className="text-muted-foreground font-medium text-center">
              Apakah kamu yakin ingin menghapus prompt ini? Tindakan ini tidak
              dapat dibatalkan dan semua riwayat versi akan hilang.
            </p>
          </div>
          <DialogFooter className="p-6 bg-muted/5 border-t border-border/30 flex-row gap-3">
            <Button
              variant="ghost"
              className="flex-1 rounded-xl h-12 uppercase text-[10px] font-black tracking-widest"
              onClick={() => setIsDeleteOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              className="flex-1 rounded-xl h-12 uppercase text-[10px] font-black tracking-widest shadow-lg shadow-destructive/20"
              onClick={handleDelete}
              isLoading={deletePrompt.isPending}
            >
              Hapus Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
