import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DEFAULT_TRENDING_REGION,
  getTrendingRegionLabel,
  isTrendingRegionCode,
  TRENDING_MAX_RESULTS,
  TRENDING_REGIONS,
  type TrendingRegionCode,
} from '@vibe-creator/shared';
import { Clapperboard, Flame, RefreshCw, Sparkles, TrendingUp, Wand2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { PageTransition } from '@/components/ui/PageTransition';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import {
  TrendingBento,
  TrendingBillboard,
  TrendingFeedItem,
  TrendingHero,
  TrendingSkeleton,
} from './trending/TrendingSections';
import type { TrendingResponse } from './trending/trending.types';

const TRENDING_STALE_TIME_MS = 1000 * 60 * 60;
const REFRESH_FEEDBACK_TIMEOUT_MS = 4000;

interface TrendingRefreshResponse {
  readonly jobId: string;
  readonly message: string;
}

function getTopCategory(items: TrendingResponse['items']): string {
  const categoryCounts = new Map<string, number>();

  for (const item of items) {
    if (!item.category) {
      continue;
    }

    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
  }

  const [topCategory] = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0] ?? [];
  return topCategory ?? 'Video';
}

function getUpdateTimeLabel(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return '-';
  }

  return new Date(timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRefreshErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Refresh data sumber gagal.';

  if (message.toLowerCase().includes('cooldown')) {
    return 'Refresh data sumber masih cooldown. Coba lagi nanti.';
  }

  return message;
}

function getRegionFromSearch(searchParams: URLSearchParams): TrendingRegionCode {
  const region = searchParams.get('region')?.toUpperCase();
  return region && isTrendingRegionCode(region) ? region : DEFAULT_TRENDING_REGION;
}

async function fetchTrendingData(region: TrendingRegionCode): Promise<TrendingResponse> {
  const searchParams = new URLSearchParams({
    region,
    type: 'VIDEO',
    limit: String(TRENDING_MAX_RESULTS),
  });

  const response = await api.get<TrendingResponse>(`/trending?${searchParams.toString()}`);

  if (!response.success) {
    throw new Error(response.error?.message ?? 'Failed to fetch');
  }

  return response.data;
}

