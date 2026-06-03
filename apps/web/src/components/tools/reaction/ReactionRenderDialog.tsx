import { AlertTriangle, CheckCircle2, Download, Loader2, Pencil, Video } from 'lucide-react';
import { Button, Dialog, DialogContent, Progress } from '@/components/ui';
import type { ReactionRenderPhase, ReactionRenderResult } from '@/hooks/useReactionCreator';

interface ReactionRenderDialogProps {
  readonly open: boolean;
  readonly phase: ReactionRenderPhase;
  readonly progress: number;
  readonly error: string | null;
  readonly notice: string | null;
  readonly result: ReactionRenderResult | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDownload: () => void;
  readonly onEditBack: () => void;
  readonly onRetry: () => void;
}

export function ReactionRenderDialog({
  open,
  phase,
  progress,
  error,
  notice,
  result,
  onOpenChange,
  onDownload,
  onEditBack,
  onRetry,
}: ReactionRenderDialogProps) {
  const working = phase === 'queued' || phase === 'rendering';
  const ready = phase === 'ready' && result;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton={working}
        className="grid max-h-[90vh] max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl border-border/55 bg-card p-0"
      >
        <div className="flex items-center gap-4 border-b border-border/45 p-5 pr-14">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            {ready ? <CheckCircle2 /> : phase === 'failed' ? <AlertTriangle /> : <Video />}
          </div>
          <div>
            <h2 className="text-xl font-black">
              {ready ? 'Reaction siap' : phase === 'failed' ? 'Render gagal' : 'Render reaction'}
            </h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {ready
                ? 'Preview hasil sudah tersedia.'
                : working
                  ? getPhaseLabel(phase)
                  : 'Coba render ulang.'}
            </p>
          </div>
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto p-5">
          {working ? (
            <div className="space-y-4 rounded-xl border border-border/45 bg-muted/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black">{getPhaseLabel(phase)}</p>
                <div className="flex items-center gap-2 text-xl font-black text-primary">
                  {Math.round(progress)}%
                  <Loader2 className="animate-spin" size={20} />
                </div>
              </div>
              <Progress value={progress} className="h-3" />
              <p className="text-xs font-semibold text-muted-foreground">
                {notice ?? 'Progress mengikuti worker render di server.'}
              </p>
            </div>
          ) : null}

          {phase === 'failed' ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm font-semibold text-destructive">
              {error ?? 'Render belum berhasil. Coba lagi.'}
            </div>
          ) : null}

          {ready ? (
            <>
              <div className="overflow-hidden rounded-xl border border-border/50 bg-black">
                <video src={result.previewUrl} controls className="max-h-[52vh] w-full bg-black">
                  <track kind="captions" />
                </video>
              </div>
              <div className="rounded-xl border border-border/45 bg-muted/10 p-4">
                <p className="truncate text-sm font-black">{result.filename}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {result.urlExpiresAt
                    ? `Download tersedia sampai ${new Intl.DateTimeFormat('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(result.urlExpiresAt))}.`
                    : 'Download tersedia selama masa penyimpanan hasil render.'}
                </p>
                {notice ? <p className="mt-3 text-xs font-bold text-primary">{notice}</p> : null}
              </div>
            </>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-border/45 p-5">
          {ready ? (
            <>
              <Button variant="outline" className="h-11 rounded-xl" onClick={onEditBack}>
                <Pencil size={16} />
                Kembali Edit
              </Button>
              <Button className="h-11 rounded-xl px-6 font-black" onClick={onDownload}>
                <Download size={16} />
                Download
              </Button>
            </>
          ) : phase === 'failed' ? (
            <>
              <Button variant="outline" onClick={onEditBack}>
                Kembali Edit
              </Button>
              <Button onClick={onRetry}>Coba Lagi</Button>
            </>
          ) : (
            <p className="text-sm font-semibold text-muted-foreground">
              Render tetap berjalan di server.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getPhaseLabel(phase: ReactionRenderPhase): string {
  return phase === 'queued' ? 'Menunggu antrian render...' : 'Menggabungkan reaction...';
}
