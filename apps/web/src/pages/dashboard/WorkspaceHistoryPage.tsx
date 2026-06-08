import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Download, FolderClock, History, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { WorkspaceHistoryThumbnail } from '@/components/workspace/workspace-history-thumbnail';
import { useMutableSearchParams } from '@/lib/route-search';
import { downloadAuthenticatedFile } from '@/services/api';
import {
  deleteWorkspace,
  duplicateWorkspace,
  getHistoryWorkspaceDisplayTitle,
  getWorkspaceContinuePath,
  getWorkspaceEditedLabel,
  getWorkspaceExpiryLabel,
  getWorkspaceExportDownloadPath,
  listRecentWorkspaces,
  type WorkspaceItem,
  type WorkspaceTool,
} from '@/services/workspace-api';

type HistoryFilter = 'all' | WorkspaceTool | 'expired';

const allHistoryFilter = { value: 'all', label: 'Semua' } as const;

const filters: Array<{ value: HistoryFilter; label: string }> = [
  allHistoryFilter,
  { value: 'ai-director', label: 'AI Director' },
  { value: 'video-studio', label: 'Video Studio' },
  { value: 'loop-creator', label: 'Loop Creator' },
  { value: 'reaction-video', label: 'Reaction' },
  { value: 'live-stream', label: 'Live Stream' },
  { value: 'exports', label: 'Export' },
  { value: 'expired', label: 'Berakhir' },
];

function isHistoryFilter(value: string): value is HistoryFilter {
  return filters.some((item) => item.value === value);
}
const loadingCardIds = [
  'history-loading-1',
  'history-loading-2',
  'history-loading-3',
  'history-loading-4',
];
const historyMonthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

function getToolLabel(item: WorkspaceItem): string {
  if (item.tool === 'ai-director') return 'AI Director';
  if (item.tool === 'video-studio') return 'Video Studio';
  if (item.tool === 'loop-creator') return 'Loop Creator';
  if (item.tool === 'reaction-video') return 'Reaction';
  if (item.tool === 'live-stream') return 'Live Stream';
  return 'Export';
}

function isEndedItem(item: WorkspaceItem): boolean {
  return (
    item.lifecycleStatus === 'EXPIRED' ||
    item.lifecycleStatus === 'DELETED' ||
    item.lifecycleStatus === 'DOWNLOAD_EXPIRED'
  );
}

function isAvailableItem(item: WorkspaceItem): boolean {
  if (isEndedItem(item)) {
    return false;
  }

  return true;
}

function getStatusLabel(item: WorkspaceItem): string {
  if (item.lifecycleStatus === 'ACTIVE') return 'Aktif';
  if (item.lifecycleStatus === 'COMPLETED') {
    return item.kind === 'export' ? 'Download siap' : 'Selesai';
  }
  if (item.lifecycleStatus === 'DOWNLOAD_EXPIRED') return 'Download berakhir';
  if (item.lifecycleStatus === 'DELETED') return 'Dihapus';
  return 'Berakhir';
}

function canDownloadExport(item: WorkspaceItem): boolean {
  return Boolean(getWorkspaceExportDownloadPath(item));
}

function downloadExport(item: WorkspaceItem): void {
  const url = getWorkspaceExportDownloadPath(item);
  if (!url) {
    return;
  }

  void downloadAuthenticatedFile(url, `${getHistoryWorkspaceDisplayTitle(item)}.mp4`);
}

function isWorkspaceProject(item: WorkspaceItem): boolean {
  return (
    item.kind === 'ai-director' ||
    item.kind === 'video-studio' ||
    item.kind === 'loop-creator' ||
    item.kind === 'reaction-video' ||
    item.kind === 'live-stream'
  );
}

function getDuplicatedWorkspacePath(item: WorkspaceItem, workspaceId: string): string {
  if (item.kind === 'ai-director') {
    return `/tools/ai-director?session=${workspaceId}`;
  }

  if (item.kind === 'loop-creator') {
    return `/tools/loop-creator?session=${workspaceId}`;
  }

  if (item.kind === 'reaction-video') {
    return `/tools/reaction?session=${workspaceId}`;
  }

  if (item.kind === 'live-stream') {
    return `/tools/live-stream?session=${workspaceId}`;
  }

  return `/tools/video-studio?session=${workspaceId}`;
}

function getRelatedExportInfo(
  availableExport: WorkspaceItem | undefined,
  expiredExportCount: number,
): string | null {
  if (availableExport) {
    return getDownloadAvailableUntilLabel(availableExport);
  }

  if (expiredExportCount > 0) {
    return 'Download sudah expired.';
  }

  return null;
}

