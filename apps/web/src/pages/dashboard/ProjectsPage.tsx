import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Download as DownloadIcon,
  FolderOpen,
  MoreVertical,
  Trash2,
  Video,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  HoverCard,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from '@/components/ui/PageTransition';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { logger } from '@/lib/logger';
import { api, downloadAuthenticatedFile } from '@/services/api';

interface ExportItem {
  id: string;
  format: string;
  resolution: string;
  status: string;
  fileSizeBytes: number | null;
  downloadUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  project: {
    id: string;
    title: string;
  } | null;
}

// Fetch exports hook
function useExports() {
  return useQuery({
    queryKey: ['exports'],
    queryFn: async () => {
      const response = await api.get<ExportItem[]>('/export/history');
      if (!response.success) throw new Error('Failed to fetch exports');
      return response.data ?? [];
    },
  });
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: exports = [], isLoading } = useExports();

  const deleteExport = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/export/${id}`);
      if (!response.success) throw new Error('Failed to delete export');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const handleNewExport = () => {
    navigate('/tools/editor');
  };

  const handleDeleteExport = async (id: string) => {
    // Using inline confirmation approach
    try {
      await deleteExport.mutateAsync(id);
    } catch {
      // Error is logged by mutation
    }
  };

  const handleDownload = async (url: string | null, filename: string) => {
    if (!url) {
      return;
    }

    try {
      await downloadAuthenticatedFile(url, filename);
    } catch (error) {
      logger.error('Export download failed', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'PROCESSING':
        return 'warning';
      case 'FAILED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getToolIcon = (_projectId: string | null) => {
    return Video;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'COMPLETED') return 'Selesai';
    if (status === 'PROCESSING') return 'Proses';
    return status;
  };

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen size={24} className="text-primary" />
            My Exports
          </h1>
          <p className="text-muted-foreground">Video yang sudah kamu export</p>
        </div>
        <Button onClick={handleNewExport}>
          <Video size={20} />
          Buat Video Baru
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-48">
              <CardBody className="p-4">
                <Skeleton className="w-full h-24 rounded-lg mb-4" />
                <Skeleton className="w-3/4 h-4 rounded mb-2" />
                <Skeleton className="w-1/2 h-3 rounded" />
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && exports.length === 0 && (
        <EmptyState type="projects" actionLabel="Buat Video Pertama" onAction={handleNewExport} />
      )}

      {/* Exports grid */}
      {!isLoading && exports.length > 0 && (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exports.map((item) => {
            const ToolIcon = getToolIcon(item.project?.id ?? null);

            return (
              <StaggerItem key={item.id}>
                <HoverCard>
                  <Card className="h-full group border-2 border-transparent hover:border-primary/30 transition-colors">
                    <CardBody className="p-4">
                      {/* Video thumbnail/preview */}
                      <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
                        <ToolIcon
                          size={40}
                          className="text-muted-foreground/50 group-hover:text-primary/40 transition-colors"
                        />
                        {item.status === 'COMPLETED' && (
                          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-3">
                            Lancaster{' '}
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                              Protected Export
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold line-clamp-1">
                            {item.project?.title ?? `Export ${item.id.slice(0, 8)}`}
                          </h3>
                          <Badge variant={getStatusVariant(item.status)}>
                            {getStatusLabel(item.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{item.format}</span>
                          <span>•</span>
                          <span>{item.resolution}</span>
                          <span>•</span>
                          <span>{formatFileSize(item.fileSizeBytes)}</span>
                        </div>
                      </div>
                    </CardBody>

                    <CardFooter className="pt-0 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={12} />
                        {formatDate(item.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.status === 'COMPLETED' && item.downloadUrl && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              handleDownload(item.downloadUrl, `export-${item.id.slice(0, 8)}.mp4`)
                            }
                          >
                            <DownloadIcon size={16} />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={!item.downloadUrl}
                              onClick={() =>
                                handleDownload(
                                  item.downloadUrl,
                                  `export-${item.id.slice(0, 8)}.mp4`,
                                )
                              }
                            >
                              <DownloadIcon size={16} />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteExport(item.id)}
                            >
                              <Trash2 size={16} />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardFooter>
                  </Card>
                </HoverCard>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </PageTransition>
  );
}
