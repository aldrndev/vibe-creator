import { Link, useNavigate } from '@tanstack/react-router';
import type { PromptType } from '@vibe-creator/shared';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Image,
  Mic,
  Music,
  Plus,
  Repeat2,
  Search,
  Sparkles,
  Trash2,
  User,
  Video,
} from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui';
import { PageTransition } from '@/components/ui/PageTransition';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { type Prompt, useDeletePrompt, usePrompts } from '@/hooks/use-prompts';
import { cn } from '@/lib/utils';

const promptTypes: Array<{
  key: PromptType | 'all';
  label: string;
  icon: typeof Sparkles;
}> = [
  { key: 'all', label: 'Semua', icon: Sparkles },
  { key: 'SCRIPT', label: 'Script', icon: FileText },
  { key: 'VOICE', label: 'Voice', icon: Mic },
  { key: 'VIDEO_GEN', label: 'Video', icon: Video },
  { key: 'IMAGE', label: 'Image', icon: Image },
  { key: 'RELAXING', label: 'Relaxing', icon: Music },
  { key: 'TALKING_HEAD', label: 'Talking Head', icon: User },
  { key: 'SOCIAL_COPY', label: 'Social Copy', icon: FileText },
  { key: 'CREATIVE_SCAN', label: 'Scan', icon: Search },
  { key: 'LOOP_SOURCE', label: 'Loop Source', icon: Repeat2 },
];

const promptTypeLabels: Record<
  string,
  {
    label: string;
  }
> = {
  SCRIPT: { label: 'Script' },
  VOICE: { label: 'Voice' },
  VIDEO_GEN: { label: 'Video' },
  IMAGE: { label: 'Image' },
  RELAXING: { label: 'Relaxing' },
  TALKING_HEAD: { label: 'Talking Head' },
  SOCIAL_COPY: { label: 'Social Copy' },
  CREATIVE_SCAN: { label: 'Scan' },
  LOOP_SOURCE: { label: 'Loop Source' },
};

function getEmptyStateMessage(type: PromptType | 'all') {
  switch (type) {
    case 'SCRIPT':
      return 'Arsiteki script storytelling yang menghipnotis audiens anda.';
    case 'VOICE':
      return 'Rancang karakter suara yang sempurna untuk narasi video anda.';
    case 'VIDEO_GEN':
      return 'Wujudkan imajinasi visual terbaik dengan prompt video AI yang kaya.';
    case 'IMAGE':
      return 'Ciptakan visual artistik dan thumbnail yang klik-worthy.';
    case 'RELAXING':
      return 'Susun mood audio ambient yang menenangkan jiwa.';
    case 'TALKING_HEAD':
      return 'Rancang presenter virtual dengan avatar AI untuk video presentasi anda.';
    case 'SOCIAL_COPY':
      return 'Tulis caption media sosial yang memikat audiens dan viral.';
    case 'CREATIVE_SCAN':
      return 'Bongkar strategi kreatif video viral kompetitor anda.';
    case 'LOOP_SOURCE':
      return 'Buat source ambience dengan visual dan audio natural untuk loop seamless.';
    default:
      return '';
  }
}

function EmptyState({ selectedType }: { selectedType: PromptType | 'all' }) {
  if (selectedType === 'all') {
    return (
      <div className="space-y-6 max-w-sm mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto border border-primary/20">
          <Sparkles className="text-primary w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase tracking-widest">Belum Ada Prompt</h2>
          <p className="text-muted-foreground font-medium text-sm">
            Mulai arsiteki prompt berkualitas untuk meningkatkan kualitas konten anda sekarang.
          </p>
        </div>
      </div>
    );
  }

  const TypeIcon = promptTypes.find((t) => t.key === selectedType)?.icon || Sparkles;

  return (
    <div className="space-y-6 max-w-sm mx-auto">
      <div className="w-20 h-20 rounded-3xl bg-muted/10 flex items-center justify-center mx-auto border border-border/50">
        <TypeIcon className="text-muted-foreground w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-black uppercase tracking-widest">
          Prompt {promptTypeLabels[selectedType]?.label} Kosong
        </h2>
        <p className="text-muted-foreground font-medium text-sm">
          {getEmptyStateMessage(selectedType)}
        </p>
      </div>
    </div>
  );
}