function getDownloadAvailableUntilLabel(item: WorkspaceItem): string {
  if (!item.downloadExpiresAt) {
    return 'Download tersedia.';
  }

  const expiresAt = new Date(item.downloadExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    return 'Download tersedia.';
  }

  const day = expiresAt.getDate();
  const month = historyMonthLabels[expiresAt.getMonth()] ?? historyMonthLabels[0];
  const hours = String(expiresAt.getHours()).padStart(2, '0');
  const minutes = String(expiresAt.getMinutes()).padStart(2, '0');

  return `Download tersedia sampai ${day} ${month}, ${hours}:${minutes}`;
}

function groupExportsBySource(items: readonly WorkspaceItem[]): Map<string, WorkspaceItem[]> {
  const grouped = new Map<string, WorkspaceItem[]>();
  for (const item of items) {
    if (item.kind === 'export' && item.sourceId) {
      const exports = grouped.get(item.sourceId) ?? [];
      exports.push(item);
      grouped.set(item.sourceId, exports);
    }
  }

  return grouped;
}

function shouldShowHistoryItem(item: WorkspaceItem, workspaceIds: ReadonlySet<string>): boolean {
  if (item.kind === 'export' && item.sourceId && workspaceIds.has(item.sourceId)) {
    return false;
  }

  return true;
}

function HistoryErrorCard({ error }: { readonly error: unknown }) {
  if (!error) return null;
  return (
    <Card className="border-destructive/30 bg-destructive/10">
      <CardBody className="p-4 text-sm font-bold text-destructive">
        Gagal memuat riwayat. Coba refresh halaman.
      </CardBody>
    </Card>
  );
}

function HistoryLoadingGrid({ isLoading }: { readonly isLoading: boolean }) {
  if (!isLoading) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {loadingCardIds.map((id) => (
        <div key={id} className="h-38 animate-pulse rounded-xl bg-card" />
      ))}
    </div>
  );
}

