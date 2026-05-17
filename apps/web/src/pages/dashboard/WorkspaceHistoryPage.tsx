import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FolderClock, History, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardBody } from '@/components/ui';
import { downloadAuthenticatedFile } from '@/services/api';
import {
  deleteWorkspace,
  duplicateWorkspace,
  getWorkspaceContinuePath,
  getWorkspaceExpiryLabel,
  listRecentWorkspaces,
  type WorkspaceItem,
  type WorkspaceTool,
} from '@/services/workspace-api';

type HistoryFilter = 'all' | WorkspaceTool | 'expired';

const filters: Array<{ value: HistoryFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'ai-director', label: 'AI Director' },
  { value: 'video-studio', label: 'Video Studio' },
  { value: 'exports', label: 'Exports' },
  { value: 'expired', label: 'Expired' },
];
const loadingCardIds = [
  'history-loading-1',
  'history-loading-2',
  'history-loading-3',
  'history-loading-4',
];

function getToolLabel(item: WorkspaceItem): string {
  if (item.tool === 'ai-director') return 'AI Director';
  if (item.tool === 'video-studio') return 'Video Studio';
  return 'Export';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function WorkspaceHistoryPage() {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const tool = filter === 'all' || filter === 'expired' ? undefined : filter;
  const status = filter === 'expired' ? 'EXPIRED' : undefined;
  const queryKey = ['workspace-history', tool, status];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => listRecentWorkspaces({ tool, status, limit: 30 }),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateWorkspace,
    onSuccess: async (result, item) => {
      await queryClient.invalidateQueries({ queryKey: ['workspace-history'] });
      if (result && typeof result === 'object' && 'id' in result && typeof result.id === 'string') {
        navigate(
          item.kind === 'ai-director'
            ? `/tools/ai-director?session=${result.id}`
            : `/tools/video-studio?session=${result.id}`,
        );
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-history'] }),
  });

  const items = data?.items ?? [];

  return (
    <div className="min-h-full bg-background px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
              <History size={16} />
              Riwayat
            </div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">My Projects</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Draft, session, dan export yang masih berada dalam masa lifecycle.
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

        {!isLoading && items.length === 0 ? (
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

        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <WorkspaceHistoryCard
              key={`${item.kind}-${item.id}`}
              item={item}
              onDuplicate={() => duplicateMutation.mutate(item)}
              onDelete={() => deleteMutation.mutate(item)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkspaceHistoryCard({
  item,
  onDuplicate,
  onDelete,
}: {
  readonly item: WorkspaceItem;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
}) {
  const isExpired =
    item.lifecycleStatus === 'EXPIRED' ||
    item.lifecycleStatus === 'DELETED' ||
    item.lifecycleStatus === 'DOWNLOAD_EXPIRED';
  const canDownload =
    item.kind === 'export' && item.sourceId && item.lifecycleStatus !== 'DOWNLOAD_EXPIRED';

  return (
    <Card className="border-border/70 bg-card/70">
      <CardBody className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={isExpired ? 'outline' : 'default'}>{getToolLabel(item)}</Badge>
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                {item.lifecycleStatus}
              </span>
            </div>
            <h2 className="truncate text-lg font-black">{item.title}</h2>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              Last edited {formatDate(item.updatedAt)}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-black text-muted-foreground">
            {getWorkspaceExpiryLabel(item)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.kind !== 'export' && !isExpired ? (
            <Button size="sm" asChild>
              <Link to={getWorkspaceContinuePath(item)}>
                <RotateCcw size={15} />
                Continue
              </Link>
            </Button>
          ) : null}
          {canDownload ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadAuthenticatedFile(
                  `/api/v1/director/sessions/${item.sourceId}/export/download`,
                  `${item.title}.mp4`,
                )
              }
            >
              <Download size={15} />
              Download
            </Button>
          ) : null}
          {item.kind !== 'export' ? (
            <Button size="sm" variant="outline" onClick={onDuplicate} disabled={isExpired}>
              Duplicate
            </Button>
          ) : null}
          {item.kind !== 'export' ? (
            <Button size="sm" variant="ghost" onClick={onDelete}>
              <Trash2 size={15} />
              Delete
            </Button>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
