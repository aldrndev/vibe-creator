import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Clock3, History, Plus, RotateCcw, X } from 'lucide-react';
import { useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui';
import {
  getLastActiveWorkspace,
  getWorkspaceContinuePath,
  getWorkspaceDisplayTitle,
  getWorkspaceEditedLabel,
  getWorkspaceExpiryLabel,
  type WorkspaceItem,
} from '@/services/workspace-api';

interface ContinueWorkspaceDialogProps {
  readonly tool: 'ai-director' | 'video-studio' | 'loop-creator' | 'reaction-video' | 'live-stream';
  readonly onStartNew: () => void;
  readonly onUnavailable?: () => void;
}

function toolLabel(tool: ContinueWorkspaceDialogProps['tool']): string {
  if (tool === 'ai-director') return 'AI Director';
  if (tool === 'video-studio') return 'Video Studio';
  if (tool === 'loop-creator') return 'Loop Creator';
  return tool === 'reaction-video' ? 'Reaction Creator' : 'Live Streaming';
}

export function ContinueWorkspaceDialog({
  tool,
  onStartNew,
  onUnavailable,
}: ContinueWorkspaceDialogProps) {
  const navigate = useNavigate();
  const { data, isError, isLoading } = useQuery({
    queryKey: ['workspace-last-active', tool],
    queryFn: () => getLastActiveWorkspace(tool),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!isLoading && (isError || !data)) {
      onUnavailable?.();
    }
  }, [data, isError, isLoading, onUnavailable]);

  if (isLoading || !data) {
    return null;
  }

  return (
    <ContinueWorkspaceDialogView
      item={data}
      label={toolLabel(tool)}
      onStartNew={onStartNew}
      onContinue={() => {
        onStartNew();
        navigate({ to: getWorkspaceContinuePath(data) });
      }}
    />
  );
}

function ContinueWorkspaceDialogView({
  item,
  label,
  onStartNew,
  onContinue,
}: {
  readonly item: WorkspaceItem;
  readonly label: string;
  readonly onStartNew: () => void;
  readonly onContinue: () => void;
}) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onStartNew();
    }
  };
  const displayTitle = getWorkspaceDisplayTitle(item);

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        hideCloseButton
        className="w-[calc(100vw-2rem)] max-w-lg rounded-3xl border-border/50 bg-card/95 p-0 shadow-2xl backdrop-blur-xl sm:rounded-3xl"
      >
        <DialogClose className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border/45 bg-background/35 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:ring-offset-0">
          <X size={17} />
          <span className="sr-only">Tutup</span>
        </DialogClose>
        <div className="space-y-5 overflow-hidden rounded-3xl p-5 pt-14 sm:p-6 sm:pt-14">
          <div className="max-w-[calc(100%-2.75rem)]">
            <DialogTitle className="text-xl font-black tracking-tight text-foreground">
              Lanjutkan sesi terakhir?
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Kamu punya draft {label} yang masih aktif dan bisa dilanjutkan sekarang.
            </DialogDescription>
          </div>

          <div className="rounded-2xl border border-border/45 bg-background/35 px-4 py-3.5">
            <p className="mb-2 text-[0.66rem] font-black uppercase tracking-[0.22em] text-primary">
              Sesi terakhir
            </p>
            <h2 className="line-clamp-2 text-base font-bold leading-snug text-foreground">
              {displayTitle}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span>{label}</span>
              <span className="text-muted-foreground/40">•</span>
              <span>{getWorkspaceEditedLabel(item)}</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 size={13} />
                {getWorkspaceExpiryLabel(item)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              onClick={onContinue}
              className="h-11 rounded-xl font-bold shadow-none focus-visible:ring-primary/25 focus-visible:ring-offset-0"
            >
              <RotateCcw size={16} />
              Lanjutkan
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onStartNew}
              className="h-11 rounded-xl border-border/50 bg-background/35 font-bold focus-visible:ring-primary/25 focus-visible:ring-offset-0"
            >
              <Plus size={16} />
              Mulai Baru
            </Button>
          </div>

          <p className="text-center text-xs font-semibold text-muted-foreground">
            Mulai baru tidak menghapus draft lama.
          </p>

          <Button type="button" variant="ghost" asChild className="h-9 w-full rounded-xl">
            <Link to="/dashboard/history" className="font-semibold text-muted-foreground">
              <History size={15} />
              Lihat semua riwayat
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
