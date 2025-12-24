import { Button, Card, CardBody, CardFooter, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Skeleton } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, MoreVertical, Download as DownloadIcon, Trash2, Clock, Video } from 'lucide-react';
import { PageTransition, StaggerContainer, StaggerItem, HoverCard } from '@/components/ui/PageTransition';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    if (!confirm('Yakin ingin menghapus export ini?')) return;
    
    try {
      await deleteExport.mutateAsync(id);
      toast.success('Export berhasil dihapus');
    } catch {
      toast.error('Gagal menghapus export');
    }
  };

  const handleDownload = (url: string | null, filename: string) => {
    if (!url) {
      toast.error('File tidak tersedia');
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'PROCESSING': return 'warning';
      case 'FAILED': return 'danger';
      default: return 'default';
    }
  };

  const getToolIcon = (_projectId: string | null) => {
    // For now, all exports show Video icon
    // In future, can track toolType in export record
    return Video;
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
          <p className="text-foreground/60">Video yang sudah kamu export</p>
        </div>
        <Button 
          color="primary"
          startContent={<Video size={20} />}
          onPress={handleNewExport}
        >
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
        <EmptyState
          type="projects"
          actionLabel="Buat Video Pertama"
          onAction={handleNewExport}
        />
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
                      {/* Thumbnail placeholder */}
                      <div className="aspect-video bg-content2 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                        <ToolIcon size={40} className="text-foreground/20 group-hover:text-primary/40 transition-colors" />
                      </div>
                      
                      {/* Info */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold line-clamp-1">
                            {item.project?.title ?? `Export ${item.id.slice(0, 8)}`}
                          </h3>
                          <Chip size="sm" color={getStatusColor(item.status)} variant="flat">
                            {item.status === 'COMPLETED' ? 'Selesai' : item.status === 'PROCESSING' ? 'Proses' : item.status}
                          </Chip>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-foreground/60">
                          <span>{item.format}</span>
                          <span>•</span>
                          <span>{item.resolution}</span>
                          <span>•</span>
                          <span>{formatFileSize(item.fileSizeBytes)}</span>
                        </div>
                      </div>
                    </CardBody>
                    
                    <CardFooter className="pt-0 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-foreground/50">
                        <Clock size={12} />
                        {formatDate(item.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.status === 'COMPLETED' && item.downloadUrl && (
                          <Button 
                            isIconOnly 
                            size="sm" 
                            variant="light"
                            color="primary"
                            onPress={() => handleDownload(item.downloadUrl, `${item.project?.title ?? 'export'}.mp4`)}
                          >
                            <DownloadIcon size={16} />
                          </Button>
                        )}
                        <Dropdown>
                          <DropdownTrigger>
                            <Button isIconOnly size="sm" variant="light">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu 
                            aria-label="Export actions"
                            disabledKeys={!item.downloadUrl ? ['download'] : []}
                          >
                            <DropdownItem 
                              key="download" 
                              startContent={<DownloadIcon size={16} />}
                              onPress={() => handleDownload(item.downloadUrl, `${item.project?.title ?? 'export'}.mp4`)}
                            >
                              Download
                            </DropdownItem>
                            <DropdownItem 
                              key="delete" 
                              startContent={<Trash2 size={16} />}
                              className="text-danger"
                              color="danger"
                              onPress={() => handleDeleteExport(item.id)}
                            >
                              Hapus
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
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
