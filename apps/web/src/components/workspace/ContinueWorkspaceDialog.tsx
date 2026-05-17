import { useQuery } from '@tanstack/react-query';
import { Clock3, History, Plus, RotateCcw, X } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui';
import {
  getLastActiveWorkspace,
  getWorkspaceContinuePath,
  getWorkspaceDisplayTitle,
  getWorkspaceEditedLabel,
  getWorkspaceExpiryLabel,
  type WorkspaceItem,
} from '@/services/workspace-api';

interface ContinueWorkspaceDialogProps {
  readonly tool: 'ai-director' | 'video-studio';
  readonly onStartNew: () => void;
  readonly onUnavailable?: () => void;
}

function toolLabel(tool: ContinueWorkspaceDialogProps['tool']): string {
  return tool === 'ai-director' ? 'AI Director' : 'Video Studio';
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
      onContinue={() => navigate(getWorkspaceContinuePath(data))}
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
        className="w-[calc(100vw-2rem)] max-w-md rounded-3xl border-border/50 bg-card/95 p-0 shadow-2xl backdrop-blur-xl sm:rounded-3xl"
      >
        <DialogClose className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-0">
          <X size={17} />
          <span className="sr-only">Tutup</span>
        </DialogClose>
        <DialogTitle className="sr-only">Sesi aktif</DialogTitle>
        <div className="space-y-4 overflow-hidden rounded-3xl p-5 pt-16">
          <div className="rounded-2xl border border-border/45 bg-background/35 px-4 py-3.5">
            <h2 className="truncate text-base font-bold text-foreground">{displayTitle}</h2>
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
              className="h-10 rounded-xl font-bold shadow-none focus-visible:ring-primary/25 focus-visible:ring-offset-0"
            >
              <RotateCcw size={16} />
              Lanjutkan
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onStartNew}
              className="h-10 rounded-xl border-border/50 bg-background/35 font-bold focus-visible:ring-primary/25 focus-visible:ring-offset-0"
            >
              <Plus size={16} />
              Mulai Baru
            </Button>
          </div>

          <Button type="button" variant="ghost" asChild className="h-9 w-full rounded-xl">
            <Link to="/dashboard/history" className="font-semibold text-muted-foreground">
              <History size={15} />
              Riwayat
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
