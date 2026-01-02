import { useState } from 'react';
import { Button, Card, CardBody, Tabs, Tab, Chip, Skeleton } from '@heroui/react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { usePrompts } from '@/hooks/use-prompts';
import type { PromptType } from '@vibe-creator/shared';

const promptTypes: Array<{ key: PromptType | 'all'; label: string; icon: typeof Sparkles }> = [
  { key: 'all', label: 'Semua', icon: Sparkles },
  { key: 'SCRIPT', label: 'Script', icon: FileText },
  { key: 'VOICE', label: 'Voice', icon: Mic },
  { key: 'VIDEO_GEN', label: 'Video', icon: Video },
  { key: 'IMAGE', label: 'Image', icon: Image },
  { key: 'RELAXING', label: 'Relaxing', icon: Music },
  { key: 'CREATIVE_SCAN', label: 'Scan', icon: Search },
  { key: 'TIMELAPSE', label: 'Timelapse', icon: Timer },
];

const promptTypeLabels: Record<string, { label: string; color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default' }> = {
  SCRIPT: { label: 'Script', color: 'primary' },
  VOICE: { label: 'Voice', color: 'secondary' },
  VIDEO_GEN: { label: 'Video', color: 'success' },
  IMAGE: { label: 'Image', color: 'warning' },
  RELAXING: { label: 'Relaxing', color: 'default' },
  CREATIVE_SCAN: { label: 'Scan', color: 'danger' },
  TIMELAPSE: { label: 'Timelapse', color: 'secondary' },
};

export function PromptsPage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<PromptType | 'all'>('all');
  
  const { data: promptsResponse, isLoading } = usePrompts(
    selectedType === 'all' ? {} : { type: selectedType }
  );

  const prompts = promptsResponse?.success ? promptsResponse.data : [];

  const handlePromptClick = (promptId: string) => {
    navigate(`/dashboard/prompts/${promptId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prompt Builder</h1>
          <p className="text-foreground/60">Buat dan kelola prompt untuk konten kamu</p>
        </div>
        <Button 
          as={Link} 
          to="/dashboard/prompts/new" 
          color="primary"
          startContent={<Plus size={20} />}
        >
          Prompt Baru
        </Button>
      </div>

      {/* Tabs */}
      <Tabs 
        aria-label="Prompt types" 
        color="primary"
        variant="underlined"
        selectedKey={selectedType}
        onSelectionChange={(key) => setSelectedType(key as PromptType | 'all')}
        classNames={{
          tabList: "gap-6",
          cursor: "w-full",
          tab: "px-0 h-12",
        }}
      >
        {promptTypes.map((type) => (
          <Tab
            key={type.key}
            title={
              <div className="flex items-center gap-2">
                <type.icon size={16} />
                <span>{type.label}</span>
              </div>
            }
          />
        ))}
      </Tabs>

      {/* Content */}
      <motion.div
        key={selectedType}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {prompts.map((prompt) => {
              const typeConfig = promptTypeLabels[prompt.type] || { label: prompt.type, color: 'default' as const };
              const TypeIcon = promptTypes.find((t) => t.key === prompt.type)?.icon || Sparkles;
              
              const colorMap: Record<string, string> = {
                primary: 'bg-primary/10 text-primary',
                secondary: 'bg-secondary/10 text-secondary',
                success: 'bg-success/10 text-success',
                warning: 'bg-warning/10 text-warning',
                danger: 'bg-danger/10 text-danger',
                default: 'bg-default/10 text-default-600',
              };

              return (
                <Card 
                  key={prompt.id}
                  isPressable
                  onPress={() => handlePromptClick(prompt.id)}
                  className="group hover:bg-content2/50 transition-all border border-default-100 hover:border-default-300 shadow-sm hover:shadow-md"
                >
                  <CardBody className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${colorMap[typeConfig.color] || colorMap.default}`}>
                        <TypeIcon size={24} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-semibold text-medium truncate">{prompt.title}</h3>
                          <Chip 
                            size="sm" 
                            variant="flat" 
                            color={typeConfig.color}
                            classNames={{ content: "font-medium text-[10px] uppercase tracking-wider" }}
                          >
                            {typeConfig.label}
                          </Chip>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-foreground/50">
                          <span className="font-medium bg-default-100 px-2 py-0.5 rounded-md">v{prompt.currentVersion}</span>
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} />
                            {new Date(prompt.updatedAt).toLocaleDateString('id-ID', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-foreground/30 group-hover:text-foreground/60 transition-colors group-hover:translate-x-0.5" />
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-transparent shadow-none">
            <CardBody className="p-12 text-center">
              {selectedType === 'all' ? (
                <>
                  <Sparkles className="mx-auto mb-4 text-foreground/40" size={64} />
                  <h2 className="text-xl font-semibold mb-2">Belum ada prompt</h2>
                  <p className="text-foreground/60 mb-6 max-w-md mx-auto">
                    Buat prompt pertama kamu untuk mulai generate konten berkualitas.
                  </p>
                </>
              ) : (
                <>
                  {(() => {
                    const TypeIcon = promptTypes.find((t) => t.key === selectedType)?.icon || Sparkles;
                    return <TypeIcon className="mx-auto mb-4 text-foreground/40" size={64} />;
                  })()}
                  <h2 className="text-xl font-semibold mb-2">Belum ada prompt {promptTypeLabels[selectedType]?.label}</h2>
                  <p className="text-foreground/60 mb-6 max-w-md mx-auto">
                    {selectedType === 'SCRIPT' && 'Buat prompt untuk generate script dan storytelling yang menarik.'}
                    {selectedType === 'VOICE' && 'Buat prompt untuk generate voice-over dan dubbing.'}
                    {selectedType === 'VIDEO_GEN' && 'Buat prompt untuk generate video dengan AI seperti Veo atau Runway.'}
                    {selectedType === 'IMAGE' && 'Buat prompt untuk generate thumbnail dan gambar konten.'}
                    {selectedType === 'RELAXING' && 'Buat prompt untuk generate audio relaxing dan ambient.'}
                    {selectedType === 'CREATIVE_SCAN' && 'Analisis video kompetitor untuk mendapat insight kreatif.'}
                    {selectedType === 'TIMELAPSE' && 'Buat prompt timelapse untuk Sora AI video generation.'}
                  </p>
                </>
              )}
              <Button 
                as={Link} 
                to="/dashboard/prompts/new" 
                color="primary"
                size="lg"
                startContent={<Plus size={20} />}
              >
                Buat Prompt Pertama
              </Button>
            </CardBody>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
