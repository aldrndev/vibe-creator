import { useState } from 'react';
import { Card, CardBody, Button, Chip, Progress, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import { Download, FileVideo, Clock, Play, RefreshCw, Trash2 } from 'lucide-react';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/PageTransition';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDownloads, useRefreshDownloads } from '@/hooks/use-downloads';
import { downloadApi } from '@/services/download-api';
import { authFetch } from '@/services/api';
import toast from 'react-hot-toast';

// Platform colors and icons
const PLATFORM_CONFIG: Record<string, { color: string; bgClass: string }> = {
  tiktok: { color: 'text-cyan-400', bgClass: 'bg-cyan-500/20' },
  youtube: { color: 'text-red-400', bgClass: 'bg-red-500/20' },
  instagram: { color: 'text-pink-400', bgClass: 'bg-pink-500/20' },
  twitter: { color: 'text-blue-400', bgClass: 'bg-blue-500/20' },
  facebook: { color: 'text-blue-500', bgClass: 'bg-blue-600/20' },
  vimeo: { color: 'text-cyan-300', bgClass: 'bg-cyan-400/20' },
  reddit: { color: 'text-orange-400', bgClass: 'bg-orange-500/20' },
  unknown: { color: 'text-foreground/40', bgClass: 'bg-content2' },
};

// Shorten URL for display
function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const pathname = u.pathname.length > 25 
      ? u.pathname.slice(0, 25) + '...' 
      : u.pathname;
    return u.host + pathname;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '...' : url;
  }
}

export function DownloadsPage() {
  const { data: downloads = [], isLoading, refetch } = useDownloads();
  const refreshDownloads = useRefreshDownloads();
  
  // Delete modal
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Video preview modal
  const { isOpen: isVideoOpen, onOpen: onVideoOpen, onClose: onVideoClose } = useDisclosure();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  const handleRefresh = () => {
    refreshDownloads();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'PROCESSING': case 'DOWNLOADING': return 'primary';
      case 'PENDING': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Selesai';
      case 'PROCESSING': case 'DOWNLOADING': return 'Memproses...';
      case 'PENDING': return 'Menunggu';
      default: return status;
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTarget(id);
    onDeleteOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    
    setIsDeleting(true);
    try {
      await downloadApi.deleteDownload(deleteTarget);
      toast.success('Download dihapus');
      refetch();
    } catch (e) {
      toast.error('Gagal menghapus download');
      console.error(e);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
      onDeleteClose();
    }
  };

  const handleOpenVideo = async (downloadId: string, title: string) => {
    setIsLoadingVideo(true);
    setVideoTitle(title);
    
    try {
      const response = await authFetch(`/api/v1/download/${downloadId}/file`);
      
      if (!response.ok) {
        throw new Error('Gagal memuat video');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      onVideoOpen();
    } catch (e) {
      toast.error('Gagal memuat video');
      console.error(e);
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const handleCloseVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    setVideoTitle('');
    onVideoClose();
  };

  const getPlatformConfig = (platform: string | null): { color: string; bgClass: string } => {
    const key = platform?.toLowerCase() || 'unknown';
    const config = PLATFORM_CONFIG[key];
    return config || { color: 'text-foreground/40', bgClass: 'bg-content2' };
  };

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Download size={24} className="text-primary" />
            Unduhan
          </h1>
          <p className="text-foreground/60">Download audio/video dari URL</p>
        </div>
        <Button 
          variant="flat"
          startContent={<RefreshCw size={16} />}
          onPress={handleRefresh}
          isLoading={isLoading}
        >
          Refresh
        </Button>
      </div>

      {/* Loading */}
      {isLoading && <SkeletonCard count={4} type="row" />}

      {/* Empty state */}
      {!isLoading && downloads.length === 0 && (
        <EmptyState
          type="downloads"
          description="Download audio atau video dari TikTok, Instagram, atau platform lainnya"
        />
      )}

      {/* Downloads list - only COMPLETED downloads are shown */}
      {!isLoading && downloads.length > 0 && (
        <StaggerContainer className="space-y-3">
          {downloads.map((download) => {
            const platformConfig = getPlatformConfig(download.platform);
            const isProcessing = ['PROCESSING', 'DOWNLOADING', 'PENDING'].includes(download.status);
            const isCompleted = download.status === 'COMPLETED';
            
            return (
              <StaggerItem key={download.id}>
                <Card className="hover:border-primary/30 transition-colors border-2 border-transparent">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Platform Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isProcessing 
                          ? 'bg-primary/20 animate-pulse' 
                          : platformConfig.bgClass
                      }`}>
                        <FileVideo size={24} className={
                          isProcessing ? 'text-primary' : platformConfig.color
                        } />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">
                            {download.title || shortenUrl(download.sourceUrl)}
                          </h3>
                          <Chip 
                            size="sm" 
                            variant="flat" 
                            color={getStatusColor(download.status)}
                          >
                            {getStatusLabel(download.status)}
                          </Chip>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-foreground/60">
                          <Chip size="sm" variant="dot" className={platformConfig.color}>
                            {(download.platform || 'video').toUpperCase()}
                          </Chip>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(download.createdAt)}
                          </span>
                        </div>

                        {/* Progress bar for processing */}
                        {isProcessing && (
                          <Progress 
                            isIndeterminate
                            size="sm" 
                            color="primary"
                            className="mt-2 max-w-xs"
                            aria-label="Download sedang diproses"
                          />
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {/* Play button for completed */}
                        {isCompleted && download.localPath && (
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            startContent={<Play size={14} />}
                            isLoading={isLoadingVideo}
                            onPress={() => handleOpenVideo(download.id, download.title || 'Video')}
                          >
                            Putar
                          </Button>
                        )}
                        
                        {/* Delete button */}
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          isIconOnly
                          aria-label="Hapus download"
                          onPress={() => handleDeleteClick(download.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      {/* Delete confirmation modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader>Hapus Download?</ModalHeader>
          <ModalBody>
            <p>Download ini akan dihapus permanen beserta file-nya.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onDeleteClose}>Batal</Button>
            <Button 
              color="danger" 
              onPress={handleDeleteConfirm}
              isLoading={isDeleting}
            >
              Hapus
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Video preview modal */}
      <Modal 
        isOpen={isVideoOpen} 
        onClose={handleCloseVideo}
        size="3xl"
        classNames={{
          body: "p-0",
        }}
      >
        <ModalContent>
          <ModalHeader>{videoTitle}</ModalHeader>
          <ModalBody>
            {videoUrl && (
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full max-h-[70vh] bg-black rounded-lg"
              >
                Browser tidak mendukung video tag.
              </video>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </PageTransition>
  );
}