function HistoryEmptyCard({ show }: { readonly show: boolean }) {
  if (!show) return null;
  return (
    <Card>
      <CardBody className="flex flex-col items-center justify-center gap-3 p-10 text-center">
        <FolderClock className="h-10 w-10 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-black">Belum ada riwayat</h2>
          <p className="text-sm font-medium text-muted-foreground">
            Draft dan export akan muncul setelah autosave atau export selesai.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

interface AutoFetchOptions {
  availableItemsCount: number;
  endedItemsCount: number;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

function useAutoFetchNextPage({
  availableItemsCount,
  endedItemsCount,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
}: AutoFetchOptions) {
  const [lastDisplayedCount, setLastDisplayedCount] = useState(0);
  const prevIsFetchingRef = useRef(false);
  const prevIsLoadingRef = useRef(false);

  useEffect(() => {
    const currentCount = availableItemsCount + endedItemsCount;
    if (currentCount !== lastDisplayedCount) {
      setLastDisplayedCount(currentCount);
    }
  }, [availableItemsCount, endedItemsCount, lastDisplayedCount]);

  useEffect(() => {
    const wasFetching = prevIsFetchingRef.current && !isFetchingNextPage;
    const wasLoading = prevIsLoadingRef.current && !isLoading;

    if ((wasFetching || wasLoading) && hasNextPage) {
      const currentCount = availableItemsCount + endedItemsCount;
      const addedCount = currentCount - lastDisplayedCount;
      if (addedCount < 6) {
        void fetchNextPage();
      }
    }

    prevIsFetchingRef.current = isFetchingNextPage;
    prevIsLoadingRef.current = isLoading;
  }, [
    isFetchingNextPage,
    isLoading,
    availableItemsCount,
    endedItemsCount,
    lastDisplayedCount,
    hasNextPage,
    fetchNextPage,
  ]);
}

function useWorkspaceMutations(
  queryClient: ReturnType<typeof useQueryClient>,
  navigate: ReturnType<typeof useNavigate>,
) {
  const duplicateMutation = useMutation({
    mutationFn: duplicateWorkspace,
    onSuccess: async (result, item) => {
      await queryClient.invalidateQueries({ queryKey: ['workspace-history'] });
      if (result && typeof result === 'object' && 'id' in result && typeof result.id === 'string') {
        navigate({ to: getDuplicatedWorkspacePath(item, result.id) });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-history'] }),
  });

  return { duplicateMutation, deleteMutation };
}

export function WorkspaceHistoryPage() {
  const [searchParams, setSearchParams] = useMutableSearchParams();
  const filterParam = searchParams.get('filter');
  const filter = isHistoryFilter(filterParam ?? '') ? (filterParam as HistoryFilter) : 'all';

  const setFilter = (newFilter: HistoryFilter) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newFilter === 'all') {
      nextParams.delete('filter');
    } else {
      nextParams.set('filter', newFilter);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { duplicateMutation, deleteMutation } = useWorkspaceMutations(queryClient, navigate);

  const tool = filter === 'all' || filter === 'expired' ? undefined : filter;
  const status = filter === 'expired' ? 'EXPIRED' : undefined;
  const queryKey = ['workspace-history', tool, status];

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }) =>
        listRecentWorkspaces({ tool, status, limit: 6, cursor: pageParam }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const groupedExports = groupExportsBySource(items);
  const workspaceIds = new Set(items.filter(isWorkspaceProject).map((item) => item.id));
  const displayedItems =
    filter === 'all' ? items.filter((item) => shouldShowHistoryItem(item, workspaceIds)) : items;
  const availableItems = displayedItems.filter(isAvailableItem);
  const endedItems = displayedItems.filter(isEndedItem);
  const hasVisibleHistory = availableItems.length > 0 || endedItems.length > 0;
  const selectedFilter = filters.find((item) => item.value === filter) ?? allHistoryFilter;

  useAutoFetchNextPage({
    availableItemsCount: availableItems.length,
    endedItemsCount: endedItems.length,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  });

  return (
    <div className="min-h-full bg-background px-4 pt-6 pb-6 text-foreground md:px-8 lg:pb-0">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
              <History size={16} />
              Riwayat
            </div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">Proyek Saya</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Lanjutkan pekerjaan atau download hasil export yang masih tersedia.
            </p>
          </div>

          <HistoryFilterSelect selectedFilter={selectedFilter} setFilter={setFilter} />
        </div>

        <HistoryErrorCard error={error} />

        <HistoryLoadingGrid isLoading={isLoading} />

        <HistoryEmptyCard show={!isLoading && !hasVisibleHistory} />

        <HistoryAvailableList
          items={availableItems}
          groupedExports={groupedExports}
          onDuplicate={(item) => duplicateMutation.mutate(item)}
          onDelete={(item) => deleteMutation.mutate(item)}
        />

        <HistoryEndedList
          items={endedItems}
          filter={filter}
          onDelete={(item) => deleteMutation.mutate(item)}
        />

        {hasNextPage ? (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-w-36 rounded-xl"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Memuat...' : 'Muat lagi'}
            </Button>
          </div>
        ) : null}

        <div className="h-20 md:h-8" aria-hidden="true" />
      </div>
    </div>
  );
}

function WorkspaceHistoryCard({
  item,
  relatedExports,
  onDuplicate,
  onDelete,
}: {
  readonly item: WorkspaceItem;
  readonly relatedExports: readonly WorkspaceItem[];
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
}) {
  const availableExport = relatedExports.find(canDownloadExport);
  const expiredExportCount = relatedExports.filter(isEndedItem).length;
  const displayTitle = getHistoryWorkspaceDisplayTitle(item);
  const downloadInfo = getRelatedExportInfo(availableExport, expiredExportCount);
  const canManageWorkspace = isWorkspaceProject(item);
  return (
    <Card className="w-full min-w-0 overflow-hidden border-border/70 bg-card/70 transition-colors hover:border-border">
      <CardBody className="flex flex-row gap-3.5 p-3 sm:gap-4 sm:p-3.5 w-full min-w-0">
        <WorkspaceHistoryThumbnail item={item} />
        <div className="min-w-0 flex-1 space-y-2.5 w-full">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between min-w-0 w-full">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="font-bold text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-md border-transparent bg-secondary/50 text-secondary-foreground"
                >
                  {getToolLabel(item)}
                </Badge>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                  {getStatusLabel(item)}
                </span>
              </div>
              <h2 className="truncate text-sm font-black text-foreground sm:text-base">
                {displayTitle}
              </h2>
              <p className="mt-0.5 text-[10px] font-bold text-muted-foreground/70">
                {getWorkspaceEditedLabel(item)}
              </p>
            </div>
            <span className="w-fit shrink-0 rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground/75 bg-muted/10">
              {getWorkspaceExpiryLabel(item)}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {canManageWorkspace ? (
              <Button
                size="sm"
                className="h-8 rounded-lg text-xs font-black uppercase tracking-wider bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary shrink-0 shadow-none"
                asChild
              >
                <Link to={getWorkspaceContinuePath(item)}>
                  <RotateCcw size={13} />
                  Lanjutkan
                </Link>
              </Button>
            ) : null}
            {canDownloadExport(item) ? (
              <Button
                size="sm"
                className="h-8 rounded-lg text-xs font-black uppercase tracking-wider border-border/50 text-muted-foreground hover:text-foreground shrink-0"
                variant="outline"
                onClick={() => downloadExport(item)}
              >
                <Download size={13} />
                Download
              </Button>
            ) : null}
            {canManageWorkspace ? (
              <Button
                size="sm"
                className="h-8 rounded-lg text-xs font-black uppercase tracking-wider border-border/50 text-muted-foreground hover:text-foreground shrink-0"
                variant="outline"
                onClick={onDuplicate}
              >
                Duplikat
              </Button>
            ) : null}
            {canManageWorkspace ? (
              <Button
                size="sm"
                className="h-8 rounded-lg text-xs font-black uppercase tracking-wider text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 shrink-0"
                variant="ghost"
                onClick={onDelete}
              >
                <Trash2 size={13} />
                Hapus
              </Button>
            ) : null}
            {availableExport ? (
              <Button
                size="sm"
                className="h-8 rounded-lg text-xs font-black uppercase tracking-wider border-border/50 text-muted-foreground hover:text-foreground shrink-0"
                variant="outline"
                onClick={() => downloadExport(availableExport)}
              >
                <Download size={13} />
                Download
              </Button>
            ) : null}
          </div>

          {downloadInfo ? (
            <p className="border-t border-border/50 pt-2 text-[10px] font-semibold text-muted-foreground/85">
              {downloadInfo}
            </p>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

function ExpiredWorkspaceRow({
  item,
  onDelete,
}: {
  readonly item: WorkspaceItem;
  readonly onDelete: () => void;
}) {
  return (
    <Card className="w-full min-w-0 overflow-hidden border-border/50 bg-card/40">
      <CardBody className="flex flex-row items-center justify-between gap-3 p-3 w-full min-w-0">
        <div className="flex min-w-0 items-center gap-3 w-full">
          <WorkspaceHistoryThumbnail item={item} compact disabled />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <Badge
                variant="secondary"
                className="shrink-0 font-bold text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-md border-transparent bg-secondary/50 text-secondary-foreground"
              >
                {getToolLabel(item)}
              </Badge>
              <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-foreground/90">
                {getHistoryWorkspaceDisplayTitle(item)}
              </h3>
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground/75">
              {getWorkspaceEditedLabel(item)} · {getStatusLabel(item)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground/75 bg-muted/5">
            {getWorkspaceExpiryLabel(item)}
          </span>
          <Button
            size="icon"
            className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
            variant="ghost"
            aria-label="Hapus dari riwayat"
            onClick={onDelete}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function HistoryFilterSelect({
  selectedFilter,
  setFilter,
}: {
  selectedFilter: { value: HistoryFilter; label: string };
  setFilter: (val: HistoryFilter) => void;
}) {
  return (
    <div className="w-full sm:w-64">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Filter
      </p>
      <Select
        value={selectedFilter.value}
        onValueChange={(value) => {
          if (isHistoryFilter(value)) {
            setFilter(value as HistoryFilter);
          }
        }}
      >
        <SelectTrigger className="h-11 rounded-xl border-border/70 bg-card/70 font-semibold">
          <SelectValue placeholder={selectedFilter.label} />
        </SelectTrigger>
        <SelectContent>
          {filters.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function HistoryAvailableList({
  items,
  groupedExports,
  onDuplicate,
  onDelete,
}: {
  items: WorkspaceItem[];
  groupedExports: Map<string, WorkspaceItem[]>;
  onDuplicate: (item: WorkspaceItem) => void;
  onDelete: (item: WorkspaceItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <WorkspaceHistoryCard
          key={`${item.kind}-${item.id}`}
          item={item}
          relatedExports={item.kind === 'export' ? [] : (groupedExports.get(item.id) ?? [])}
          onDuplicate={() => onDuplicate(item)}
          onDelete={() => onDelete(item)}
        />
      ))}
    </div>
  );
}

function HistoryEndedList({
  items,
  filter,
  onDelete,
}: {
  items: WorkspaceItem[];
  filter: HistoryFilter;
  onDelete: (item: WorkspaceItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      {filter === 'expired' ? null : (
        <div className="flex items-center justify-between border-t border-border/50 pt-5">
          <h2 className="text-sm font-black text-foreground">Sudah berakhir</h2>
          <p className="text-xs font-semibold text-muted-foreground">
            Tidak lagi memakai ruang kerja aktif
          </p>
        </div>
      )}
      <div className="space-y-2">
        {items.map((item) => (
          <ExpiredWorkspaceRow
            key={`${item.kind}-${item.id}`}
            item={item}
            onDelete={() => onDelete(item)}
          />
        ))}
      </div>
    </section>
  );
}
