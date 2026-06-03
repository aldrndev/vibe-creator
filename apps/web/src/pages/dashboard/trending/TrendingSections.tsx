import { ExternalLink, Flame, Medal, Sparkles, Trophy, Wand2 } from 'lucide-react';
import type { SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { buildTrendingDirectorUrl } from '@/lib/ai-director-trending-context';
import { cn } from '@/lib/utils';
import type { TrendingItem } from './trending.types';
import { getFormatLabel, getMetricSummary, getSourceLabel } from './trending-utils';

const THUMBNAIL_DEFAULT_SRC =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 338"%3E%3Crect width="600" height="338" fill="%2318171d"/%3E%3Cpath d="M250 119h100v100H250z" rx="14" fill="%2327242d"/%3E%3Cpath d="M282 149v40l42-20-42-20z" fill="%23ff4b1f"/%3E%3Ctext x="300" y="265" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="%239b97a3"%3EYouTube Trending%3C/text%3E%3C/svg%3E';

function handleThumbnailError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  const { src } = image;

  if (src.includes('img.youtube.com')) {
    if (src.includes('maxresdefault.jpg')) {
      image.src = src.replace('maxresdefault.jpg', 'hqdefault.jpg');
      return;
    }

    if (src.includes('hqdefault.jpg')) {
      image.src = src.replace('hqdefault.jpg', 'mqdefault.jpg');
      return;
    }
  }

  image.src = THUMBNAIL_DEFAULT_SRC;
}

function getDirectorTopicUrl(item: TrendingItem): string {
  return buildTrendingDirectorUrl({
    title: item.title,
    sourceUrl: item.externalUrl,
    thumbnailUrl: item.thumbnailUrl,
    region: item.region,
    rank: item.rank,
  });
}

function getWhyTrendingText(
  item: TrendingItem,
  metric: ReturnType<typeof getMetricSummary>,
): string {
  const category = item.category ?? getFormatLabel(item);

  if (metric.value) {
    return `Kenapa menarik: ${metric.value} ${metric.label} di kategori ${category}.`;
  }

  return `Kenapa menarik: sedang naik di kategori ${category}.`;
}

function TrendingMeta({ item }: Readonly<{ item: TrendingItem }>) {
  const metric = getMetricSummary(item);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs leading-relaxed text-muted-foreground/75">
      <span>{getFormatLabel(item)}</span>
      <span className="h-1 w-1 rounded-full bg-border" />
      <span>{item.category ?? getSourceLabel(item)}</span>
      <span className="h-1 w-1 rounded-full bg-border" />
      <span className="flex items-center gap-1 whitespace-nowrap">
        <Flame size={10} className="text-orange-500" />
        {metric.value} {metric.label}
      </span>
    </div>
  );
}

interface TrendingActionsProps {
  readonly item: TrendingItem;
  readonly compact?: boolean;
  readonly tone?: 'primary' | 'quiet' | 'minimal';
}

function TrendingActions({ item, compact = false, tone = 'primary' }: TrendingActionsProps) {
  const navigate = useNavigate();
  const isPrimary = tone === 'primary';
  const isMinimal = tone === 'minimal';
  const actionSize = compact ? 'sm' : 'default';

  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', compact && 'gap-2')}>
      <Button
        size={actionSize}
        variant={isPrimary ? 'default' : 'outline'}
        className={cn(
          'gap-2 rounded-xl font-bold',
          compact && 'h-8 px-3 text-xs',
          tone === 'quiet' &&
            'border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary',
          isMinimal &&
            'h-7 rounded-lg border-primary/20 bg-transparent px-2.5 text-[11px] text-primary shadow-none hover:bg-primary/10 hover:text-primary',
        )}
        onClick={() => navigate(getDirectorTopicUrl(item))}
      >
        <Wand2 size={isMinimal ? 12 : compact ? 13 : 16} />
        Buat Short
      </Button>
      {item.externalUrl ? (
        <Button
          variant="outline"
          size={isMinimal ? 'sm' : compact ? 'sm' : 'sm'}
          className={cn(
            'rounded-xl gap-2',
            compact && 'h-8 px-3 text-xs',
            isMinimal &&
              'h-7 rounded-lg border-border/50 px-2.5 text-[11px] text-muted-foreground shadow-none hover:text-foreground',
          )}
          asChild
        >
          <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={isMinimal ? 12 : 14} />
            Tonton
          </a>
        </Button>
      ) : null}
    </div>
  );
}

