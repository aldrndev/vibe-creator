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
        className="w-[calc(100vw-2rem)] max-w-lg rounded-3xl border-border/40 bg-card/90 p-0 shadow-2xl backdrop-blur-xl sm:rounded-3xl"
      >
        <DialogClose className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border/45 bg-background/35 text-muted-foreground transition-all duration-200 hover:bg-muted/70 hover:text-foreground hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:ring-offset-0">
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

          <div className="group rounded-2xl border border-border/45 bg-background/35 px-4 py-3.5 transition-colors duration-300 hover:border-border/80">
            <p className="mb-2 text-[0.66rem] font-black uppercase tracking-[0.22em] bg-linear-to-r from-primary to-rose-500 bg-clip-text text-transparent">
              Sesi terakhir
            </p>
            <h2 className="line-clamp-2 text-base font-bold leading-snug text-foreground transition-colors duration-300 group-hover:text-primary">
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
              className="h-11 rounded-xl font-black uppercase tracking-wider text-xs bg-linear-to-r from-primary via-orange-500 to-rose-600 text-white border-0 shadow-md shadow-primary/10 transition-all duration-200 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-primary/25 focus-visible:ring-offset-0"
            >
              <RotateCcw size={14} className="mr-1" />
              Lanjutkan
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onStartNew}
              className="h-11 rounded-xl border-border/50 bg-background/35 font-black uppercase tracking-wider text-xs transition-all duration-200 hover:bg-muted/50 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-primary/25 focus-visible:ring-offset-0"
            >
              <Plus size={14} className="mr-1" />
              Mulai Baru
            </Button>
          </div>

          <p className="text-center text-xs font-semibold text-muted-foreground/80">
            Mulai baru tidak menghapus draft lama.
          </p>

          <Button
            type="button"
            variant="ghost"
            asChild
            className="h-9 w-full rounded-xl transition-all duration-200 hover:bg-muted/50"
          >
            <Link
              to="/dashboard/history"
              className="font-semibold text-muted-foreground/95 hover:text-foreground"
            >
              <History size={15} />
              Lihat semua riwayat
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