export function TrendingPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const [searchParams, setSearchParams] = useSearchParams();
  const activeRegion = getRegionFromSearch(searchParams);
  const [refreshFeedback, setRefreshFeedback] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['trending', 'videos', activeRegion],
    queryFn: () => fetchTrendingData(activeRegion),
    staleTime: TRENDING_STALE_TIME_MS,
  });

  const sourceRefreshMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<TrendingRefreshResponse>('/trending/refresh', {
        region: activeRegion,
        mode: 'full',
      });

      if (!response.success) {
        throw new Error(response.error?.message ?? 'Refresh data sumber gagal.');
      }

      return response.data;
    },
    onSuccess: async () => {
      setRefreshFeedback('Refresh data sumber masuk antrean.');
      await queryClient.invalidateQueries({ queryKey: ['trending', 'videos', activeRegion] });
      globalThis.setTimeout(() => setRefreshFeedback(null), REFRESH_FEEDBACK_TIMEOUT_MS);
    },
    onError: (error) => {
      setRefreshFeedback(getRefreshErrorMessage(error));
      globalThis.setTimeout(() => setRefreshFeedback(null), REFRESH_FEEDBACK_TIMEOUT_MS);
    },
  });

  const items = data?.items ?? [];
  const status = data?.status;
  const metadata = data?.metadata;
  const regionLabel = metadata?.regionLabel ?? getTrendingRegionLabel(activeRegion);
  const lastUpdatedAt = metadata?.lastUpdatedAt ?? status?.lastSuccessAt;
  const latestUpdateLabel = getUpdateTimeLabel(lastUpdatedAt);
  const heroItem = items[0];
  const bentoItems = items.slice(1, 5);
  const billboardItems = items.slice(5, 20);
  const feedItems = items.slice(20, TRENDING_MAX_RESULTS);
  const topCategory = getTopCategory(items);
  const returnedCount = metadata?.returnedCount ?? items.length;
  const maxResults = metadata?.maxResults ?? TRENDING_MAX_RESULTS;
  const insightCards = [
    {
      label: 'Video Tersedia',
      value: `${returnedCount}/${maxResults}`,
      detail: `Top trending YouTube ${regionLabel}`,
      icon: Clapperboard,
    },
    {
      label: 'Kategori Dominan',
      value: topCategory,
      detail: 'Tema video yang paling sering muncul',
      icon: Flame,
    },
    {
      label: 'Siap Jadi Short',
      value: `${returnedCount} ide`,
      detail: 'Klik Buat Short untuk impor ide dan link video',
      icon: Wand2,
    },
  ];

  const handleRegionChange = (value: string) => {
    if (!isTrendingRegionCode(value)) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    if (value === DEFAULT_TRENDING_REGION) {
      nextSearchParams.delete('region');
    } else {
      nextSearchParams.set('region', value);
    }

    setSearchParams(nextSearchParams);
  };

  const handleRefresh = () => {
    if (isAdmin) {
      sourceRefreshMutation.mutate();
      return;
    }

    void refetch();
  };

  return (
    <PageTransition className="pb-16 lg:pb-6">
      <div className="mx-auto max-w-250 space-y-7 px-4 md:space-y-10 md:px-0">
        <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              <TrendingUp className="text-primary" size={26} />
              Viral Ideas
            </h1>
            <p className="flex items-center gap-2 text-xs text-muted-foreground md:text-sm">
              <Sparkles size={14} className="text-yellow-500" />
              Temukan ide konten video paling viral dari YouTube
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <div className="hidden h-9 items-center gap-2 rounded-xl border border-border/40 bg-muted/40 px-3 text-xs text-muted-foreground md:flex">
              <span>YouTube</span>
              <span className="h-3 w-px bg-border" />
              <span>{regionLabel}</span>
              <span className="h-3 w-px bg-border" />
              <span>{latestUpdateLabel}</span>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <Select value={activeRegion} onValueChange={handleRegionChange}>
                <SelectTrigger className="h-9 flex-1 rounded-xl bg-card/60 text-sm font-bold sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRENDING_REGIONS.map((region) => (
                    <SelectItem key={region.code} value={region.code}>
                      {region.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0 justify-center gap-2"
                onClick={handleRefresh}
                disabled={isFetching || sourceRefreshMutation.isPending}
              >
                <RefreshCw
                  size={14}
                  className={cn((isFetching || sourceRefreshMutation.isPending) && 'animate-spin')}
                />
                <span className="hidden sm:inline">
                  {isFetching || sourceRefreshMutation.isPending
                    ? 'Memuat...'
                    : isAdmin
                      ? 'Refresh Data Sumber'
                      : 'Refresh Tampilan'}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {refreshFeedback ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
            {refreshFeedback}
          </div>
        ) : null}

        {status?.status && status.status !== 'ok' ? (
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm font-semibold text-yellow-500">
            Data YouTube sedang memakai fallback cadangan. Refresh sumber tersedia untuk admin.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {insightCards.map(({ label, value, detail, icon: Icon }) => (
            <Card key={label} className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardBody className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="truncate text-lg font-black tracking-tight text-foreground">
                    {value}
                  </p>
                  <p className="text-xs text-muted-foreground">{detail}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {isError ? (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardBody className="p-6 text-center">
              <XCircle className="mx-auto mb-3 text-red-500" size={32} />
              <p className="text-sm font-medium text-red-500">Gagal memuat data trending.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  void refetch();
                }}
              >
                Coba Lagi
              </Button>
            </CardBody>
          </Card>
        ) : null}

        {isLoading ? <TrendingSkeleton /> : null}

        {!isLoading && !isError && items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/10 px-6 py-20 text-center">
            <h3 className="text-lg font-medium text-muted-foreground">
              Data negara ini belum tersedia.
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Coba lagi setelah pembaruan berikutnya.
            </p>
          </div>
        ) : null}

        {!isLoading && !isError && items.length > 0 ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 md:space-y-12">
            <section className="space-y-4">
              {heroItem ? <TrendingHero item={heroItem} /> : null}
              {bentoItems.length > 0 ? <TrendingBento items={bentoItems} /> : null}
            </section>

            {billboardItems.length > 0 ? (
              <section>
                <TrendingBillboard items={billboardItems} />
              </section>
            ) : null}

            {feedItems.length > 0 ? (
              <section className="space-y-4">
                <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <Flame size={16} className="text-orange-500" />
                    Tren Lainnya
                  </h3>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Rank #21-{returnedCount}
                  </p>
                </div>
                <div className="space-y-2">
                  {feedItems.map((item, index) => (
                    <TrendingFeedItem key={item.id} item={item} index={index + 21} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageTransition>
  );
}
