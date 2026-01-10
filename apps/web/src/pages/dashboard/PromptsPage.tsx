import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Tabs,
  TabsList,
  TabsTrigger,
  Badge,
  Skeleton,
  Pagination,
} from "@/components/ui";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Sparkles,
  FileText,
  Mic,
  Video,
  Image,
  Music,
  Search,
  Clock,
  ChevronRight,
  Timer,
} from "lucide-react";
import { usePrompts } from "@/hooks/use-prompts";
import type { PromptType } from "@vibe-creator/shared";

const promptTypes: Array<{
  key: PromptType | "all";
  label: string;
  icon: typeof Sparkles;
}> = [
  { key: "all", label: "Semua", icon: Sparkles },
  { key: "SCRIPT", label: "Script", icon: FileText },
  { key: "VOICE", label: "Voice", icon: Mic },
  { key: "VIDEO_GEN", label: "Video", icon: Video },
  { key: "IMAGE", label: "Image", icon: Image },
  { key: "RELAXING", label: "Relaxing", icon: Music },
  { key: "CREATIVE_SCAN", label: "Scan", icon: Search },
  { key: "TIMELAPSE", label: "Timelapse", icon: Timer },
];

const promptTypeLabels: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "warning" | "destructive";
  }
> = {
  SCRIPT: { label: "Script", variant: "default" },
  VOICE: { label: "Voice", variant: "secondary" },
  VIDEO_GEN: { label: "Video", variant: "default" },
  IMAGE: { label: "Image", variant: "warning" },
  RELAXING: { label: "Relaxing", variant: "secondary" },
  CREATIVE_SCAN: { label: "Scan", variant: "destructive" },
  TIMELAPSE: { label: "Timelapse", variant: "secondary" },
};

export function PromptsPage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<PromptType | "all">("all");
  const [page, setPage] = useState(1);
  const LIMIT = 9;

  const { data: promptsResponse, isLoading } = usePrompts({
    ...(selectedType === "all" ? {} : { type: selectedType }),
    page,
    limit: LIMIT,
  });

  const prompts = promptsResponse?.success ? promptsResponse.data : [];
  const meta = promptsResponse?.success ? promptsResponse.meta : null;
  const totalPages = meta?.totalPages || 1;

  const handlePromptClick = (promptId: string) => {
    navigate(`/dashboard/prompts/${promptId}`);
  };

  const handleTypeChange = (key: string) => {
    setSelectedType(key as PromptType | "all");
    setPage(1); // Reset page on filter change
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prompt Builder</h1>
          <p className="text-muted-foreground">
            Buat dan kelola prompt untuk konten kamu
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/prompts/new">
            <Plus size={20} />
            Prompt Baru
          </Link>
        </Button>
      </div>

      {/* Tabs - Responsive Container */}
      <div className="w-full overflow-x-auto pb-2 -mb-2 scrollbar-hide">
        <Tabs value={selectedType} onValueChange={handleTypeChange}>
          <TabsList className="w-max">
            {promptTypes.map((type) => (
              <TabsTrigger
                key={type.key}
                value={type.key}
                className="flex items-center gap-2 px-4"
              >
                <type.icon size={16} />
                <span>{type.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <motion.div
        key={selectedType}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border border-transparent shadow-sm">
                <CardBody className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="w-2/3 h-4 rounded-lg" />
                      <Skeleton className="w-1/2 h-3 rounded-lg" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : prompts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {prompts.map((prompt) => {
                const typeConfig = promptTypeLabels[prompt.type] || {
                  label: prompt.type,
                  variant: "secondary" as const,
                };
                const TypeIcon =
                  promptTypes.find((t) => t.key === prompt.type)?.icon ||
                  Sparkles;

                return (
                  <Card
                    key={prompt.id}
                    className="group hover:bg-accent/50 transition-all border hover:border-primary/30 shadow-sm hover:shadow-md cursor-pointer"
                    onClick={() => handlePromptClick(prompt.id)}
                  >
                    <CardBody className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                          <TypeIcon size={24} strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="font-semibold text-medium truncate">
                              {prompt.title}
                            </h3>
                            <Badge variant={typeConfig.variant}>
                              {typeConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="font-medium bg-accent px-2 py-0.5 rounded-md">
                              v{prompt.currentVersion}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock size={12} />
                              {new Date(prompt.updatedAt).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          size={20}
                          className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors group-hover:translate-x-0.5"
                        />
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
                className="mt-6"
              />
            )}
          </>
        ) : (
          <Card className="border-dashed border-2 bg-transparent shadow-none">
            <CardBody className="p-12 text-center">
              {selectedType === "all" ? (
                <>
                  <Sparkles
                    className="mx-auto mb-4 text-muted-foreground"
                    size={64}
                  />
                  <h2 className="text-xl font-semibold mb-2">
                    Belum ada prompt
                  </h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Buat prompt pertama kamu untuk mulai generate konten
                    berkualitas.
                  </p>
                </>
              ) : (
                <>
                  {(() => {
                    const TypeIcon =
                      promptTypes.find((t) => t.key === selectedType)?.icon ||
                      Sparkles;
                    return (
                      <TypeIcon
                        className="mx-auto mb-4 text-muted-foreground"
                        size={64}
                      />
                    );
                  })()}
                  <h2 className="text-xl font-semibold mb-2">
                    Belum ada prompt {promptTypeLabels[selectedType]?.label}
                  </h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {selectedType === "SCRIPT" &&
                      "Buat prompt untuk generate script dan storytelling yang menarik."}
                    {selectedType === "VOICE" &&
                      "Buat prompt untuk generate voice-over dan dubbing."}
                    {selectedType === "VIDEO_GEN" &&
                      "Buat prompt untuk generate video dengan AI seperti Veo atau Runway."}
                    {selectedType === "IMAGE" &&
                      "Buat prompt untuk generate thumbnail dan gambar konten."}
                    {selectedType === "RELAXING" &&
                      "Buat prompt untuk generate audio relaxing dan ambient."}
                    {selectedType === "CREATIVE_SCAN" &&
                      "Analisis video kompetitor untuk mendapat insight kreatif."}
                    {selectedType === "TIMELAPSE" &&
                      "Buat prompt timelapse untuk Sora AI video generation."}
                  </p>
                </>
              )}
              <Button size="lg" asChild>
                <Link to="/dashboard/prompts/new">
                  <Plus size={20} />
                  Buat Prompt Pertama
                </Link>
              </Button>
            </CardBody>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
