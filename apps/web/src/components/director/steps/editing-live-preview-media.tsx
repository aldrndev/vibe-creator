import { Loader2, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LivePreviewMediaProps {
  readonly previewVideoUrl: string | null;
  readonly posterUrl: string | null;
  readonly previewError: string | null;
  readonly showGeneratingState: boolean;
  readonly previewProgressPercent: number;
  readonly mediaClass: string;
  readonly canPlayPreview: boolean;
  readonly onPlay: () => void;
}

export function LivePreviewMedia({
  previewVideoUrl,
  posterUrl,
  previewError,
  showGeneratingState,
  previewProgressPercent,
  mediaClass,
  canPlayPreview,
  onPlay,
}: LivePreviewMediaProps) {
  if (canPlayPreview && previewVideoUrl) {
    return (
      <>
        {posterUrl ? (
          <img
            src={posterUrl}
            alt="Thumbnail video akhir"
            className={cn('w-full h-full object-contain rounded-[inherit]', mediaClass)}
          />
        ) : (
          <div className={cn('w-full h-full rounded-[inherit] bg-black/80', mediaClass)} />
        )}

        {!showGeneratingState && (
          <button
            type="button"
            onClick={onPlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-16 h-16 rounded-[1.25rem] border border-white/20 bg-black/35 text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-black/50 flex items-center justify-center shadow-xl"
            aria-label="Putar Video Akhir"
          >
            <Play className="w-7 h-7 fill-white translate-x-[2px]" />
          </button>
        )}
        {showGeneratingState ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <div className="rounded-2xl border border-primary/20 bg-card/90 px-4 py-3 text-center backdrop-blur-md">
              <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                <Loader2 size={16} className="animate-spin text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Menyiapkan preview</p>
              <p className="mt-1 text-xs text-muted-foreground">{previewProgressPercent}%</p>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (showGeneratingState) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt="Thumbnail clip yang sedang digenerate"
            className={cn('absolute inset-0 h-full w-full object-contain opacity-40', mediaClass)}
          />
        ) : null}
        <div className="relative rounded-3xl border border-white/10 bg-black/60 p-6 text-center backdrop-blur-xl max-w-xs w-full shadow-2xl flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black uppercase tracking-wider text-white">
              Menyiapkan Preview
            </p>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
              Mohon tunggu sebentar
            </p>
          </div>
          <div className="w-full mt-1.5 space-y-2">
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-orange-500 to-rose-500 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                style={{ width: `${previewProgressPercent}%` }}
              />
            </div>
            <p className="text-xs font-black text-primary tracking-wide tabular-nums">
              {previewProgressPercent}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-6 text-center">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt="Thumbnail clip"
            className={cn('absolute inset-0 h-full w-full object-contain opacity-30', mediaClass)}
          />
        ) : null}
        <div className="relative rounded-3xl border border-destructive/20 bg-black/65 p-6 backdrop-blur-xl shadow-2xl max-w-xs w-full flex flex-col items-center gap-3.5">
          <div className="relative flex items-center justify-center h-12 w-12 rounded-2xl border border-rose-500/25 bg-rose-500/10 text-rose-400">
            <X size={20} strokeWidth={2.5} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black uppercase tracking-wider text-white">
              Gagal Membuat Preview
            </p>
            <p className="text-xs font-medium text-rose-300/80 leading-relaxed">{previewError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-6 text-center">
      {posterUrl ? (
        <img
          src={posterUrl}
          alt="Thumbnail clip"
          className={cn('absolute inset-0 h-full w-full object-contain opacity-40', mediaClass)}
        />
      ) : null}
      <div className="relative rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl shadow-2xl max-w-xs w-full flex flex-col items-center gap-3">
        <div className="relative flex items-center justify-center h-12 w-12 rounded-2xl border border-white/10 bg-white/5">
          <Loader2 size={20} className="animate-spin text-white/40" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-black uppercase tracking-wider text-white">Memulai Proses</p>
          <p className="text-xs font-semibold text-white/60 leading-relaxed">
            Sistem sedang menyiapkan rendering video otomatis...
          </p>
        </div>
      </div>
    </div>
  );
}
