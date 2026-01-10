import { useState } from "react";
import { logger } from "@/lib/logger";
import {
  Card,
  CardBody,
  Button,
  Badge,
  Progress,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";
import {
  Download,
  FileVideo,
  Clock,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/PageTransition";
import { SkeletonCard } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDownloads, useRefreshDownloads } from "@/hooks/use-downloads";
import { downloadApi } from "@/services/download-api";
import { authFetch } from "@/services/api";

const PLATFORM_CONFIG: Record<string, { color: string; bgClass: string }> = {
  tiktok: { color: "text-cyan-400", bgClass: "bg-cyan-500/20" },
  youtube: { color: "text-red-400", bgClass: "bg-red-500/20" },
  instagram: { color: "text-pink-400", bgClass: "bg-pink-500/20" },
  twitter: { color: "text-blue-400", bgClass: "bg-blue-500/20" },
  facebook: { color: "text-blue-500", bgClass: "bg-blue-600/20" },
  vimeo: { color: "text-cyan-300", bgClass: "bg-cyan-400/20" },
  reddit: { color: "text-orange-400", bgClass: "bg-orange-500/20" },
  unknown: { color: "text-muted-foreground", bgClass: "bg-muted" },
};

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const pathname =
      u.pathname.length > 25 ? u.pathname.slice(0, 25) + "..." : u.pathname;
    return u.host + pathname;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + "..." : url;
  }
}

export function DownloadsPage() {
  const { data: downloads = [], isLoading, refetch } = useDownloads();
  const refreshDownloads = useRefreshDownloads();

  // Delete modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Video preview modal
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  const handleRefresh = () => {
    refreshDownloads();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default";
      case "PROCESSING":
      case "DOWNLOADING":
        return "secondary";
      case "PENDING":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "Selesai";
      case "PROCESSING":
      case "DOWNLOADING":
        return "Memproses...";
      case "PENDING":
        return "Menunggu";
      default:
        return status;
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTarget(id);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await downloadApi.deleteDownload(deleteTarget);
      refetch();
    } catch (e) {
      logger.error("Delete download failed", e);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
      setIsDeleteOpen(false);
    }
  };

  const handleOpenVideo = async (downloadId: string, title: string) => {
    setIsLoadingVideo(true);
    setVideoTitle(title);

    try {
      const response = await authFetch(`/api/v1/download/${downloadId}/file`);

      if (!response.ok) {
        throw new Error("Gagal memuat video");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsVideoOpen(true);
    } catch (e) {
      logger.error("Load video failed", e);
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const handleCloseVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    setVideoTitle("");
    setIsVideoOpen(false);
  };

  const getPlatformConfig = (
    platform: string | null
  ): { color: string; bgClass: string } => {
    const key = platform?.toLowerCase() || "unknown";
    const config = PLATFORM_CONFIG[key];
    return config || { color: "text-muted-foreground", bgClass: "bg-muted" };
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
          <p className="text-muted-foreground">Download audio/video dari URL</p>
        </div>
        <Button
          variant="secondary"
          onClick={handleRefresh}
          isLoading={isLoading}
        >
          <RefreshCw size={16} />
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

      {/* Downloads list */}
      {!isLoading && downloads.length > 0 && (
        <StaggerContainer className="space-y-3">
          {downloads.map((download) => {
            const platformConfig = getPlatformConfig(download.platform);
            const isProcessing = [
              "PROCESSING",
              "DOWNLOADING",
              "PENDING",
            ].includes(download.status);
            const isCompleted = download.status === "COMPLETED";

            return (
              <StaggerItem key={download.id}>
                <Card className="hover:border-primary/30 transition-colors border-2 border-transparent">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Platform Icon */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isProcessing
                            ? "bg-primary/20 animate-pulse"
                            : platformConfig.bgClass
                        }`}
                      >
                        <FileVideo
                          size={24}
                          className={
                            isProcessing ? "text-primary" : platformConfig.color
                          }
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">
                            {download.title || shortenUrl(download.sourceUrl)}
                          </h3>
                          <Badge variant={getStatusVariant(download.status)}>
                            {getStatusLabel(download.status)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <Badge
                            variant="outline"
                            className={platformConfig.color}
                          >
                            {(download.platform || "video").toUpperCase()}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(download.createdAt)}
                          </span>
                        </div>

                        {/* Progress bar for processing */}
                        {isProcessing && (
                          <Progress
                            value={50}
                            className="mt-2 max-w-xs animate-pulse"
                          />
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {/* Play button for completed */}
                        {isCompleted && download.localPath && (
                          <Button
                            size="sm"
                            variant="secondary"
                            isLoading={isLoadingVideo}
                            onClick={() =>
                              handleOpenVideo(
                                download.id,
                                download.title || "Video"
                              )
                            }
                          >
                            <Play size={14} />
                            Putar
                          </Button>
                        )}

                        {/* Delete button */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteClick(download.id)}
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
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Download?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Download ini akan dihapus permanen beserta file-nya.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              isLoading={isDeleting}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video preview modal */}
      <Dialog open={isVideoOpen} onOpenChange={handleCloseVideo}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{videoTitle}</DialogTitle>
          </DialogHeader>
          <div className="p-0">
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
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
