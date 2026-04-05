import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Flame,
  Medal,
  Play,
  Sparkles,
  Trophy,
  Wand2,
} from 'lucide-react';
import { type SyntheticEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { cn } from '@/lib/utils';
import type { TrendingItem } from './trending.types';
import {
  getFormatLabel,
  getFreshnessLabel,
  getMetricSummary,
  getSignalLabel,
  getSourceLabel,
} from './trending-utils';

const THUMBNAIL_FALLBACK_SRC = 'https://placehold.co/600x400/1a1a1a/666?text=No+Thumbnail';
const THUMBNAIL_DEFAULT_SRC = '/placeholder-image.jpg';
const COPY_RESET_DELAY_MS = 2000;

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

  image.src = THUMBNAIL_FALLBACK_SRC;
}

function getDirectorTopicUrl(title: string): string {
  return `/director?topic=${encodeURIComponent(title)}`;
}

/**
 * Hero card for the top trending item.
 */
export function TrendingHero({ item }: Readonly<{ item: TrendingItem }>) {
  const navigate = useNavigate();
  const metric = getMetricSummary(item);

  return (
    <div className="relative group overflow-hidden rounded-3xl border border-yellow-500/30 bg-card/50 shadow-2xl shadow-yellow-900/10">
      <div
        className="absolute inset-0 scale-110 transform bg-cover bg-center opacity-30 blur-3xl transition-transform duration-[2s]"
        style={{ backgroundImage: `url(${item.thumbnailUrl})` }}
      />
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/90 to-transparent" />
      <div className="absolute inset-0 bg-linear-to-r from-background/80 via-transparent to-transparent" />

      <div className="relative flex flex-col items-start gap-8 p-6 md:flex-row md:items-end sm:p-10">
        <div className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-transform duration-700 ease-out group-hover:scale-[1.02] md:w-[480px] aspect-video">
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {getFormatLabel(item)}
              </span>
              {item.category ? (
                <span className="rounded-full border border-primary/20 bg-primary/20 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-sm">
                  {item.category}
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
                {getSourceLabel(item)}
              </span>
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
                {getFreshnessLabel(item.fetchedAt)}
              </span>
              {metric.value ? (
                <span className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500 backdrop-blur-sm">
                  <Flame size={12} className="fill-red-500" /> {metric.value} {metric.label}
                </span>
              ) : null}
            </div>

            <h2 className="bg-linear-to-r from-foreground to-foreground/80 bg-clip-text text-2xl font-black leading-tight tracking-tight text-foreground line-clamp-3 sm:text-4xl">
              {item.title}
            </h2>
            <p className="text-base text-muted-foreground line-clamp-2 md:w-3/4">
              {item.description}
            </p>
            <p className="text-sm font-medium text-white/70">{getSignalLabel(item)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              className="gap-2 rounded-xl bg-yellow-500 px-8 font-bold text-black shadow-lg shadow-yellow-500/20 hover:bg-yellow-400"
              onClick={() => navigate(getDirectorTopicUrl(item.title))}
            >
              <Wand2 size={18} />
              Buat Konten Ini
            </Button>
            {item.externalUrl ? (
              <Button
                size="lg"
                variant="outline"
                className="gap-2 rounded-xl border-white/10 backdrop-blur-sm hover:bg-white/5"
                asChild
              >
                <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
                  <Play size={18} /> Tonton Video
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Grid of rank 2-5 entries.
 */
export function TrendingBento({ items }: Readonly<{ items: TrendingItem[] }>) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item, index) => {
        const rank = item.rank ?? index + 2;
        const isSilver = rank === 2;
        const isBronze = rank === 3;
        const metric = getMetricSummary(item);

        return (
          <div
            key={item.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-500 hover:border-primary/30"
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
                  (() => {
                    if (isSilver) return 'border-white/50 bg-slate-200/90 text-slate-900';
                    if (isBronze) return 'border-white/50 bg-amber-100/90 text-amber-900';
                    return 'border-white/20 bg-black/60 text-white';
                  })(),
                )}
              >
                {isSilver || isBronze ? <Medal size={12} /> : null}#{rank}
              </div>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold leading-snug line-clamp-2 transition-colors group-hover:text-primary">
                  {item.title}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  <span>{getFormatLabel(item)}</span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span>{getSourceLabel(item)}</span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span>{getFreshnessLabel(item.fetchedAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                  <span className="flex items-center gap-1">
                    <Flame size={10} className="text-orange-500" />
                    {metric.value}
                  </span>
                  <span>•</span>
                  <span>{item.category ?? metric.label}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3 opacity-80 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2 h-8 px-2 text-xs text-muted-foreground hover:text-primary"
                  onClick={() => navigate(getDirectorTopicUrl(item.title))}
                >
                  <Wand2 size={12} className="mr-1.5" /> Pakai Ide
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-secondary/50 hover:bg-secondary"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Horizontal spotlight list for rank 6-20.
 */
export function TrendingBillboard({ items }: Readonly<{ items: TrendingItem[] }>) {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollAmount = 280;

  const scroll = (direction: 'left' | 'right') => {
    const element = scrollContainerRef.current;
    if (!element) {
      return;
    }

    const nextScrollLeft =
      element.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    element.scrollTo({
      left: nextScrollLeft,
      behavior: 'smooth',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Sparkles size={16} className="text-yellow-500" />
          Sorotan Top 20
        </h3>
        <div className="flex items-center gap-2">
          <span className="mr-2 text-xs text-muted-foreground">Naik Cepat</span>
          <button
            type="button"
            onClick={() => scroll('left')}
            className="rounded-full border border-border bg-card p-1.5 transition-colors hover:bg-accent"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="rounded-full border border-border bg-card p-1.5 transition-colors hover:bg-accent"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pt-2 pb-6 hide-scrollbar scroll-smooth"
        >
          {items.map((item, index) => {
            const rank = item.rank ?? index + 6;
            const metric = getMetricSummary(item);

            return (
              <button
                type="button"
                key={item.id}
                className="group relative w-[260px] shrink-0 cursor-pointer snap-start"
                onClick={() => navigate(getDirectorTopicUrl(item.title))}
              >
                <div
                  className="absolute -bottom-6 -left-4 z-0 select-none text-[120px] font-black text-transparent opacity-10"
                  style={{ WebkitTextStroke: '2px rgba(255,255,255,0.2)' }}
                >
                  {rank}
                </div>

                <div className="relative z-10 aspect-4/5 overflow-hidden rounded-xl border border-border/40 bg-card shadow-lg transition-transform duration-300 group-hover:-translate-y-2">
                  <img
                    src={item.thumbnailUrl ?? THUMBNAIL_DEFAULT_SRC}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover opacity-60 transition-opacity duration-500 group-hover:opacity-100"
                    onError={handleThumbnailError}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />

                  <div className="absolute right-0 bottom-0 left-0 p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="w-fit rounded border border-primary/20 bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary backdrop-blur-sm">
                        TOP 20
                      </span>
                      <span className="w-fit rounded border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-bold text-white/80 backdrop-blur-sm">
                        {getFormatLabel(item)}
                      </span>
                    </div>
                    <h4 className="mb-2 text-sm font-semibold leading-tight text-white line-clamp-3">
                      {item.title}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-white/60">
                      <span>
                        {metric.value} {metric.label}
                      </span>
                      <span>{getFreshnessLabel(item.fetchedAt)}</span>
                      <Wand2 size={12} className="text-white/80" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact feed card for items outside the spotlight.
 */
export function TrendingFeedItem({ item, index }: Readonly<{ item: TrendingItem; index: number }>) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const metric = getMetricSummary(item);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.title);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), COPY_RESET_DELAY_MS);
  };

  return (
    <div className="group flex items-start gap-4 rounded-xl border border-transparent p-3 transition-colors hover:border-border/30 hover:bg-accent/5">
      <span className="w-8 shrink-0 pt-1 text-center text-lg font-bold text-muted-foreground/30 transition-colors group-hover:text-primary">
        {item.rank ?? index}
      </span>

      <div className="relative w-[100px] shrink-0 overflow-hidden rounded-lg bg-muted aspect-video">
        <img
          src={item.thumbnailUrl ?? THUMBNAIL_DEFAULT_SRC}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={handleThumbnailError}
        />
      </div>

      <div className="min-w-0 flex-1 py-1">
        <button
          type="button"
          className="cursor-pointer text-left text-sm font-medium leading-snug text-foreground transition-colors line-clamp-2 group-hover:text-primary"
          onClick={() => navigate(getDirectorTopicUrl(item.title))}
        >
          {item.title}
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground/70">
          <span>{getFormatLabel(item)}</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>{item.category ?? getSourceLabel(item)}</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>{getFreshnessLabel(item.fetchedAt)}</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span className="flex items-center gap-1">
            <Flame size={10} /> {metric.value} {metric.label}
          </span>
        </div>
      </div>

      <div className="flex gap-1 self-center px-2 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={() => {
            void handleCopy();
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={() => navigate(getDirectorTopicUrl(item.title))}
        >
          <Wand2 size={14} />
        </Button>
      </div>
    </div>
  );
}

/**
 * Loading state matching the trending page layout.
 */
export function TrendingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[400px] w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-[200px] rounded-2xl" />
        <Skeleton className="h-[200px] rounded-2xl" />
      </div>
    </div>
  );
}
