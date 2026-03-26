import { useQuery } from '@tanstack/react-query';
import { Flame, LayoutGrid, RefreshCw, Sparkles, TrendingUp, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, CardBody } from '@/components/ui';
import { PageTransition } from '@/components/ui/PageTransition';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import {
  TrendingBento,
  TrendingBillboard,
  TrendingFeedItem,
  TrendingHero,
  TrendingSkeleton,
} from './trending/TrendingSections';
import type { TrendingResponse } from './trending/trending.types';

const TRENDING_REGION = 'ID';
const TRENDING_LIMIT = '50';
const TRENDING_STALE_TIME_MS = 1000 * 60 * 60;

async function fetchTrendingData(category?: string): Promise<TrendingResponse> {
  const searchParams = new URLSearchParams({
    region: TRENDING_REGION,
    limit: TRENDING_LIMIT,
  });

  if (category && category !== 'all') {
    searchParams.set('category', category);
  }

  const response = await api.get<TrendingResponse>(`/trending?${searchParams.toString()}`);

  if (!response.success) {
    throw new Error(response.error?.message ?? 'Failed to fetch');
  }

  return response.data;
}

export function TrendingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') ?? 'all';

  const { data: allData } = useQuery({
    queryKey: ['trending', 'categories'],
    queryFn: () => fetchTrendingData(),
    staleTime: TRENDING_STALE_TIME_MS,
  });

  const uniqueCategories = Array.from(
    new Set((allData?.items ?? []).map((item) => item.category).filter(Boolean)),
  ) as string[];

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['trending', 'display', activeCategory],
    queryFn: () => fetchTrendingData(activeCategory),
    staleTime: TRENDING_STALE_TIME_MS,
  });

  const items = data?.items ?? [];
  const status = data?.status;
  const heroItem = items[0];
  const bentoItems = items.slice(1, 5);
  const billboardItems = items.slice(5, 20);
  const feedItems = items.slice(20);

  const handleCategoryChange = (catId: string) => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (catId === 'all') {
      nextSearchParams.delete('category');
    } else {
      nextSearchParams.set('category', catId);
    }

    setSearchParams(nextSearchParams);
  };

  return (
    <PageTransition className="pb-20 lg:pb-10">
      <div className="max-w-[1000px] mx-auto space-y-8 md:space-y-12 px-4 md:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <TrendingUp className="text-primary" size={28} />
              Viral Magazine
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-500" />
              Temukan ide konten paling panas saat ini
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Info Bar Compact (Hidden on mobile) */}
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/40">
              <span className="flex items-center gap-1">Source: YouTube</span>
              <span className="w-px h-3 bg-border" />
              <div className="group relative cursor-help">
                <span className="border-b border-dashed border-muted-foreground/50">
                  Updated:{' '}
                  {status?.lastSuccessAt
                    ? new Date(status.lastSuccessAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </span>
                <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Server refresh otomatis setiap 1 jam.
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-center gap-2 sm:w-auto"
              onClick={() => {
                void refetch();
              }}
              disabled={isFetching}
            >
              <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />
              <span>{isFetching ? 'Syncing...' : 'Update Data'}</span>
            </Button>
          </div>
        </div>

        {/* Categories - Dynamic from data */}
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {/* All button */}
          <button
            type="button"
            onClick={() => handleCategoryChange('all')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              activeCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <LayoutGrid size={14} />
            All
          </button>

          {/* Dynamic categories from data */}
          {uniqueCategories.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Error State */}
        {isError && (
          <Card className="bg-red-500/5 border-red-500/20">
            <CardBody className="p-6 text-center">
              <XCircle className="mx-auto mb-3 text-red-500" size={32} />
              <p className="text-sm text-red-500 font-medium">Gagal memuat data trending.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                Coba Lagi
              </Button>
            </CardBody>
          </Card>
        )}

        {isLoading && <TrendingSkeleton />}

        {!isLoading && !isError && items.length === 0 && (
          <div className="py-20 text-center border border-dashed border-border rounded-3xl bg-muted/10">
            <h3 className="text-lg font-medium text-muted-foreground">
              Tidak ada data untuk kategori ini
            </h3>
            <p className="text-sm text-muted-foreground mt-2">Coba pilih kategori lain</p>
          </div>
        )}

        {/* MAIN LAYOUT */}
        {!isLoading && !isError && items.length > 0 && (
          <div className="space-y-12 md:space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* SECTION 1: THE KING & CHALLENGERS (#1 - #5) */}
            <section className="space-y-4">
              {heroItem && <TrendingHero item={heroItem} />}
              {bentoItems.length > 0 && <TrendingBento items={bentoItems} />}
            </section>

            {/* SECTION 2: BILLBOARD (#6 - #10) */}
            {billboardItems.length > 0 && (
              <section>
                <TrendingBillboard items={billboardItems} />
              </section>
            )}

            {/* SECTION 3: THE FEED (#11+) */}
            {feedItems.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-lg font-bold px-1 flex items-center gap-2">
                  <Flame size={16} className="text-orange-500" />
                  More Trending
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  {feedItems.map((item, i) => (
                    <TrendingFeedItem key={item.id} item={item} index={i + 21} />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 4: RESOURCES REMOVED (Direct Integration Implemented) */}
            <div className="h-4" />
          </div>
        )}
      </div>
    </PageTransition>
  );
}
