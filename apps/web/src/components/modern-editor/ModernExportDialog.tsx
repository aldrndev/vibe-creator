import { AlertTriangle, CheckCircle2, Download, FileVideo2, Loader2, Pencil } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Progress,
} from '@/components/ui';
import {
  getModernExportPhaseLabel,
  type ModernExportPhase,
  type ModernExportResult,
} from '@/hooks/use-modern-export';

interface ModernExportDialogProps {
  readonly error: string | null;
  readonly isExporting: boolean;
  readonly notice: string | null;
  readonly onDownload: () => void;
  readonly onEditBack: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRetry: () => void;
  readonly open: boolean;
  readonly phase: ModernExportPhase;
  readonly progress: number;
  readonly result: ModernExportResult | null;
}

/**
 * Focused export progress and result dialog for Video Studio.
 */
export function ModernExportDialog({
  error,
  isExporting,
  notice,
  onDownload,
  onEditBack,
  onOpenChange,
  onRetry,
  open,
  phase,
  progress,
  result,
}: ModernExportDialogProps) {
  const progressPercent = Math.round(progress * 100);
  const isCompleted = phase === 'completed' && result;
  const isFailed = phase === 'failed' || Boolean(error);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton={isExporting}
        className="grid max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl border-border/50 bg-card/95 p-0 backdrop-blur-2xl sm:max-w-3xl"
      >
        <DialogHeader className="border-b border-border/40 p-5 pr-14">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              {(() => {
                if (isCompleted) {
                  return <CheckCircle2 size={22} />;
                }
                if (isFailed) {
                  return <AlertTriangle size={22} />;
                }
                return <FileVideo2 size={22} />;
              })()}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-black tracking-tight sm:text-2xl">
                {(() => {
                  if (isCompleted) return 'Video siap';
                  if (isFailed) return 'Export gagal';
                  return 'Export video';
                })()}
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm font-semibold">
                {(() => {
                  if (isCompleted) return 'Preview hasil sudah tersedia.';
                  if (isFailed) return 'Cek pesan error lalu coba export lagi.';
                  return getModernExportPhaseLabel(phase);
                })()}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 space-y-5 overflow-y-auto p-5">
          {!isCompleted && !isFailed && (
            <div
              className="rounded-2xl border border-border/40 bg-background/35 p-5"
              aria-live="polite"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-base font-black text-foreground">
                    {getModernExportPhaseLabel(phase)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    {notice ?? 'Progress mengikuti proses render di server.'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black tabular-nums text-primary">
                    {progressPercent}%
                  </span>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Loader2 size={22} className="animate-spin" />
                  </div>
                </div>
              </div>
              <Progress value={progressPercent} className="h-3 bg-muted/40" />
              <div className="mt-3 flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-5">
              <p className="text-sm font-black text-destructive">Export belum berhasil</p>
              <p className="mt-2 text-sm font-semibold text-destructive/80">
                {error ?? 'Export gagal diproses. Coba lagi atau cek asset yang digunakan.'}
              </p>
            </div>
          )}

          {isCompleted && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border/45 bg-black">
                <video
                  src={result.previewUrl}
                  controls
                  className="max-h-[44vh] w-full bg-black"
                  preload="metadata"
                >
                  <track kind="captions" />
                </video>
              </div>
              <div className="rounded-2xl border border-border/40 bg-background/35 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  File export
                </p>
                <p className="mt-2 truncate text-sm font-black text-foreground">
                  {result.filename}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {result.urlExpiresAt
                    ? `Download tersedia sampai ${formatExportExpiry(result.urlExpiresAt)}.`
                    : 'Download tersedia sampai masa penyimpanan export berakhir.'}
                </p>
                {notice && (
                  <p className="mt-3 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-black text-primary">
                    {notice}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 border-t border-border/40 p-5 sm:flex-row">
          {(() => {
            if (isCompleted) {
              return (
                <>
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl sm:min-w-36"
                    onClick={onEditBack}
                  >
                    <Pencil size={16} />
                    Edit Kembali
                  </Button>
                  <Button
                    className="h-11 rounded-xl px-6 font-black sm:min-w-40"
                    onClick={onDownload}
                  >
                    <Download size={16} />
                    Download
                  </Button>
                </>
              );
            }
            if (isFailed) {
              return (
                <>
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl sm:min-w-36"
                    onClick={onEditBack}
                  >
                    Edit Kembali
                  </Button>
                  <Button className="h-11 rounded-xl px-6 font-black sm:min-w-36" onClick={onRetry}>
                    Coba Lagi
                  </Button>
                </>
              );
            }
            return (
              <div className="flex min-h-11 items-center rounded-xl border border-border/40 px-4 text-sm font-bold text-muted-foreground">
                Jangan tutup tab sampai proses selesai.
              </div>
            );
          })()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatExportExpiry(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
