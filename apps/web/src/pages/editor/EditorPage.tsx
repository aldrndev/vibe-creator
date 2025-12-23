import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Slider, Tooltip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, useDisclosure } from '@heroui/react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Upload,
  Download,
  Cloud,
  ZoomIn,
  ZoomOut,
  Scissors,
  Trash2,
  Copy,
  Link,
  Mic,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editor-store';
import { Timeline } from '@/components/editor/Timeline';
import { VideoPreview } from '@/components/editor/VideoPreview';
import { AssetPanel } from '@/components/editor/AssetPanel';
import { VoiceRecorderModal } from '@/components/editor/VoiceRecorderModal';

import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { exportApi } from '@/services/export-api';
import { downloadApi } from '@/services/download-api';

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Separate state for export processing (only for export, not thumbnail gen)
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  // URL download modal
  const { isOpen: isUrlModalOpen, onOpen: openUrlModal, onClose: closeUrlModal } = useDisclosure();
  const [urlInput, setUrlInput] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  
  // Voice recorder modal
  const { isOpen: isVoiceModalOpen, onOpen: openVoiceModal, onClose: closeVoiceModal } = useDisclosure();
  
  const { extractTimelineThumbnails, concatenateClips } = useFFmpeg();
  
  const {
    projectTitle,
    timeline,
    currentTimeMs,
    isPlaying,
    zoomLevel,
    selectedClipId,
    initProject,
    resetEditor,
    setCurrentTime,
    pause,
    togglePlayback,
    setZoomLevel,
    addAsset,
    updateAsset,
    addClip,
    removeClip,
  } = useEditorStore();

  // Initialize project
  useEffect(() => {
    if (projectId) {
      // TODO: Load project from API
      initProject(projectId, 'New Project');
    }
    
    return () => {
      resetEditor();
    };
  }, [projectId, initProject, resetEditor]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayback();
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedClipId) {
            const state = useEditorStore.getState();
            for (const track of state.timeline.tracks) {
              const clip = track.clips.find(c => c.id === selectedClipId);
              if (clip) {
                removeClip(track.id, selectedClipId);
                break;
              }
            }
          }
          break;
        case 'ArrowLeft':
          setCurrentTime(currentTimeMs - (e.shiftKey ? 1000 : 100));
          break;
        case 'ArrowRight':
          setCurrentTime(currentTimeMs + (e.shiftKey ? 1000 : 100));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayback, selectedClipId, removeClip, currentTimeMs, setCurrentTime]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      const state = useEditorStore.getState();
      const newTime = state.currentTimeMs + 33; // ~30fps
      
      if (newTime >= state.timeline.durationMs && state.timeline.durationMs > 0) {
        pause();
        setCurrentTime(0);
      } else {
        setCurrentTime(newTime);
      }
    }, 33);
    
    return () => clearInterval(interval);
  }, [isPlaying, pause, setCurrentTime]);

  // File import handler
  const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');
      
      if (!isVideo && !isAudio && !isImage) continue;
      
      const url = URL.createObjectURL(file);
      const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      
      // Get duration for video/audio
      let durationMs = 5000; // Default for images
      let width: number | undefined;
      let height: number | undefined;
      
      if (isVideo || isAudio) {
        const media = document.createElement(isVideo ? 'video' : 'audio');
        media.src = url;
        await new Promise<void>((resolve) => {
          media.onloadedmetadata = () => {
            durationMs = media.duration * 1000;
            if (isVideo && media instanceof HTMLVideoElement) {
              width = media.videoWidth;
              height = media.videoHeight;
            }
            resolve();
          };
        });
      } else if (isImage) {
        const img = new Image();
        img.src = url;
        await new Promise<void>((resolve) => {
          img.onload = () => {
            width = img.width;
            height = img.height;
            resolve();
          };
        });
      }
      
      // Add asset immediately with available info
      addAsset({
        id,
        name: file.name,
        type: isVideo ? 'VIDEO' : isAudio ? 'AUDIO' : 'IMAGE',
        url,
        file: isVideo ? file : undefined, // Store file for processing
        durationMs,
        width,
        height,
      });

      // Generate thumbnails for video in background
      if (isVideo) {
        extractTimelineThumbnails(file, 20).then(thumbnails => {
          updateAsset(id, { thumbnails });
        }).catch(err => {
          console.error('Failed to generate thumbnails:', err);
        });
      }
      
      // Auto-add to timeline
      const trackType = isAudio ? 'AUDIO' : 'VIDEO';
      const track = useEditorStore.getState().timeline.tracks.find(t => t.type === trackType);
      
      if (track) {
        const lastClipEnd = track.clips.length > 0
          ? Math.max(...track.clips.map(c => c.endMs))
          : 0;
        
        addClip(track.id, {
          assetId: id,
          startMs: lastClipEnd,
          endMs: lastClipEnd + durationMs,
          trimStartMs: 0,
          trimEndMs: 0,
          transforms: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
          effects: { filters: [], speed: 1, volume: 1, fadeIn: 0, fadeOut: 0 },
          asset: {
            id,
            name: file.name,
            type: isVideo ? 'VIDEO' : isAudio ? 'AUDIO' : 'IMAGE',
            url,
            file: isVideo ? file : undefined,
            durationMs,
            width,
            height,
          },
        });
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addAsset, addClip, updateAsset, extractTimelineThumbnails]);

  const handleExport = async () => {
    // gathering clips from video track
    const videoTrack = timeline.tracks.find(t => t.type === 'VIDEO');
    if (!videoTrack || videoTrack.clips.length === 0) {
      alert('Tidak ada klip untuk di-export');
      return;
    }

    const clipsToExport = videoTrack.clips
      .sort((a, b) => a.startMs - b.startMs)
      .map(clip => {
        if (!clip.asset?.file) return null;
        return {
          file: clip.asset.file,
          startTime: clip.trimStartMs / 1000,
          endTime: (clip.trimStartMs + (clip.endMs - clip.startMs)) / 1000,
        };
      })
      .filter(c => c !== null) as Array<{ file: File; startTime: number; endTime: number }>;

    if (clipsToExport.length === 0) {
      alert('Gagal memproses klip. Pastikan video diimport dari device ini (file object required).');
      return;
    }

    try {
      pause();
      setIsExporting(true);
      setExportProgress(0);
      
      const blob = await concatenateClips(clipsToExport);
      
      setExportProgress(1);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Export gagal. Cek console untuk detail.');
    } finally {
      setIsExporting(false);
    }
  };

  // Server-side export handler
  const handleServerExport = async () => {
    const videoTrack = timeline.tracks.find(t => t.type === 'VIDEO');
    const clips = videoTrack?.clips || [];
    
    if (clips.length === 0) {
      alert('Tidak ada klip untuk di-export');
      return;
    }

    // Get file objects from clips
    const clipFiles = clips
      .map(clip => {
        if (!clip.asset?.file) return null;
        return {
          file: clip.asset.file,
          startTime: clip.trimStartMs / 1000,
          endTime: (clip.endMs - clip.startMs - clip.trimEndMs) / 1000,
        };
      })
      .filter((c): c is { file: File; startTime: number; endTime: number } => c !== null);

    if (clipFiles.length === 0) {
      alert('Tidak ada file video untuk diupload');
      return;
    }

    try {
      pause();
      setIsExporting(true);
      setExportProgress(0);

      // Step 1: Upload video files
      const uploadedFiles: Array<{ localPath: string; startTime: number; endTime: number }> = [];
      
      for (let i = 0; i < clipFiles.length; i++) {
        const clipFile = clipFiles[i];
        if (!clipFile) continue;
        
        setExportProgress((i / clipFiles.length) * 0.3); // 30% for uploads
        const uploaded = await exportApi.uploadVideo(clipFile.file);
        uploadedFiles.push({
          localPath: uploaded.filepath,
          startTime: clipFile.startTime,
          endTime: clipFile.endTime,
        });
      }

      setExportProgress(0.3);

      // Step 2: Create export job
      const job = await exportApi.createExportJob({
        projectId: projectId || 'default',
        timelineData: {
          clips: uploadedFiles,
          settings: {
            width: 1920,
            height: 1080,
            fps: 30,
          },
        },
      });

      setExportProgress(0.4);

      // Step 3: Poll for completion
      await exportApi.waitForCompletion(
        job.jobId,
        (progress) => setExportProgress(0.4 + progress * 0.5) // 40-90%
      );

      setExportProgress(1);

      // Step 4: Download
      const downloadUrl = exportApi.getDownloadUrl(job.jobId);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `export-${Date.now()}.mp4`;
      a.click();

      alert('Export berhasil!');
    } catch (e) {
      console.error('Server export failed:', e);
      alert(`Server export gagal: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Delete selected clip
  const handleDeleteClip = () => {
    if (!selectedClipId) {
      alert('Pilih klip terlebih dahulu');
      return;
    }
    // Find which track contains the clip
    const track = timeline.tracks.find(t => t.clips.some(c => c.id === selectedClipId));
    if (track) {
      removeClip(track.id, selectedClipId);
    }
  };

  // Duplicate selected clip
  const handleDuplicateClip = () => {
    if (!selectedClipId) {
      alert('Pilih klip terlebih dahulu');
      return;
    }
    
    // Find the clip and its track
    const videoTrack = timeline.tracks.find(t => t.type === 'VIDEO');
    const clip = videoTrack?.clips.find(c => c.id === selectedClipId);
    
    if (!clip || !videoTrack) return;
    
    // Add duplicate at the end
    const lastClipEnd = videoTrack.clips.length > 0
      ? Math.max(...videoTrack.clips.map(c => c.endMs))
      : 0;
    
    addClip(videoTrack.id, {
      assetId: clip.assetId,
      startMs: lastClipEnd,
      endMs: lastClipEnd + (clip.endMs - clip.startMs),
      trimStartMs: clip.trimStartMs,
      trimEndMs: clip.trimEndMs,
      transforms: { ...clip.transforms },
      effects: { ...clip.effects },
      asset: clip.asset,
    });
  };

  // Split clip at playhead (TODO: implement properly)
  const handleSplitClip = () => {
    alert('Split clip - fitur dalam pengembangan');
    // TODO: Split clip at currentTimeMs
  };

  // Handle URL download
  const handleUrlDownload = async () => {
    if (!urlInput.trim()) {
      alert('Masukkan URL video');
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadStatus('Mengirim request...');
      
      // Create download job
      const job = await downloadApi.requestDownload(urlInput);
      setDownloadStatus('Memproses URL...');
      
      // Wait for completion with status updates
      await downloadApi.waitForCompletion(job.jobId, (status) => {
        const statusMap: Record<string, string> = {
          'PENDING': 'Menunggu antrian...',
          'DOWNLOADING': 'Sedang mendownload...',
          'COMPLETED': 'Selesai!',
          'FAILED': 'Gagal',
        };
        setDownloadStatus(statusMap[status] || status);
      });
      
      // Get the downloaded file info
      const result = await downloadApi.getStatus(job.jobId);
      setDownloadStatus('Selesai!');
      
      alert(`Video "${result.title || 'Downloaded'}" berhasil didownload!`);
      closeUrlModal();
      setUrlInput('');
      setDownloadStatus('');
      
      // TODO: Automatically add to assets panel
    } catch (e) {
      console.error('URL download failed:', e);
      setDownloadStatus('');
      alert(`Download gagal: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle voice recording save
  const handleVoiceSave = (blob: Blob, duration: number) => {
    // Create asset from audio blob
    const file = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
    const assetId = `audio-${Date.now()}`;
    
    addAsset({
      id: assetId,
      name: `Voice Recording (${Math.round(duration / 1000)}s)`,
      type: 'AUDIO',
      url: URL.createObjectURL(blob),
      file,
      durationMs: duration,
    });
    
    // Auto-add to audio track
    const audioTrack = timeline.tracks.find(t => t.type === 'AUDIO');
    if (audioTrack) {
      const lastClipEnd = audioTrack.clips.length > 0
        ? Math.max(...audioTrack.clips.map(c => c.endMs))
        : 0;
      
      addClip(audioTrack.id, {
        assetId,
        startMs: lastClipEnd,
        endMs: lastClipEnd + duration,
        trimStartMs: 0,
        trimEndMs: 0,
        transforms: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
        effects: { filters: [], speed: 1, volume: 1, fadeIn: 0, fadeOut: 0 },
      });
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-divider flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            size="sm"
            variant="light"
            onPress={() => navigate('/dashboard/projects')}
          >
            ← Kembali
          </Button>
          <h1 className="text-lg font-semibold">{projectTitle}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {isExporting ? (
            <div className="flex items-center gap-2 px-4">
              <div className="text-sm text-foreground/70">Exporting... {Math.round(exportProgress * 100)}%</div>
              <div className="w-24 h-1 bg-default-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${exportProgress * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <Button
                size="sm"
                variant="flat"
                startContent={<Upload size={16} />}
                onPress={() => fileInputRef.current?.click()}
              >
                Import
              </Button>
              <Button
                size="sm"
                variant="flat"
                startContent={<Link size={16} />}
                onPress={openUrlModal}
              >
                Import URL
              </Button>
              <Button
                size="sm"
                variant="flat"
                startContent={<Mic size={16} />}
                onPress={openVoiceModal}
              >
                Record
              </Button>
              <Button
                size="sm"
                variant="flat"
                startContent={<Cloud size={16} />}
                onPress={handleServerExport}
              >
                Export (Server)
              </Button>
              <Button
                size="sm"
                color="primary"
                startContent={<Download size={16} />}
                onPress={handleExport}
              >
                Export (Client)
              </Button>
            </>
          )}
        </div>
      </header>
      
      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Assets */}
        <AssetPanel />
        
        {/* Center - Preview */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Video Preview - use min-h-0 to allow shrinking */}
          <div className="flex-1 flex items-center justify-center bg-black/50 p-4 min-h-0 overflow-hidden">
            <VideoPreview />
          </div>
          
          {/* Playback controls */}
          <div className="h-16 border-t border-divider flex items-center justify-center gap-4 px-4 flex-shrink-0 bg-background">
            <div className="flex items-center gap-2">
              <Tooltip content="Ke awal (Home)">
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onPress={() => setCurrentTime(0)}
                >
                  <SkipBack size={18} />
                </Button>
              </Tooltip>
              
              <Tooltip content="Play/Pause (Space)">
                <Button
                  size="sm"
                  color="primary"
                  isIconOnly
                  onPress={togglePlayback}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </Button>
              </Tooltip>
              
              <Tooltip content="Ke akhir (End)">
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onPress={() => setCurrentTime(timeline.durationMs)}
                >
                  <SkipForward size={18} />
                </Button>
              </Tooltip>
            </div>
            
            <div className="font-mono text-sm text-foreground/70 w-24 text-center">
              {formatTime(currentTimeMs)}
            </div>
            
            {/* Editing buttons */}
            <div className="flex items-center gap-1 border-l border-divider pl-4">
              <Tooltip content="Split di Playhead (S)">
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onPress={handleSplitClip}
                >
                  <Scissors size={18} />
                </Button>
              </Tooltip>
              
              <Tooltip content="Duplicate Klip (Cmd+D)">
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onPress={handleDuplicateClip}
                  isDisabled={!selectedClipId}
                >
                  <Copy size={18} />
                </Button>
              </Tooltip>
              
              <Tooltip content="Hapus Klip (Del)">
                <Button
                  size="sm"
                  variant="light"
                  color="danger"
                  isIconOnly
                  onPress={handleDeleteClip}
                  isDisabled={!selectedClipId}
                >
                  <Trash2 size={18} />
                </Button>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Tooltip content="Zoom Out">
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onPress={() => setZoomLevel(zoomLevel * 0.8)}
                >
                  <ZoomOut size={18} />
                </Button>
              </Tooltip>
              
              <Slider
                size="sm"
                minValue={20}
                maxValue={300}
                step={10}
                value={zoomLevel}
                onChange={(v) => setZoomLevel(v as number)}
                className="w-24"
              />
              
              <Tooltip content="Zoom In">
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onPress={() => setZoomLevel(zoomLevel * 1.25)}
                >
                  <ZoomIn size={18} />
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="h-48 border-t border-divider flex-shrink-0">
        <Timeline />
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        onChange={handleFileImport}
        className="hidden"
      />
      
      {/* URL Download Modal */}
      <Modal isOpen={isUrlModalOpen} onClose={closeUrlModal} size="md">
        <ModalContent>
          <ModalHeader>Import dari URL</ModalHeader>
          <ModalBody>
            <Input
              label="URL Video"
              placeholder="https://youtube.com/watch?v=..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              description="Mendukung: YouTube, TikTok, Instagram, Twitter, Facebook"
              isDisabled={isDownloading}
            />
            {isDownloading && downloadStatus && (
              <div className="mt-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-default-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary animate-pulse"
                      style={{ width: downloadStatus.includes('Selesai') ? '100%' : '60%' }}
                    />
                  </div>
                </div>
                <div className="text-sm text-foreground/60 mt-2 text-center">
                  {downloadStatus}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={closeUrlModal}>
              Batal
            </Button>
            <Button 
              color="primary" 
              onPress={handleUrlDownload}
              isLoading={isDownloading}
            >
              Download
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={isVoiceModalOpen}
        onClose={closeVoiceModal}
        onSave={handleVoiceSave}
      />
    </div>
  );
}