export function TrendingHero({ item }: Readonly<{ item: TrendingItem }>) {
  const metric = getMetricSummary(item);

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-yellow-500/30 bg-card/50 shadow-2xl shadow-yellow-900/10">
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center opacity-30 blur-3xl transition-transform duration-[2s]"
        style={{ backgroundImage: `url(${item.thumbnailUrl ?? THUMBNAIL_DEFAULT_SRC})` }}
      />
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/90 to-transparent" />
      <div className="absolute inset-0 bg-linear-to-r from-background/80 via-transparent to-transparent" />

      <div className="relative flex flex-col items-start gap-8 p-6 sm:p-10 md:flex-row md:items-end">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-transform duration-700 ease-out group-hover:scale-[1.02] md:w-[480px]">
          <img
            src={item.thumbnailUrl ?? THUMBNAIL_DEFAULT_SRC}
            alt={item.title}
            className="h-full w-full object-cover"
            onError={handleThumbnailError}
          />
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-extrabold text-black shadow-lg shadow-yellow-500/20">
            <Trophy size={16} className="fill-black" /> #1 TRENDING
          </div>
        </div>

        <div className="flex-1 space-y-6 pb-2">
          <div className="space-y-3">
            <TrendingMeta item={item} />
            <h2 className="bg-linear-to-r from-foreground to-foreground/80 bg-clip-text text-2xl font-black leading-tight tracking-tight text-foreground line-clamp-3 sm:text-4xl">
              {item.title}
            </h2>
            <p className="text-base text-muted-foreground line-clamp-2 md:w-3/4">
              {item.description}
            </p>
            <p className="text-sm font-medium text-white/70">{getWhyTrendingText(item, metric)}</p>
          </div>

          <TrendingActions item={item} />
        </div>
      </div>
    </div>
  );
}

export function TrendingBento({ items }: Readonly<{ items: TrendingItem[] }>) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item, index) => {
        const rank = item.rank ?? index + 2;
        const isSilver = rank === 2;
        const isBronze = rank === 3;

        return (
          <article
            key={item.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-primary/30"
          >
            <div className="relative aspect-video w-full overflow-hidden">
              <img
                src={item.thumbnailUrl ?? THUMBNAIL_DEFAULT_SRC}
                alt={item.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={handleThumbnailError}
              />
              <div className="absolute inset-0 bg-linear-to-t from-background/90 via-transparent to-transparent opacity-80" />
              <div
                className={cn(
                  'absolute top-3 left-3 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold shadow-lg backdrop-blur-md',
                  isSilver && 'border-white/50 bg-slate-200/90 text-slate-900',
                  isBronze && 'border-white/50 bg-amber-100/90 text-amber-900',
                  !isSilver && !isBronze && 'border-white/20 bg-black/60 text-white',
                )}
              >
                {isSilver || isBronze ? <Medal size={12} /> : null}#{rank}
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
              <button
                type="button"
                className="text-left text-lg font-bold leading-snug line-clamp-2 transition-colors hover:text-primary"
                onClick={() => navigate(getDirectorTopicUrl(item))}
              >
                {item.title}
              </button>
              <TrendingMeta item={item} />
              <div className="mt-4 border-border/50 border-t pt-3">
                <TrendingActions item={item} compact />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function TrendingBillboard({ items }: Readonly<{ items: TrendingItem[] }>) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Sparkles size={16} className="text-yellow-500" />
          Sorotan Top 20
        </h3>
        <p className="text-xs font-semibold text-muted-foreground">Rank #6-#20</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => {
          const rank = item.rank ?? index + 6;

          return (
            <article
              key={item.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border/45 bg-card/60 p-3 transition-all duration-300 hover:border-primary/25 hover:bg-card/85"
            >
              <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                <img
                  src={item.thumbnailUrl ?? THUMBNAIL_DEFAULT_SRC}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={handleThumbnailError}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute top-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-xs font-black text-white backdrop-blur">
                  #{rank}
                </span>
              </div>

              <div className="flex flex-1 flex-col pt-3">
                <div className="space-y-2.5">
                  <button
                    type="button"
                    className="text-left text-sm font-bold leading-snug line-clamp-2 transition-colors hover:text-primary"
                    onClick={() => navigate(getDirectorTopicUrl(item))}
                  >
                    {item.title}
                  </button>
                  <TrendingMeta item={item} />
                </div>
                <div className="mt-auto pt-4">
                  <div className="border-border/50 border-t pt-3">
                    <TrendingActions item={item} compact tone="quiet" />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function TrendingFeedItem({ item, index }: Readonly<{ item: TrendingItem; index: number }>) {
  const navigate = useNavigate();
  const rank = item.rank ?? index;

  return (
    <article className="group grid grid-cols-[1.75rem_96px_minmax(0,1fr)] gap-3 rounded-2xl border border-border/25 bg-card/30 p-2.5 transition-colors hover:border-primary/20 hover:bg-card/60 sm:grid-cols-[1.75rem_116px_minmax(0,1fr)_auto] sm:items-center">
      <span className="pt-1 text-center text-sm font-black text-muted-foreground/45 transition-colors group-hover:text-primary sm:pt-0">
        {rank}
      </span>

      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
        <img
          src={item.thumbnailUrl ?? THUMBNAIL_DEFAULT_SRC}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={handleThumbnailError}
        />
      </div>

      <div className="min-w-0 space-y-2 sm:max-w-[520px] sm:pr-4">
        <button
          type="button"
          className="text-left text-sm font-semibold leading-snug text-foreground transition-colors line-clamp-2 hover:text-primary"
          onClick={() => navigate(getDirectorTopicUrl(item))}
        >
          {item.title}
        </button>
        <TrendingMeta item={item} />
      </div>

      <div className="col-start-3 flex flex-wrap gap-1.5 border-border/50 border-t pt-2 sm:col-start-auto sm:justify-end sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
        <TrendingActions item={item} compact tone="minimal" />
      </div>
    </article>
  );
}

export function TrendingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[400px] w-full rounded-3xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-[220px] rounded-2xl" />
        <Skeleton className="h-[220px] rounded-2xl" />
      </div>
    </div>
  );
}
