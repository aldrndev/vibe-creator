import { getTrendingRegionLabel, isTrendingRegionCode } from '@vibe-creator/shared';
import { ExternalLink, Link as LinkIcon, Sparkles, Wand2 } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import type { TrendingImportContext } from '@/lib/ai-director-trending-context';

interface TrendingImportEntryProps {
  readonly context: TrendingImportContext;
  readonly isSubmittingImport: boolean;
  readonly isWaitingForAsset: boolean;
  readonly isPreparingAnalysis: boolean;
  readonly downloadProgress: number;
  readonly onStartAnalysis: () => void;
  readonly onUseDefaultFlow: () => void;
}

function getRegionLabel(region: string | null): string | null {
  if (!region) {
    return null;
  }

  return isTrendingRegionCode(region) ? getTrendingRegionLabel(region) : region;
}

export function TrendingImportEntry({
  context,
  isSubmittingImport,
  isWaitingForAsset,
  isPreparingAnalysis,
  downloadProgress,
  onStartAnalysis,
  onUseDefaultFlow,
}: TrendingImportEntryProps) {
  const isBusy = isSubmittingImport || isWaitingForAsset || isPreparingAnalysis;
  const regionLabel = getRegionLabel(context.region);

  return (
    <div className="relative w-full">
      {isBusy ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 rounded-3xl bg-background/90 p-8 backdrop-blur-md">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary via-orange-500 to-rose-600 shadow-lg">
            <Wand2 className="h-7 w-7 animate-pulse text-white" />
          </div>
          <div className="w-full max-w-md space-y-3">
            <div className="flex items-end justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary animate-pulse" />
                Mengimpor video trending...
              </span>
              <span className="text-sm text-primary">{Math.round(downloadProgress)}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full border border-border/20 bg-muted shadow-inner">
              <div
                className="h-full bg-linear-to-r from-primary via-orange-500 to-rose-600 transition-all duration-300 ease-out"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
          <p className="text-center text-xs font-semibold text-muted-foreground">
            Setelah video siap, AI Director langsung masuk ke tahap analisis.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-stretch">
        <section className="overflow-hidden rounded-3xl border border-primary/20 bg-primary/10 text-left">
          <div className="relative aspect-video bg-muted">
            {context.thumbnailUrl ? (
              <img
                src={context.thumbnailUrl}
                alt={context.topic ?? 'YouTube trending video'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-card via-muted to-primary/10">
                <LinkIcon className="h-12 w-12 text-primary/70" />
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-background/90 via-transparent to-transparent" />
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
                YouTube Trending
              </Badge>
              {context.rank ? (
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
                >
                  #{context.rank}
                </Badge>
              ) : null}
              {regionLabel ? (
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
                >
                  {regionLabel}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
                <Sparkles size={14} />
                Link video sudah siap diimpor
              </p>
              <h2 className="text-2xl font-black leading-tight text-foreground line-clamp-3">
                {context.topic ?? 'Video YouTube Trending'}
              </h2>
              <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                Mulai analisis untuk mengimpor video ini. AI Director akan mencari potongan yang
                paling utuh dan siap dijadikan Short.
              </p>
            </div>

            <a
              href={context.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/50 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink size={13} />
              <span className="truncate">{context.sourceUrl}</span>
            </a>
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-3xl border border-border/50 bg-muted/10 p-5 text-left sm:p-6">
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/60">
                Siap dianalisis
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Durasi klip dipilih otomatis berdasarkan hook, kelengkapan kalimat, dan kualitas
                momen.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-border/50 border-t pt-5">
            <Button
              className="h-12 w-full rounded-2xl font-black"
              disabled={isBusy}
              isLoading={isSubmittingImport}
              onClick={onStartAnalysis}
            >
              <Wand2 size={18} />
              Mulai Analisis
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full rounded-2xl font-bold"
              disabled={isBusy}
              onClick={onUseDefaultFlow}
            >
              Gunakan Flow Biasa
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
