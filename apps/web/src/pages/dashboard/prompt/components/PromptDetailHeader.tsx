import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Clock, Edit, History, Trash2 } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import type { PromptDetail } from '@/hooks/use-prompts';

const promptTypeLabels: Record<string, string> = {
  SCRIPT: 'Script / Ide',
  VOICE: 'Voice / TTS',
  VIDEO_GEN: 'Video Generation',
  IMAGE: 'Image / Thumbnail',
  RELAXING: 'Relaxing / Ambient',
  CREATIVE_SCAN: 'Creative Scan',
  LOOP_SOURCE: 'Loop Source',
  TALKING_HEAD: 'Talking Head / Avatar',
  SOCIAL_COPY: 'Social Copy / Caption',
};

export interface PromptDetailHeaderProps {
  prompt: PromptDetail;
  promptId: string;
  onDeleteClick: () => void;
}

export function PromptDetailHeader({
  prompt,
  promptId,
  onDeleteClick,
}: Readonly<PromptDetailHeaderProps>) {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate({ to: '/dashboard/prompts' });
  };

  const handleEditPrompt = () => {
    // Navigate to prompt builder step 2 (FORM) with edit search param
    navigate({
      to: '/dashboard/prompts/new',
      search: { edit: promptId },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        {/* Left Section: Back button and Title metadata */}
        <div className="flex items-center gap-4">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full w-10 h-10 bg-muted/20 border border-border/50 cursor-pointer"
            onClick={handleBack}
            aria-label="Kembali ke Prompts"
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
                <Clock size={12} />{' '}
                {new Date(prompt.createdAt).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Action buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            className="rounded-full h-10 px-5 border border-border/50 font-bold uppercase text-[10px] tracking-widest bg-card/60 hover:bg-muted/10 hover:text-primary active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            onClick={handleEditPrompt}
          >
            <Edit size={13} />
            <span>Edit Prompt</span>
          </Button>

          <Button
            variant="destructive"
            className="rounded-full h-10 px-5 font-bold uppercase text-[10px] tracking-widest bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/10 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            onClick={onDeleteClick}
          >
            <Trash2 size={13} />
            <span>Hapus</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
