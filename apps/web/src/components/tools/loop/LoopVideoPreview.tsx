import {
  FileVideo2,
  LoaderCircle,
  RotateCcw,
  Upload,
  Volume2,
  VolumeX,
  WandSparkles,
} from 'lucide-react';
import { type ChangeEvent, type RefObject, useCallback, useEffect, useRef } from 'react';
import { Button, Card, CardBody, CardHeader } from '@/components/ui';
import type { LoopPreviewPhase } from '@/hooks/useLoopCreator';
import { cn } from '@/lib/utils';
import type {
  LoopCreatorProjectDocument,
  LoopSourceInfo,
} from '@/services/loop-creator-project-api';
import {
  resolveLoopPreviewStartSeconds,
  shouldRestartPlayingLoopPreview,
} from './loop-preview-utils';

interface LoopVideoPreviewProps {
  readonly videoUrl: string;
  readonly videoRef: RefObject<HTMLVideoElement | null>;
  readonly fileInputRef: RefObject<HTMLInputElement | null>;
  readonly sourceInfo?: LoopSourceInfo;
  readonly trimStartMs: number;
  readonly trimEndMs: number;
  readonly aspectRatio: LoopCreatorProjectDocument['output']['aspectRatio'];
  readonly audioMuted: boolean;
  readonly transitionMode: LoopCreatorProjectDocument['transition']['mode'];
  readonly loopPreviewUrl: string;
  readonly loopPreviewPhase: LoopPreviewPhase;
  readonly loopPreviewError: string | null;
  readonly onRetryPreview: () => void;
  readonly onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onCreatePrompt: () => void;
}

export interface LoopVideoPlayerProps {
  playbackUrl: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  backgroundVideoRef: RefObject<HTMLVideoElement | null>;
  sourceInfo?: LoopSourceInfo;
  aspectRatio: LoopCreatorProjectDocument['output']['aspectRatio'];
  audioMuted: boolean;
  isSeamless: boolean;
  usesOutputCanvas: boolean;
  loopPreviewPhase: LoopPreviewPhase;
  loopPreviewError: string | null;
  onRetryPreview: () => void;
  syncBackgroundVideo: () => void;
  handlePlay: () => void;
  handlePause: () => void;
  handleTimeUpdate: () => void;
  handleEnded: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export function LoopVideoPreview({
  videoUrl,
  videoRef,
  fileInputRef,
  sourceInfo,
  trimStartMs,
  trimEndMs,
  aspectRatio,
  audioMuted,
  transitionMode,
  loopPreviewUrl,
  loopPreviewPhase,
  loopPreviewError,
  onRetryPreview,
  onFileSelect,
  onCreatePrompt,
}: LoopVideoPreviewProps) {
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const isSeamless = transitionMode === 'smooth';
  const playbackUrl = isSeamless ? loopPreviewUrl : videoUrl;
  const usesOutputCanvas = !isSeamless && aspectRatio !== 'original';

  const syncBackgroundVideo = useCallback(() => {
    const video = videoRef.current;
    const background = backgroundVideoRef.current;
    if (!video || !background || !usesOutputCanvas) return;
    if (Math.abs(background.currentTime - video.currentTime) > 0.08) {
      background.currentTime = video.currentTime;
    }
    if (video.paused) {
      background.pause();
      return;
    }
    void background.play().catch(() => undefined);
  }, [usesOutputCanvas, videoRef]);

  useEffect(() => {
    syncBackgroundVideo();
  }, [syncBackgroundVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && playbackUrl && trimEndMs > trimStartMs) {
      video.currentTime = isSeamless ? 0 : resolveLoopPreviewStartSeconds(trimStartMs);
    }
    video?.pause();
  }, [isSeamless, playbackUrl, trimEndMs, trimStartMs, videoRef]);