const cleanPromptPreview = (rawPrompt: string | null) => {
  if (!rawPrompt) return 'Belum ada hasil prompt yang diarsiteki.';
  return rawPrompt
    .replace(/^(?:###|\*\*\*)\s*/gm, '')
    .replace(/\s*\*\*\*$/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/\n+/g, ' ')
    .trim();
};

interface PromptCardProps {
  readonly prompt: Prompt;
  readonly isCopied: boolean;
  readonly confirmingDeleteId: string | null;
  readonly deletePending: boolean;
  readonly deletePendingId: string | null;
  readonly onCopy: (e: React.MouseEvent, id: string, text: string | null) => void;
  readonly onDelete: (e: React.MouseEvent, id: string) => void;
  readonly onClick: (id: string) => void;
}

function PromptCard({
  prompt,
  isCopied,
  confirmingDeleteId,
  deletePending,
  deletePendingId,
  onCopy,
  onDelete,
  onClick,
}: Readonly<PromptCardProps>) {
  const typeLabel = promptTypeLabels[prompt.type]?.label || prompt.type;
  const TypeIcon = promptTypes.find((t) => t.key === prompt.type)?.icon || Sparkles;
  const previewText = cleanPromptPreview(prompt.lastGeneratedPrompt);

  const isDeleting = deletePending && deletePendingId === prompt.id;
  const isConfirmingDelete = confirmingDeleteId === prompt.id;

  let deleteButtonContent: React.ReactNode;
  if (isDeleting) {
    deleteButtonContent = (
      <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
    );
  } else if (isConfirmingDelete) {
    deleteButtonContent = <Check size={14} className="animate-pulse text-rose-500" />;
  } else {
    deleteButtonContent = <Trash2 size={14} />;
  }

  return (
    <Card
      className="group bg-card/60 backdrop-blur-xl border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer relative overflow-hidden active:scale-[0.98] flex flex-col justify-between"
      onClick={() => onClick(prompt.id)}
    >
      <CardBody className="p-6 flex flex-col h-full justify-between space-y-4">
        {/* Card Header Section */}
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:scale-105 transition-transform duration-500">
            <TypeIcon size={24} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0 text-left space-y-1">
            <h3 className="font-bold text-base leading-tight truncate text-foreground group-hover:text-primary transition-colors">
              {prompt.title}
            </h3>
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-black tracking-widest text-muted-foreground/80">
              <Badge
                variant="secondary"
                className="bg-primary/5 text-primary/80 border-primary/10 py-0 px-1.5 text-[8px] tracking-widest uppercase font-black"
              >
                {typeLabel}
              </Badge>
              <div className="bg-muted/30 px-1.5 py-0.5 rounded-full">
                <span>v{prompt.currentVersion}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Body - Content Preview */}
        <div className="relative z-10 flex-1 text-left">
          <p className="text-xs text-muted-foreground/85 font-medium leading-relaxed line-clamp-2 min-h-8">
            {previewText}
          </p>
        </div>

        {/* Card Footer - Meta & Quick Actions */}
        <div className="relative z-10 pt-3 border-t border-border/20 flex items-center justify-between text-muted-foreground/60">
          <div className="flex items-center gap-1.5 text-[9px] uppercase font-black tracking-widest">
            <Clock size={12} className="shrink-0 text-muted-foreground/45" />
            <span className="truncate">
              {new Date(prompt.updatedAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                'h-8 w-8 rounded-lg border transition-all duration-300 active:scale-90 shrink-0',
                isConfirmingDelete
                  ? 'bg-rose-500/20 border-rose-500 text-rose-500 hover:bg-rose-500/30'
                  : 'bg-muted/10 border-border/50 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 md:opacity-0 md:group-hover:opacity-100',
              )}
              onClick={(e) => onDelete(e, prompt.id)}
              title={isConfirmingDelete ? 'Klik Lagi untuk Hapus' : 'Hapus Prompt'}
              disabled={deletePending}
            >
              {deleteButtonContent}
            </Button>

            {prompt.lastGeneratedPrompt && (
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  'h-8 w-8 rounded-lg border transition-all duration-300 active:scale-90 shrink-0',
                  isCopied
                    ? 'bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/15'
                    : 'bg-muted/10 border-border/50 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/20 md:opacity-0 md:group-hover:opacity-100',
                )}
                onClick={(e) => onCopy(e, prompt.id, prompt.lastGeneratedPrompt)}
                title="Salin Prompt"
              >
                {isCopied ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            )}
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted/10 border border-border/50 text-muted-foreground group-hover:text-primary group-hover:border-primary/20 md:opacity-0 md:group-hover:opacity-100 transition-all group-hover:translate-x-0.5 shrink-0">
              <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function PromptsPage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<PromptType | 'all'>('all');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const LIMIT = 9;

  const deletePrompt = useDeletePrompt();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmingDeleteId === id) {
      try {
        await deletePrompt.mutateAsync(id);
        setConfirmingDeleteId(null);
      } catch (err) {
        console.error(err);
      }
    } else {
      setConfirmingDeleteId(id);
      setTimeout(() => {
        setConfirmingDeleteId((prev) => (prev === id ? null : prev));
      }, 3000);
    }
  };

  const handleCopy = async (e: React.MouseEvent, id: string, text: string | null) => {
    e.stopPropagation();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { data: promptsResponse, isLoading } = usePrompts({
    ...(selectedType === 'all' ? {} : { type: selectedType }),
    page,
    limit: LIMIT,
  });

  const prompts = promptsResponse?.success ? promptsResponse.data : [];
  const meta = promptsResponse?.success ? promptsResponse.meta : null;
  const totalPages = meta?.totalPages || 1;

  const handlePromptClick = (promptId: string) => {
    navigate({ to: '/dashboard/prompts/$id', params: { id: promptId } });
  };

  const handleTypeChange = (key: string) => {
    setSelectedType(key as PromptType | 'all');
    setPage(1); // Reset page on filter change
  };

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="bg-card/40 border-border/50">
            <CardBody className="p-6">
              <div className="flex items-center gap-5">
                <Skeleton className="w-14 h-14 rounded-2xl bg-muted/20" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="w-3/4 h-5 rounded-lg bg-muted/20" />
                  <Skeleton className="w-1/2 h-3 rounded-md bg-muted/10" />
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    );
  } else if (prompts.length > 0) {
    content = (
      <AnimatePresence mode="popLayout">
        <motion.div
          key={selectedType}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {prompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              isCopied={copiedId === prompt.id}
              confirmingDeleteId={confirmingDeleteId}
              deletePending={deletePrompt.isPending}
              deletePendingId={deletePrompt.variables ?? null}
              onCopy={handleCopy}
              onDelete={handleDelete}
              onClick={handlePromptClick}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    );
  } else {
    content = (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="bg-card/30 backdrop-blur-xl border-dashed border-2 border-border/50">
          <CardBody className="p-16 text-center">
            <EmptyState selectedType={selectedType} />
            <Button
              size="lg"
              asChild
              className="mt-8 rounded-full h-12 px-8 font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
            >
              <Link to="/dashboard/prompts/new">
                <Plus size={18} className="mr-2" /> Buat Prompt Pertama
              </Link>
            </Button>
          </CardBody>
        </Card>
      </motion.div>
    );
  }

  return (
    <PageTransition className="pb-6 lg:pb-10">
      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-border/30 pb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center shrink-0">
                <Sparkles className="text-white w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl bg-clip-text text-transparent bg-linear-to-r from-primary via-orange-500 to-rose-600">
                Prompt Builder
              </h1>
            </div>
            <p className="text-sm font-medium text-muted-foreground ml-1 md:ml-13">
              Arsip prompt kreatif dan hasil optimasi model AI favorit anda.
            </p>
          </div>

          <Button
            asChild
            className="w-full md:w-auto rounded-full px-6 h-11 font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 bg-linear-to-r from-primary to-orange-600 hover:from-primary/95 hover:to-orange-600/95"
          >
            <Link to="/dashboard/prompts/new">
              <Plus size={16} className="mr-2" /> Prompt Baru
            </Link>
          </Button>
        </div>

        {/* Filter Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden sm:inline ml-1 shrink-0">
              Filter Tipe:
            </span>
            <Select value={selectedType} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full sm:w-[240px] h-11 bg-card/60 border-border/50 rounded-2xl font-black uppercase text-xs tracking-widest px-4 focus:ring-primary/20 shrink-0">
                <div className="flex items-center gap-2">
                  {(() => {
                    const currentType = promptTypes.find((t) => t.key === selectedType);
                    if (currentType) {
                      const Icon = currentType.icon;
                      return (
                        <>
                          <Icon size={14} className="text-primary" />
                          <span>{currentType.label}</span>
                        </>
                      );
                    }
                    return 'Pilih Tipe Prompt';
                  })()}
                </div>
              </SelectTrigger>
              <SelectContent>
                {promptTypes.map((type) => (
                  <SelectItem
                    key={type.key}
                    value={type.key}
                    className="rounded-xl font-black uppercase text-[11px] tracking-widest"
                  >
                    <span className="flex items-center gap-2 font-black">
                      <type.icon size={14} className="text-muted-foreground" />
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-8">
          {content}

          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center pt-4"
            >
              <Pagination
                total={totalPages}
                page={page}
                onChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({ top: 0, behavior: 'auto' });
                }}
                className="bg-card/40 backdrop-blur-xl border border-border/50 p-1 rounded-full"
              />
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
