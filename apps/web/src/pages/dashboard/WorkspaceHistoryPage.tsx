import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FolderClock, History, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardBody } from '@/components/ui';
import { WorkspaceHistoryThumbnail } from '@/components/workspace/workspace-history-thumbnail';
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

const filters: Array<{ value: HistoryFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'ai-director', label: 'AI Director' },
  { value: 'video-studio', label: 'Video Studio' },
  { value: 'loop-creator', label: 'Loop Creator' },
  { value: 'reaction-video', label: 'Reaction' },
  { value: 'live-stream', label: 'Live Stream' },
  { value: 'exports', label: 'Export' },
  { value: 'expired', label: 'Berakhir' },
];
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

export function WorkspaceHistoryPage() {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const tool = filter === 'all' || filter === 'expired' ? undefined : filter;
  const status = filter === 'expired' ? 'EXPIRED' : undefined;
  const queryKey = ['workspace-history', tool, status];

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }) =>
        listRecentWorkspaces({ tool, status, limit: 30, cursor: pageParam }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

  const duplicateMutation = useMutation({
    mutationFn: duplicateWorkspace,
    onSuccess: async (result, item) => {
      await queryClient.invalidateQueries({ queryKey: ['workspace-history'] });
      if (result && typeof result === 'object' && 'id' in result && typeof result.id === 'string') {
        navigate(getDuplicatedWorkspacePath(item, result.id));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-history'] }),
  });

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const groupedExports = groupExportsBySource(items);
  const workspaceIds = new Set(items.filter(isWorkspaceProject).map((item) => item.id));
  const displayedItems =
    filter === 'all' ? items.filter((item) => shouldShowHistoryItem(item, workspaceIds)) : items;
  const availableItems = displayedItems.filter(isAvailableItem);
  const endedItems = displayedItems.filter(isEndedItem);
  const hasVisibleHistory = availableItems.length > 0 || endedItems.length > 0;

  return (
    <div className="min-h-full bg-background px-4 pt-6 pb-40 text-foreground md:px-8 md:pb-10">
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

          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <Button
                key={item.value}
                size="sm"
                variant={filter === item.value ? 'default' : 'outline'}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardBody className="p-4 text-sm font-bold text-destructive">
              Gagal memuat riwayat. Coba refresh halaman.
            </CardBody>
          </Card>
        ) : null}

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {loadingCardIds.map((id) => (
              <div key={id} className="h-38 animate-pulse rounded-xl bg-card" />
            ))}
          </div>
        ) : null}

        {!isLoading && !hasVisibleHistory ? (
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
        ) : null}

        {availableItems.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {availableItems.map((item) => (
              <WorkspaceHistoryCard
                key={`${item.kind}-${item.id}`}
                item={item}
                relatedExports={item.kind === 'export' ? [] : (groupedExports.get(item.id) ?? [])}
                onDuplicate={() => duplicateMutation.mutate(item)}
                onDelete={() => deleteMutation.mutate(item)}
              />
            ))}
          </div>
        ) : null}

        {endedItems.length > 0 ? (
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
              {endedItems.map((item) => (
                <ExpiredWorkspaceRow
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  onDelete={() => deleteMutation.mutate(item)}
                />
              ))}
            </div>
          </section>
        ) : null}

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
    <Card className="border-border/70 bg-card/70 transition-colors hover:border-border">
      <CardBody className="flex flex-col gap-4 p-4 sm:flex-row sm:gap-3 sm:p-3.5">
        <WorkspaceHistoryThumbnail item={item} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant={item.kind === 'export' ? 'outline' : 'default'}>
                  {getToolLabel(item)}
                </Badge>
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {getStatusLabel(item)}
                </span>
              </div>
              <h2 className="truncate text-base font-black sm:text-lg">{displayTitle}</h2>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                {getWorkspaceEditedLabel(item)}
              </p>
            </div>
            <span className="w-fit shrink-0 rounded-full border border-border px-3 py-1 text-xs font-black text-muted-foreground">
              {getWorkspaceExpiryLabel(item)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {canManageWorkspace ? (
              <Button size="sm" className="h-10 w-full rounded-xl sm:h-9 sm:w-auto" asChild>
                <Link to={getWorkspaceContinuePath(item)}>
                  <RotateCcw size={15} />
                  Lanjutkan
                </Link>
              </Button>
            ) : null}
            {canDownloadExport(item) ? (
              <Button
                size="sm"
                className="h-10 w-full rounded-xl sm:h-9 sm:w-auto"
                variant="outline"
                onClick={() => downloadExport(item)}
              >
                <Download size={15} />
                Download
              </Button>
            ) : null}
            {canManageWorkspace ? (
              <Button
                size="sm"
                className="h-10 w-full rounded-xl sm:h-9 sm:w-auto"
                variant="outline"
                onClick={onDuplicate}
              >
                Duplikat
              </Button>
            ) : null}
            {canManageWorkspace ? (
              <Button
                size="sm"
                className="h-10 w-full rounded-xl sm:h-9 sm:w-auto"
                variant="ghost"
                onClick={onDelete}
              >
                <Trash2 size={15} />
                Hapus
              </Button>
            ) : null}
            {availableExport ? (
              <Button
                size="sm"
                className="h-10 w-full rounded-xl sm:h-9 sm:w-auto"
                variant="outline"
                onClick={() => downloadExport(availableExport)}
              >
                <Download size={15} />
                Download
              </Button>
            ) : null}
          </div>

          {downloadInfo ? (
            <p className="border-t border-border/50 pt-3 text-xs font-semibold text-muted-foreground sm:pt-2">
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
    <Card className="border-border/50 bg-card/40">
      <CardBody className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <WorkspaceHistoryThumbnail item={item} compact disabled />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
              <Badge variant="outline" className="shrink-0 text-muted-foreground">
                {getToolLabel(item)}
              </Badge>
              <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-foreground/90">
                {getHistoryWorkspaceDisplayTitle(item)}
              </h3>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              {getWorkspaceEditedLabel(item)} · {getStatusLabel(item)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/50 pt-3 sm:border-t-0 sm:pt-0">
          <span className="rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground">
            {getWorkspaceExpiryLabel(item)}
          </span>
          <Button size="icon" variant="ghost" aria-label="Hapus dari riwayat" onClick={onDelete}>
            <Trash2 size={15} />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
