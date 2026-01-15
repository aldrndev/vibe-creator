import { useEffect, useCallback, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import { useParams } from "react-router-dom";
import { useEditorStore } from "@/stores/editor-store";
import { useFFmpeg } from "@/hooks/use-ffmpeg";
import { useExport } from "@/hooks/use-export";
import { useUrlDownload } from "@/hooks/use-url-download";
import { useHistory } from "@/hooks/use-history";

// New components
import { EditorHeader } from "@/components/editor/layout/EditorHeader";
import { EditorMainArea } from "@/components/editor/layout/EditorMainArea";
import { EditorModals } from "@/components/editor/modals/EditorModals";

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Hooks
  const { extractTimelineThumbnails } = useFFmpeg();
  const {
    projectTitle,
    timeline,
    currentTimeMs,
    isPlaying,
    selectedClipId,
    initProject,
    resetEditor,
    setCurrentTime,
    pause,
    togglePlayback,
    addAsset,
    updateAsset,
    addClip,
    removeClip,
    textOverlays,
  } = useEditorStore();

  const {
    isExporting,
    exportProgress,
    handleServerExport: serverExport,
    handleCancelExport,
  } = useExport({
    projectId,
    onPause: pause,
  });

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
    getVideoTrackId: () => timeline.tracks.find((t) => t.type === "VIDEO")?.id,
    getLastClipEndMs: () => {
      const track = timeline.tracks.find((t) => t.type === "VIDEO");
      const lastClip = track?.clips[track.clips.length - 1];
      return lastClip?.endMs || 0;
    },
    onClose: () => {
      setIsUrlModalOpen(false);
      resetDownload();
    },
  });

  const { undo, redo, canUndo, canRedo } = useHistory();

  // Initialize project
  useEffect(() => {
    if (projectId) {
      initProject(projectId, "New Project");
    }
    return () => {
      resetEditor();
    };
  }, [projectId, initProject, resetEditor]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlayback();
          break;
        case "Delete":
        case "Backspace":
          if (selectedClipId) {
            const state = useEditorStore.getState();
            for (const track of state.timeline.tracks) {
              const clip = track.clips.find((c) => c.id === selectedClipId);
              if (clip) {
                removeClip(track.id, selectedClipId);
                break;
              }
            }
          }
          break;
        case "ArrowLeft":
          setCurrentTime(currentTimeMs - (e.shiftKey ? 1000 : 100));
          break;
        case "ArrowRight":
          setCurrentTime(currentTimeMs + (e.shiftKey ? 1000 : 100));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlayback,
    selectedClipId,
    removeClip,
    currentTimeMs,
    setCurrentTime,
  ]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const state = useEditorStore.getState();
      const newTime = state.currentTimeMs + 33; // ~30fps
      if (
        newTime >= state.timeline.durationMs &&
        state.timeline.durationMs > 0
      ) {
        pause();
        setCurrentTime(0);
      } else {
        setCurrentTime(newTime);
      }
    }, 33);
    return () => clearInterval(interval);
  }, [isPlaying, pause, setCurrentTime]);

  // File import handler
  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith("video/");
        const isAudio = file.type.startsWith("audio/");
        const isImage = file.type.startsWith("image/");

        if (!isVideo && !isAudio && !isImage) continue;

        const url = URL.createObjectURL(file);
        const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        let durationMs = 5000;
        let width: number | undefined;
        let height: number | undefined;

        if (isVideo || isAudio) {
          const media = document.createElement(isVideo ? "video" : "audio");
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

        addAsset({
          id,
          name: file.name,
          type: isVideo ? "VIDEO" : isAudio ? "AUDIO" : "IMAGE",
          url,
          file: isVideo ? file : undefined,
          durationMs,
          width,
          height,
        });

        if (isVideo) {
          extractTimelineThumbnails(file, 20)
            .then((thumbnails) => {
              updateAsset(id, { thumbnails });
            })
            .catch((err) => {
              logger.error("Failed to generate thumbnails", err);
            });
        }

        const trackType = isAudio ? "AUDIO" : "VIDEO";
        const track = useEditorStore
          .getState()
          .timeline.tracks.find((t) => t.type === trackType);

        if (track) {
          const lastClipEnd =
            track.clips.length > 0
              ? Math.max(...track.clips.map((c) => c.endMs))
              : 0;
          const linkId = isVideo ? `link-${id}` : undefined;

          addClip(track.id, {
            assetId: id,
            linkId,
            startMs: lastClipEnd,
            endMs: lastClipEnd + durationMs,
            trimStartMs: 0,
            trimEndMs: 0,
            transforms: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
            effects: {
              filters: [],
              speed: 1,
              volume: 1,
              fadeIn: 0,
              fadeOut: 0,
            },
            asset: {
              id,
              name: file.name,
              type: isVideo ? "VIDEO" : isAudio ? "AUDIO" : "IMAGE",
              url,
              file: isVideo ? file : undefined,
              durationMs,
              width,
              height,
            },
          });

          if (isVideo) {
            const audioTrack = useEditorStore
              .getState()
              .timeline.tracks.find((t) => t.type === "AUDIO");
            if (audioTrack) {
              addClip(audioTrack.id, {
                assetId: id,
                linkId,
                startMs: lastClipEnd,
                endMs: lastClipEnd + durationMs,
                trimStartMs: 0,
                trimEndMs: 0,
                transforms: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
                effects: {
                  filters: [],
                  speed: 1,
                  volume: 1,
                  fadeIn: 0,
                  fadeOut: 0,
                },
                asset: {
                  id: `${id}-audio`,
                  name: `${file.name} (Audio)`,
                  type: "AUDIO",
                  url,
                  durationMs,
                },
              });
            }
          }
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addAsset, addClip, updateAsset, extractTimelineThumbnails]
  );

  const prepareClipsForExport = useCallback(() => {
    const videoTrack = timeline.tracks.find((t) => t.type === "VIDEO");
    if (!videoTrack || videoTrack.clips.length === 0) return [];
    return videoTrack.clips
      .sort((a, b) => a.startMs - b.startMs)
      .map((clip) => {
        if (!clip.asset?.file) return null;
        const transforms = clip.transforms || {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
        };
        const effects = clip.effects || {
          filters: [],
          speed: 1,
          volume: 1,
          fadeIn: 0,
          fadeOut: 0,
        };
        return {
          file: clip.asset.file,
          startTime: clip.trimStartMs / 1000,
          endTime: (clip.trimStartMs + (clip.endMs - clip.startMs)) / 1000,
          transforms,
          effects,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [timeline.tracks]);

  const onExportClick = useCallback(() => {
    const clips = prepareClipsForExport();
    if (clips.length === 0) return;
    setIsExportModalOpen(true);
  }, [prepareClipsForExport]);

  const handleExportConfirm = useCallback(
    (settings: {
      format: "MP4" | "WEBM" | "MOV";
      resolution: "SD" | "HD" | "UHD";
      width?: number;
      height?: number;
      fps?: number;
    }) => {
      const clips = prepareClipsForExport();
      const formattedTextOverlays = textOverlays.map((overlay) => ({
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
      serverExport(clips, formattedTextOverlays, settings);
    },
    [prepareClipsForExport, textOverlays, serverExport]
  );

  const handleVoiceSave = (blob: Blob, duration: number) => {
    const file = new File([blob], `recording-${Date.now()}.webm`, {
      type: blob.type,
    });
    const assetId = `audio-${Date.now()}`;
    addAsset({
      id: assetId,
      name: `Voice Recording (${Math.round(duration / 1000)}s)`,
      type: "AUDIO",
      url: URL.createObjectURL(blob),
      file,
      durationMs: duration,
    });
    const audioTrack = timeline.tracks.find((t) => t.type === "AUDIO");
    if (audioTrack) {
      const lastClipEnd =
        audioTrack.clips.length > 0
          ? Math.max(...audioTrack.clips.map((c) => c.endMs))
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

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <EditorHeader
        projectTitle={projectTitle}
        isExporting={isExporting}
        exportProgress={exportProgress}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onEmulateImport={() => fileInputRef.current?.click()}
        onImportUrl={() => setIsUrlModalOpen(true)}
        onRecord={() => setIsVoiceModalOpen(true)}
        onAddText={() => setIsTextModalOpen(true)}
        onExport={onExportClick}
        onCancelExport={handleCancelExport}
      />

      <EditorMainArea />

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        onChange={handleFileImport}
        className="hidden"
      />

      <EditorModals
        isUrlModalOpen={isUrlModalOpen}
        closeUrlModal={() => setIsUrlModalOpen(false)}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        isDownloading={isDownloading}
        downloadStep={downloadStep}
        handleUrlDownload={handleUrlDownload}
        isVoiceModalOpen={isVoiceModalOpen}
        closeVoiceModal={() => setIsVoiceModalOpen(false)}
        handleVoiceSave={handleVoiceSave}
        isTextModalOpen={isTextModalOpen}
        closeTextModal={() => setIsTextModalOpen(false)}
        isExportModalOpen={isExportModalOpen}
        setIsExportModalOpen={setIsExportModalOpen}
        handleExportConfirm={handleExportConfirm}
        isExporting={isExporting}
      />
    </div>
  );
}