  const restartLoopPreview = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = resolveLoopPreviewStartSeconds(trimStartMs);
    syncBackgroundVideo();
    void video.play().catch(() => undefined);
  }, [syncBackgroundVideo, trimStartMs, videoRef]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isSeamless) return;
    syncBackgroundVideo();
    if (shouldRestartPlayingLoopPreview(video.paused, video.currentTime, trimEndMs)) {
      restartLoopPreview();
    }
  };

  const handlePause = () => {
    syncBackgroundVideo();
  };

  const handleEnded = () => {
    if (!isSeamless) restartLoopPreview();
  };

  const handlePlay = () => {
    const video = videoRef.current;
    if (
      !isSeamless &&
      video &&
      (video.currentTime < trimStartMs / 1000 || video.currentTime >= trimEndMs / 1000)
    ) {
      video.currentTime = resolveLoopPreviewStartSeconds(trimStartMs);
    }
    syncBackgroundVideo();
  };

  return (
    <Card className="h-full border-border/60 bg-card/70">
      <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <FileVideo2 size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight">Source Video</h2>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">
            Satu video siap pakai
          </p>
        </div>
      </CardHeader>
      <CardBody className="p-5">
        {videoUrl ? (
          <div className="space-y-4">
            <LoopVideoPlayer
              playbackUrl={playbackUrl}
              videoRef={videoRef}
              backgroundVideoRef={backgroundVideoRef}
              sourceInfo={sourceInfo}
              aspectRatio={aspectRatio}
              audioMuted={audioMuted}
              isSeamless={isSeamless}
              usesOutputCanvas={usesOutputCanvas}
              loopPreviewPhase={loopPreviewPhase}
              loopPreviewError={loopPreviewError}
              onRetryPreview={onRetryPreview}
              syncBackgroundVideo={syncBackgroundVideo}
              handlePlay={handlePlay}
              handlePause={handlePause}
              handleTimeUpdate={handleTimeUpdate}
              handleEnded={handleEnded}
              fileInputRef={fileInputRef}
            />
          </div>
        ) : (
          <LoopEmptyState fileInputRef={fileInputRef} onCreatePrompt={onCreatePrompt} />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={onFileSelect}
          className="hidden"
        />
      </CardBody>
    </Card>
  );
}

function getPreviewAspectRatio(
  ratio: LoopCreatorProjectDocument['output']['aspectRatio'],
  sourceInfo?: LoopSourceInfo,
): number {
  if (ratio === 'original') {
    return sourceInfo ? sourceInfo.width / sourceInfo.height : 16 / 9;
  }
  return { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '4:5': 4 / 5 }[ratio];
}

function getPreviewFrameClass(
  ratio: LoopCreatorProjectDocument['output']['aspectRatio'],
  sourceInfo?: LoopSourceInfo,
): string {
  const resolvedRatio = getPreviewAspectRatio(ratio, sourceInfo);
  if (resolvedRatio < 0.7) return 'w-full max-w-[400px]';
  if (resolvedRatio < 1) return 'w-full max-w-[520px]';
  if (resolvedRatio === 1) return 'w-full max-w-[580px]';
  return 'w-full';
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`;
}

function formatSourceOrientation(sourceInfo: LoopSourceInfo): string {
  const ratio = sourceInfo.width / sourceInfo.height;
  if (Math.abs(ratio - 1) < 0.02) {
    return `Square ${sourceInfo.width} x ${sourceInfo.height}`;
  }
  if (ratio < 1) {
    return `Portrait ${sourceInfo.width} x ${sourceInfo.height}`;
  }
  return `Landscape ${sourceInfo.width} x ${sourceInfo.height}`;
}

function LoopEmptyState({
  fileInputRef,
  onCreatePrompt,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onCreatePrompt: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-muted/10 px-5 py-6 text-center">
        <p className="text-lg font-black">Buat video ambience menjadi loop panjang</p>
        <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-muted-foreground">
          Sudah punya video ambience? Upload dan perpanjang menjadi loop seamless.
        </p>
        <Button
          className="mt-5 h-12 rounded-xl px-7 font-bold"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={18} />
          Upload Video
        </Button>
      </div>
      <button
        type="button"
        className="flex min-h-[112px] w-full items-center gap-4 rounded-2xl border border-border/60 bg-muted/10 px-5 text-left transition-colors hover:border-primary/45 hover:bg-primary/5"
        onClick={onCreatePrompt}
      >
        <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <WandSparkles size={24} />
        </span>
        <span>
          <span className="block text-base font-bold">Buat Prompt Video Loop</span>
          <span className="mt-1 block text-sm font-medium text-muted-foreground">
            Belum punya video? Buat prompt siap pakai untuk generator video AI.
          </span>
        </span>
      </button>
      <p className="text-center text-xs font-semibold text-muted-foreground">
        File upload: MP4, MOV, atau WebM - maksimal 200 MB
      </p>
    </div>
  );
}

function LoopVideoPlayer({
  playbackUrl,
  videoRef,
  backgroundVideoRef,
  sourceInfo,
  aspectRatio,
  audioMuted,
  isSeamless,
  usesOutputCanvas,
  loopPreviewPhase,
  loopPreviewError,
  onRetryPreview,
  syncBackgroundVideo,
  handlePlay,
  handlePause,
  handleTimeUpdate,
  handleEnded,
  fileInputRef,
}: LoopVideoPlayerProps) {
  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-muted/10 p-3">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <p className="text-[11px] font-black uppercase text-muted-foreground">Preview Loop</p>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
            {isSeamless ? 'Loop Seamless' : 'Loop Asli'}
          </span>
        </div>
        <div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-xl bg-black/80 p-3">
          <div
            className={cn(
              'relative max-w-full overflow-hidden rounded-lg bg-black',
              getPreviewFrameClass(aspectRatio, sourceInfo),
            )}
            style={{ aspectRatio: getPreviewAspectRatio(aspectRatio, sourceInfo) }}
          >
            {usesOutputCanvas && playbackUrl ? (
              <video
                ref={backgroundVideoRef}
                src={playbackUrl}
                aria-hidden="true"
                muted
                playsInline
                tabIndex={-1}
                className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl saturate-125"
                onLoadedMetadata={syncBackgroundVideo}
              >
                <track kind="captions" />
              </video>
            ) : null}
            {playbackUrl ? (
              <video
                ref={videoRef}
                src={playbackUrl}
                controls
                loop={isSeamless}
                muted={audioMuted}
                playsInline
                className="absolute inset-0 z-10 h-full w-full bg-transparent object-contain"
                onLoadedMetadata={syncBackgroundVideo}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeeked={syncBackgroundVideo}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
              >
                <track kind="captions" />
              </video>
            ) : null}
            {!playbackUrl && isSeamless ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center">
                {loopPreviewPhase === 'failed' ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      {loopPreviewError ?? 'Preview loop belum dapat dibuat.'}
                    </p>
                    <Button variant="outline" className="h-10 rounded-xl" onClick={onRetryPreview}>
                      <RotateCcw size={15} />
                      Coba Lagi
                    </Button>
                  </>
                ) : (
                  <>
                    <LoaderCircle size={24} className="animate-spin text-primary" />
                    <p className="text-sm font-semibold text-muted-foreground">
                      Menyiapkan preview seamless...
                    </p>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {sourceInfo ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{sourceInfo.assetName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span>{formatDuration(sourceInfo.durationMs)}</span>
              <span aria-hidden="true">•</span>
              <span>{formatSourceOrientation(sourceInfo)}</span>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1.5">
                {sourceInfo.hasAudio ? <Volume2 size={14} /> : <VolumeX size={14} />}
                {sourceInfo.hasAudio ? 'Audio tersedia' : 'Tanpa audio'}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="h-10 shrink-0 rounded-xl sm:px-3"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={15} />
            Ganti Video
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="h-11 rounded-xl"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={15} />
          Ganti Video
        </Button>
      )}
    </>
  );
}
