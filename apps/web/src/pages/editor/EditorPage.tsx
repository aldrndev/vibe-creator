import { useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { clsx } from 'clsx';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Slider, Tooltip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, useDisclosure } from '@heroui/react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Upload,
  Download,
  ZoomIn,
  ZoomOut,
  Scissors,
  Trash2,
  Copy,
  Link,
  Mic,
  Type,
  Undo2,
  Redo2,
  LayoutTemplate,
  MonitorPlay,
  SlidersHorizontal,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editor-store';
import { Timeline } from '@/components/editor/Timeline';
import { VideoPreview } from '@/components/editor/VideoPreview';
import { AssetPanel } from '@/components/editor/AssetPanel';
import { VoiceRecorderModal } from '@/components/editor/VoiceRecorderModal';
import { InspectorPanel } from '@/components/editor/InspectorPanel';
import { TextOverlayEditor } from '@/components/editor/TextOverlayEditor';
import { ExportModal } from '@/components/editor/ExportModal';
import { useState } from 'react';

import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { useExport } from '@/hooks/use-export';
import { useUrlDownload } from '@/hooks/use-url-download';
import { useHistory } from '@/hooks/use-history';
import toast from 'react-hot-toast';

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // URL download modal
  const { isOpen: isUrlModalOpen, onOpen: openUrlModal, onClose: closeUrlModal } = useDisclosure();
  
  // Voice recorder modal
  const { isOpen: isVoiceModalOpen, onOpen: openVoiceModal, onClose: closeVoiceModal } = useDisclosure();
  
  // Text overlay modal
  const { isOpen: isTextModalOpen, onOpen: openTextModal, onClose: closeTextModal } = useDisclosure();
  
  const { extractTimelineThumbnails } = useFFmpeg();
  
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
    textOverlays,
  } = useEditorStore();

  // Export hook (server-side only)
  const {
    isExporting,
    exportProgress,
    handleServerExport: serverExport,
    handleCancelExport,
  } = useExport({
    projectId,
    onPause: pause,
  });

  // URL download hook
  const {
    urlInput,
    setUrlInput,
    isDownloading,
    downloadStep,
    handleUrlDownload,
    resetDownload,
  } = useUrlDownload({
    addAsset,
    addClip,
    getVideoTrackId: () => timeline.tracks.find(t => t.type === 'VIDEO')?.id,
    getLastClipEndMs: () => {
      const track = timeline.tracks.find(t => t.type === 'VIDEO');
      const lastClip = track?.clips[track.clips.length - 1];
      return lastClip?.endMs || 0;
    },
    onClose: () => {
      closeUrlModal();
      resetDownload();
    },
  });

  // History (undo/redo)
  const { undo, redo, canUndo, canRedo } = useHistory();
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
          logger.error('Failed to generate thumbnails', err);
        });
      }
      
      // Auto-add to timeline
      const trackType = isAudio ? 'AUDIO' : 'VIDEO';
      const track = useEditorStore.getState().timeline.tracks.find(t => t.type === trackType);
      
      if (track) {
        const lastClipEnd = track.clips.length > 0
          ? Math.max(...track.clips.map(c => c.endMs))
          : 0;
        
        // Generate linkId for video files (links video + audio clips)
        const linkId = isVideo ? `link-${id}` : undefined;
        
        addClip(track.id, {
          assetId: id,
          linkId,
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
        
        // For video files, also create a linked audio clip on AUDIO track
        if (isVideo) {
          const audioTrack = useEditorStore.getState().timeline.tracks.find(t => t.type === 'AUDIO');
          if (audioTrack) {
            addClip(audioTrack.id, {
              assetId: id,
              linkId, // Same linkId as video clip
              startMs: lastClipEnd,
              endMs: lastClipEnd + durationMs,
              trimStartMs: 0,
              trimEndMs: 0,
              transforms: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
              effects: { filters: [], speed: 1, volume: 1, fadeIn: 0, fadeOut: 0 },
              asset: {
                id: `${id}-audio`,
                name: `${file.name} (Audio)`,
                type: 'AUDIO',
                url,
                durationMs,
              },
            });
          }
        }
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addAsset, addClip, updateAsset, extractTimelineThumbnails]);

  // Helper to prepare clips for export
  const prepareClipsForExport = useCallback(() => {
    const videoTrack = timeline.tracks.find(t => t.type === 'VIDEO');
    if (!videoTrack || videoTrack.clips.length === 0) {
      return [];
    }

    return videoTrack.clips
      .sort((a, b) => a.startMs - b.startMs)
      .map(clip => {
        if (!clip.asset?.file) return null;
        
        // Include full transforms and effects for server-side processing
        const transforms = clip.transforms || { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
        const effects = clip.effects || { filters: [], speed: 1, volume: 1, fadeIn: 0, fadeOut: 0 };
        
        return {
          file: clip.asset.file,
          startTime: clip.trimStartMs / 1000,
          endTime: (clip.trimStartMs + (clip.endMs - clip.startMs)) / 1000,
          // Transforms
          transforms: {
            x: transforms.x,
            y: transforms.y,
            scale: transforms.scale,
            rotation: transforms.rotation,
            opacity: transforms.opacity,
          },
          // Effects
          effects: {
            filters: effects.filters || [],
            speed: effects.speed,
            volume: effects.volume,
            fadeIn: effects.fadeIn,
            fadeOut: effects.fadeOut,
          },
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [timeline.tracks]);

  // Export modal state
  // Export modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'assets' | 'preview' | 'inspector'>('preview');
  const onExportClick = useCallback(() => {
    const clips = prepareClipsForExport();
    if (clips.length === 0) {
      toast.error('Tidak ada klip untuk di-export');
      return;
    }
    setIsExportModalOpen(true);
  }, [prepareClipsForExport]);

  // Actual export execution from modal
  const handleExportConfirm = useCallback((settings: {
    format: 'MP4' | 'WEBM' | 'MOV';
    resolution: 'SD' | 'HD' | 'UHD';
    width?: number;
    height?: number;
    fps?: number;
  }) => {
    const clips = prepareClipsForExport();
    
    // Format text overlays
    const formattedTextOverlays = textOverlays.map(overlay => ({
      id: overlay.id,
      content: overlay.text,
      startMs: overlay.startMs,
      endMs: overlay.endMs,
      x: overlay.x,
      y: overlay.y,
      fontSize: overlay.fontSize,
      fontFamily: overlay.fontFamily,
      color: overlay.color,
      backgroundColor: overlay.backgroundColor,
    }));
    
    // Pass settings to serverExport
    serverExport(clips, formattedTextOverlays, settings);
  }, [prepareClipsForExport, textOverlays, serverExport]);

  // Delete selected clip
  const handleDeleteClip = () => {
    if (!selectedClipId) {
      toast.error('Pilih klip terlebih dahulu');
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
      toast.error('Pilih klip terlebih dahulu');
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

  // Split clip at playhead
  const handleSplitClip = () => {
    const state = useEditorStore.getState();
    
    // Find clip at current time
    let clipToSplit: { trackId: string; clip: typeof state.timeline.tracks[0]['clips'][0] } | null = null;
    
    for (const track of state.timeline.tracks) {
      const clip = track.clips.find(
        c => state.currentTimeMs > c.startMs && state.currentTimeMs < c.endMs
      );
      if (clip) {
        clipToSplit = { trackId: track.id, clip };
        break;
      }
    }
    
    if (!clipToSplit) {
      toast.error('Tidak ada klip di posisi playhead');
      return;
    }
    
    const { trackId, clip } = clipToSplit;
    const splitTimeMs = state.currentTimeMs;
    const relativeTime = splitTimeMs - clip.startMs;
    const clipDuration = clip.endMs - clip.startMs;
    const trimStart = clip.trimStartMs ?? 0;
    const trimEnd = clip.trimEndMs ?? 0;
    const assetDuration = clip.asset?.durationMs ?? (clipDuration + trimStart + trimEnd);
    const firstDuration = relativeTime;
    const secondDuration = clipDuration - relativeTime;
    
    const firstTrimStart = trimStart;
    const firstTrimEnd = Math.max(0, assetDuration - firstTrimStart - firstDuration);
    const secondTrimStart = trimStart + relativeTime;
    const secondTrimEnd = Math.max(0, assetDuration - secondTrimStart - secondDuration);
    
    // Update original clip to end at split point
    useEditorStore.getState().updateClip(trackId, clip.id, {
      endMs: splitTimeMs,
      trimStartMs: firstTrimStart,
      trimEndMs: firstTrimEnd,
    });
    
    // Create new clip starting from split point
    addClip(trackId, {
      assetId: clip.assetId ?? null,
      startMs: splitTimeMs,
      endMs: splitTimeMs + secondDuration,
      trimStartMs: secondTrimStart,
      trimEndMs: secondTrimEnd,
      transforms: clip.transforms,
      effects: clip.effects,
      asset: clip.asset,
    });
    
    toast.success('Klip berhasil dipotong');
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
      <header className="h-14 border-b border-divider flex items-center px-4 justify-between bg-content1 flex-shrink-0 z-20 overflow-x-auto no-scrollbar gap-4">
        <div className="flex items-center gap-4 flex-shrink-0">
          <Button 
            size="sm" 
            variant="light" 
            onPress={() => navigate('/dashboard')}
            className="min-w-0 px-2"
          >
            ← <span className="hidden md:inline ml-1">Kembali</span>
          </Button>
          
          {/* Undo/Redo buttons */}
          <div className="hidden md:flex items-center gap-1 border-l border-divider pl-4">
            <Tooltip content="Undo (Ctrl+Z)">
              <Button
                size="sm"
                variant="light"
                isIconOnly
                isDisabled={!canUndo}
                onPress={undo}
              >
                <Undo2 size={16} />
              </Button>
            </Tooltip>
            <Tooltip content="Redo (Ctrl+Shift+Z)">
              <Button
                size="sm"
                variant="light"
                isIconOnly
                isDisabled={!canRedo}
                onPress={redo}
              >
                <Redo2 size={16} />
              </Button>
            </Tooltip>
          </div>
          
          <h1 className="text-lg font-semibold">{projectTitle}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {isExporting ? (
            <div className="flex items-center gap-3 px-4">
              <div className="text-sm text-foreground/70">Exporting... {Math.round(exportProgress * 100)}%</div>
              <div className="w-24 h-1 bg-default-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${exportProgress * 100}%` }}
                />
              </div>
              <Button
                size="sm"
                variant="flat"
                color="danger"
                onPress={handleCancelExport}
              >
                Batal
              </Button>
            </div>
          ) : (
            <>
              <Button
                size="sm"
                variant="flat"
                startContent={<Upload size={16} />}
                onPress={() => fileInputRef.current?.click()}
                className="min-w-0"
              >
                <span className="hidden md:inline">Import</span>
              </Button>
              <Button
                size="sm"
                variant="flat"
                startContent={<Link size={16} />}
                onPress={openUrlModal}
                className="min-w-0 hidden sm:flex"
              >
               <span className="hidden md:inline">Import URL</span>
              </Button>
              <Button
                size="sm"
                variant="flat"
                startContent={<Mic size={16} />}
                onPress={openVoiceModal}
                className="min-w-0"
              >
                <span className="hidden md:inline">Record</span>
              </Button>
              <Button
                size="sm"
                variant="flat"
                startContent={<Type size={16} />}
                onPress={openTextModal}
                className="min-w-0"
              >
                <span className="hidden md:inline">Add Text</span>
              </Button>
              <Button
                size="sm"
                color="primary"
                startContent={<Download size={16} />}
                onPress={onExportClick}
                className="min-w-0"
              >
                <span className="hidden md:inline">Export</span>
              </Button>
            </>
          )}
        </div>
      </header>
      
      {/* Main area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left panel - Assets */}
        <AssetPanel className={clsx(
          "md:flex z-10", 
          mobileTab === 'assets' ? 'flex w-full absolute inset-0 md:static md:w-64' : 'hidden'
        )} />
        
        {/* Center - Preview + Controls */}
        <div className={clsx(
          "flex-1 flex flex-col min-w-0 min-h-0",
          mobileTab !== 'preview' ? 'hidden md:flex' : 'flex'
        )}>
          {/* Video Preview - use min-h-0 to allow shrinking */}
          <div className="flex-1 flex items-center justify-center bg-content2 dark:bg-black/50 p-4 min-h-0 overflow-hidden">
            <VideoPreview />
          </div>
          
          {/* Playback controls */}
          <div className="h-16 border-t border-divider flex items-center md:justify-center overflow-x-auto no-scrollbar gap-4 px-4 flex-shrink-0 bg-background">
            <div className="flex items-center gap-2 flex-shrink-0">
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
                className="w-24 hidden md:flex"
                aria-label="Zoom level"
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
        
        {/* Right panel - Inspector */}
        <InspectorPanel className={clsx(
          "md:flex z-10", 
          mobileTab === 'inspector' ? 'flex w-full absolute inset-0 md:static md:w-80' : 'hidden'
        )} />
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden h-14 border-t border-divider bg-content1 flex items-center justify-around px-2 flex-shrink-0">
        <Button 
          variant={mobileTab === 'assets' ? 'flat' : 'light'} 
          color={mobileTab === 'assets' ? 'primary' : 'default'}
          className="flex-1 flex flex-col gap-1 h-full py-2 rounded-none"
          onPress={() => setMobileTab('assets')}
        >
          <LayoutTemplate size={20} />
          <span className="text-[10px]">Assets</span>
        </Button>
        <Button 
          variant={mobileTab === 'preview' ? 'flat' : 'light'} 
          color={mobileTab === 'preview' ? 'primary' : 'default'}
          className="flex-1 flex flex-col gap-1 h-full py-2 rounded-none"
          onPress={() => setMobileTab('preview')}
        >
          <MonitorPlay size={20} />
          <span className="text-[10px]">Preview</span>
        </Button>
        <Button 
          variant={mobileTab === 'inspector' ? 'flat' : 'light'} 
          color={mobileTab === 'inspector' ? 'primary' : 'default'}
          className="flex-1 flex flex-col gap-1 h-full py-2 rounded-none"
          onPress={() => setMobileTab('inspector')}
        >
          <SlidersHorizontal size={20} />
          <span className="text-[10px]">Edit</span>
        </Button>
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
      <Modal isOpen={isUrlModalOpen} onClose={closeUrlModal} size="lg">
        <ModalContent>
          <ModalHeader>Import dari URL</ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="URL Video"
              placeholder="https://youtube.com/watch?v=... atau TikTok/Instagram/Sora"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              description="Mendukung: YouTube, TikTok, Instagram, Twitter, Facebook, Sora AI"
              isDisabled={isDownloading}
            />
            
            {/* URL Preview Embed */}
            {urlInput && !isDownloading && (() => {
              const url = urlInput.trim();
              
              // YouTube - Show warning instead of embed
              if (url.includes('youtube.com') || url.includes('youtu.be')) {
                return (
                  <div className="rounded-lg overflow-hidden bg-warning/10 border border-warning/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-warning text-xl">⚠️</div>
                      <div>
                        <p className="font-medium text-warning mb-1">YouTube Download Terbatas</p>
                        <p className="text-sm text-foreground/70 mb-2">
                          Google memblokir download otomatis dari YouTube. Sebagai alternatif:
                        </p>
                        <ul className="text-sm text-foreground/60 list-disc list-inside space-y-1">
                          <li>Gunakan <strong>TikTok</strong> atau <strong>Instagram</strong> (100% work)</li>
                          <li>Download manual dari YouTube lalu upload file</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // TikTok - 100% supported
              if (url.includes('tiktok.com')) {
                return (
                  <div className="rounded-lg overflow-hidden bg-success/10 border border-success/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-success text-xl">✅</div>
                      <div>
                        <p className="font-medium text-success mb-1">TikTok Siap Download</p>
                        <p className="text-sm text-foreground/60">
                          Video TikTok akan didownload dan langsung ditambahkan ke timeline.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Instagram - 100% supported
              if (url.includes('instagram.com')) {
                return (
                  <div className="rounded-lg overflow-hidden bg-success/10 border border-success/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-success text-xl">✅</div>
                      <div>
                        <p className="font-medium text-success mb-1">Instagram Siap Download</p>
                        <p className="text-sm text-foreground/60">
                          Video/Reels Instagram akan didownload dan ditambahkan ke timeline.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Twitter/X - supported
              if (url.includes('twitter.com') || url.includes('x.com')) {
                return (
                  <div className="rounded-lg overflow-hidden bg-success/10 border border-success/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-success text-xl">✅</div>
                      <div>
                        <p className="font-medium text-success mb-1">Twitter/X Siap Download</p>
                        <p className="text-sm text-foreground/60">
                          Video Twitter/X akan didownload dan ditambahkan ke timeline.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Facebook - supported
              if (url.includes('facebook.com') || url.includes('fb.watch')) {
                return (
                  <div className="rounded-lg overflow-hidden bg-success/10 border border-success/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-success text-xl">✅</div>
                      <div>
                        <p className="font-medium text-success mb-1">Facebook Siap Download</p>
                        <p className="text-sm text-foreground/60">
                          Video Facebook akan didownload dan ditambahkan ke timeline.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Sora AI - supported
              if (url.includes('sora.chatgpt.com')) {
                return (
                  <div className="rounded-lg overflow-hidden bg-success/10 border border-success/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-success text-xl">✨</div>
                      <div>
                        <p className="font-medium text-success mb-1">Sora AI Video Siap Download</p>
                        <p className="text-sm text-foreground/60">
                          Video AI dari OpenAI Sora akan didownload dan ditambahkan ke timeline.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return null;
            })()}
            
            {isDownloading && downloadStep > 0 && (
              <div className="mt-4 space-y-2">
                {[
                  { step: 1, label: 'Mengirim request...' },
                  { step: 2, label: 'Mendownload video...' },
                  { step: 3, label: 'Mengambil file...' },
                  { step: 4, label: 'Menambahkan ke timeline...' },
                ].map(({ step, label }) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                      ${downloadStep > step ? 'bg-success text-white' : 
                        downloadStep === step ? 'bg-primary text-white animate-pulse' : 
                        'bg-default-200 text-foreground/40'}`}
                    >
                      {downloadStep > step ? '✓' : step}
                    </div>
                    <span className={`text-sm ${downloadStep >= step ? 'text-foreground' : 'text-foreground/40'}`}>
                      {label}
                    </span>
                  </div>
                ))}
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
      
      {/* Text Overlay Editor Modal */}
      <TextOverlayEditor
        isOpen={isTextModalOpen}
        onClose={closeTextModal}
      />

      {/* Export Modal */}
      <ExportModal 
        isOpen={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        onExport={handleExportConfirm}
        isExporting={isExporting}
      />
    </div>
  );
}
