import { Link, useNavigate } from '@tanstack/react-router';
import type { PromptType } from '@vibe-creator/shared';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronRight,
  Clock,
  FileText,
  Image,
  Mic,
  Music,
  Plus,
  Repeat2,
  Search,
  Sparkles,
  Timer,
  Video,
} from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Pagination,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { PageTransition } from '@/components/ui/PageTransition';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { usePrompts } from '@/hooks/use-prompts';

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
  { key: 'CREATIVE_SCAN', label: 'Scan', icon: Search },
  { key: 'TIMELAPSE', label: 'Timelapse', icon: Timer },
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
  CREATIVE_SCAN: { label: 'Scan' },
  TIMELAPSE: { label: 'Timelapse' },
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
    case 'CREATIVE_SCAN':
      return 'Bongkar strategi kreatif video viral kompetitor anda.';
    case 'TIMELAPSE':
      return 'Buat mahakarya timelapse cinematic dengan kekuatan Sora AI.';
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
        <h2 className="text-xl font-black uppercase tracking-widest italic">
          Prompt {promptTypeLabels[selectedType]?.label} Kosong
        </h2>
        <p className="text-muted-foreground font-medium text-sm">
          {getEmptyStateMessage(selectedType)}
        </p>
      </div>
    </div>
  );
}

export function PromptsPage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<PromptType | 'all'>('all');
  const [page, setPage] = useState(1);
  const LIMIT = 9;

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
          {prompts.map((prompt) => {
            const typeLabel = promptTypeLabels[prompt.type]?.label || prompt.type;
            const TypeIcon = promptTypes.find((t) => t.key === prompt.type)?.icon || Sparkles;

            return (
              <Card
                key={prompt.id}
                className="group bg-card/60 backdrop-blur-xl border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer relative overflow-hidden active:scale-[0.98]"
                onClick={() => handlePromptClick(prompt.id)}
              >
                <div className="absolute inset-0 bg-linear-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardBody className="p-6">
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 transition-transform duration-500">
                      <TypeIcon size={28} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0 text-left space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg leading-tight truncate text-foreground group-hover:text-primary transition-colors">
                          {prompt.title}
                        </h3>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                        <Badge
                          variant="secondary"
                          className="bg-primary/5 text-primary/80 border-primary/20 py-0.5 px-2"
                        >
                          {typeLabel}
                        </Badge>
                        <div className="flex items-center gap-1.5 bg-muted/20 px-2 py-0.5 rounded-full">
                          <span className="text-primary/70">v{prompt.currentVersion}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground/60">
                          <Clock size={12} className="shrink-0" />
                          <span className="truncate">
                            {new Date(prompt.updatedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted/10 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                      <ChevronRight size={18} className="text-primary" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
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
    <PageTransition className="pb-20 lg:pb-10">
      <div className="max-w-[1400px] mx-auto space-y-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-primary via-orange-500 to-rose-600">
                Prompt Builder
              </h1>
            </div>

            <Button
              asChild
              className="w-full md:w-auto rounded-full px-6 h-11 font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
            >
              <Link to="/dashboard/prompts/new">
                <Plus size={18} className="mr-2" /> Prompt Baru
              </Link>
            </Button>
          </div>
          <p className="text-muted-foreground font-medium text-sm ml-1 md:ml-13 md:text-left">
            Arsip prompt kreatif dan hasil optimasi model AI favorit anda.
          </p>
        </div>

        <div className="w-full overflow-x-auto mb-4 scrollbar-hide">
          <Tabs value={selectedType} onValueChange={handleTypeChange} className="w-max">
            <TabsList className="bg-muted/50 p-0 rounded-2xl border border-border/70 backdrop-blur-md">
              {promptTypes.map((type) => (
                <TabsTrigger
                  key={type.key}
                  value={type.key}
                  className="flex items-center gap-2 px-6 h-10 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                >
                  <type.icon size={14} />
                  <span>{type.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
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
                onChange={setPage}
                className="bg-card/40 backdrop-blur-xl border border-border/50 p-1 rounded-full"
              />
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
