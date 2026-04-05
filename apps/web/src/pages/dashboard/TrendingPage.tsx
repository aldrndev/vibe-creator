import { useQuery } from '@tanstack/react-query';
import {
  Clapperboard,
  Flame,
  Hash,
  LayoutGrid,
  type LucideIcon,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  XCircle,
} from 'lucide-react';
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
import {
  filterTrendingItems,
  getTrendingFormat,
  type TrendingFormatFilter,
} from './trending/trending-utils';

const TRENDING_REGION = 'ID';
const TRENDING_LIMIT = '50';
const TRENDING_STALE_TIME_MS = 1000 * 60 * 60;

interface FormatOption {
  readonly value: TrendingFormatFilter;
  readonly label: string;
  readonly icon: LucideIcon;
}

const FORMAT_OPTIONS: readonly FormatOption[] = [
  { value: 'all', label: 'Semua', icon: LayoutGrid },
  { value: 'video', label: 'Video', icon: Clapperboard },
  { value: 'search', label: 'Pencarian', icon: Search },
  { value: 'topic', label: 'Topik', icon: TrendingUp },
  { value: 'hashtag', label: 'Hashtag', icon: Hash },
];

function isFormatFilter(value: string | null): value is TrendingFormatFilter {
  return FORMAT_OPTIONS.some((option) => option.value === value);
}

async function fetchTrendingData(): Promise<TrendingResponse> {
  const searchParams = new URLSearchParams({
    region: TRENDING_REGION,
    limit: TRENDING_LIMIT,
  });

  const response = await api.get<TrendingResponse>(`/trending?${searchParams.toString()}`);

  if (!response.success) {
    throw new Error(response.error?.message ?? 'Failed to fetch');
  }

  return response.data;
}

export function TrendingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const formatParam = searchParams.get('format');
  const activeFormat: TrendingFormatFilter = isFormatFilter(formatParam) ? formatParam : 'all';

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['trending', 'snapshot'],
    queryFn: fetchTrendingData,
    staleTime: TRENDING_STALE_TIME_MS,
  });

  const snapshotItems = data?.items ?? [];
  const status = data?.status;
  const items = filterTrendingItems(snapshotItems, activeFormat, 'all');
  const heroItem = items[0];
  const bentoItems = items.slice(1, 5);
  const billboardItems = items.slice(5, 20);
  const feedItems = items.slice(20);
  const videoCount = snapshotItems.filter((item) => getTrendingFormat(item) === 'video').length;
  const searchTopicCount = snapshotItems.filter((item) =>
    ['search', 'topic', 'hashtag'].includes(getTrendingFormat(item)),
  ).length;
  const insightCards = [
    {
      label: 'Total Data',
      value: snapshotItems.length.toString(),
      detail: 'Jumlah data pada pembaruan terbaru',
      icon: LayoutGrid,
    },
    {
      label: 'Video Trending',
      value: `${videoCount} video`,
      detail: 'Data video dari YouTube',
      icon: Clapperboard,
    },
    {
      label: 'Pencarian & Topik',
      value: searchTopicCount.toString(),
      detail: 'Gabungan pencarian, topik, dan hashtag',
      icon: Search,
    },
  ];

  const handleFormatChange = (format: TrendingFormatFilter) => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (format === 'all') {
      nextSearchParams.delete('format');
    } else {
      nextSearchParams.set('format', format);
    }

    setSearchParams(nextSearchParams);
  };

  return (
    <PageTransition className="pb-20 lg:pb-10">
      <div className="max-w-250 mx-auto space-y-8 md:space-y-12 px-4 md:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <TrendingUp className="text-primary" size={28} />
              Viral Ideas
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-500" />
              Temukan ide konten paling viral saat ini
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Info Bar Compact (Hidden on mobile) */}
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/40">
              <span className="flex items-center gap-1">Sumber: YouTube + Google Trends</span>
              <span className="w-px h-3 bg-border" />
              <div className="group relative cursor-help">
                <span className="border-b border-dashed border-muted-foreground/50">
                  Diperbarui:{' '}
                  {status?.lastSuccessAt
                    ? new Date(status.lastSuccessAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </span>
                <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Server melakukan refresh otomatis setiap 1 jam.
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
              <span>{isFetching ? 'Memuat ulang...' : 'Muat Ulang Data'}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {insightCards.map(({ label, value, detail, icon: Icon }) => (
            <Card key={label} className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardBody className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon size={18} />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="text-lg font-black tracking-tight text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{detail}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="rounded-3xl border border-border/40 bg-card/40 p-3 md:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Filter Data
              </p>
              <p className="text-sm text-muted-foreground">
                Pilih jenis data yang ingin Anda fokuskan.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {FORMAT_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => handleFormatChange(value)}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                    activeFormat === value
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>
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
              Tidak ada data untuk kombinasi filter ini
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Coba ganti format untuk melihat sinyal lain
            </p>
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
                  Tren Lainnya
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
