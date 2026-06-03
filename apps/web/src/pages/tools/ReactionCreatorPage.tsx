import {
  Camera,
  Check,
  Download,
  Loader2,
  MonitorPlay,
  Play,
  RefreshCw,
  SlidersHorizontal,
  StopCircle,
  Upload,
  Video,
} from 'lucide-react';
import { type CSSProperties, type RefObject, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ReactionRenderDialog } from '@/components/tools/reaction/ReactionRenderDialog';
import { Button, Card, Slider } from '@/components/ui';
import { PageTransition } from '@/components/ui/PageTransition';
import { ContinueWorkspaceDialog } from '@/components/workspace/ContinueWorkspaceDialog';
import { useReactionCreator } from '@/hooks/useReactionCreator';
import { cn } from '@/lib/utils';
import type { ReactionCreatorProjectDocument } from '@/services/reaction-creator-project-api';

const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', helper: 'Ikuti video', previewClassName: 'aspect-video' },
  { id: '16:9', label: '16:9', helper: 'Landscape', previewClassName: 'aspect-video' },
  { id: '9:16', label: '9:16', helper: 'Short', previewClassName: 'aspect-[9/16]' },
  { id: '1:1', label: '1:1', helper: 'Square', previewClassName: 'aspect-square' },
  { id: '4:5', label: '4:5', helper: 'Portrait', previewClassName: 'aspect-[4/5]' },
] as const;

const LAYOUTS = [
  { id: 'pip', label: 'PiP', description: 'Reaction kecil di atas video utama.' },
  { id: 'side-by-side', label: 'Side by Side', description: 'Horizontal atau vertical.' },
] as const;

const PIP_POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-right', label: 'Bottom Right' },
] as const;

type ReactionSourceSummary = {
  readonly main?: {
    readonly assetName: string;
    readonly durationMs: number;
    readonly width: number;
    readonly height: number;
    readonly hasAudio: boolean;
  };
  readonly reaction?: {
    readonly assetName: string;
    readonly durationMs: number;
    readonly width: number;
    readonly height: number;
    readonly hasAudio: boolean;
  };
};

type ReactionVideoFraming = ReactionCreatorProjectDocument['layout']['mainFraming'];

export function ReactionCreatorPage() {
  const [params, setParams] = useSearchParams();
  const sessionId = params.get('session') ?? undefined;
  const [showContinue, setShowContinue] = useState(!sessionId);
  const reaction = useReactionCreator(sessionId);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const reactionPreviewRef = useRef<HTMLVideoElement>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  useEffect(() => {
    if (!sessionId && reaction.state.projectId) {
      setParams({ session: reaction.state.projectId }, { replace: true });
    }
  }, [reaction.state.projectId, sessionId, setParams]);

  useEffect(() => {
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = reaction.state.cameraStream;
    }
  }, [reaction.state.cameraStream]);

  useEffect(() => {
    const main = reaction.refs.mainVideoRef.current;
    const side = reactionPreviewRef.current;
    if (main) {
      main.volume = reaction.state.document.audio.muteMain
        ? 0
        : Math.min(1, reaction.state.document.audio.mainVolume);
    }
    if (side) {
      side.volume = reaction.state.document.audio.muteReaction
        ? 0
        : Math.min(1, reaction.state.document.audio.reactionVolume);
    }
  }, [reaction.state.document.audio, reaction.refs.mainVideoRef.current]);

  const handlePlayPreview = () => {
    const main = reaction.refs.mainVideoRef.current;
    const side = reactionPreviewRef.current;
    if (!main) return;

    if (isPreviewPlaying) {
      main.pause();
      side?.pause();
      setIsPreviewPlaying(false);
      return;
    }

    main.currentTime = 0;
    if (side) {
      side.currentTime = Math.max(0, reaction.state.document.sync.reactionOffsetMs / 1000);
      void side.play();
    }
    void main.play();
    setIsPreviewPlaying(true);
  };

  return (
    <PageTransition className="min-h-full bg-background p-4 md:p-6">
      {!sessionId && showContinue ? (
        <ContinueWorkspaceDialog
          tool="reaction-video"
          onStartNew={() => {
            setShowContinue(false);
            reaction.actions.startNew();
          }}
          onUnavailable={() => setShowContinue(false)}
        />
      ) : null}

      <div className="mx-auto max-w-6xl">
        <ReactionPageHeader
          title={reaction.state.title}
          hasMainVideo={reaction.state.hasMainVideo}
          isSaving={reaction.state.isSaving}
          onTitleChange={reaction.actions.setTitle}
        />

        {reaction.state.message ? (
          <div className="mb-5 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            {reaction.state.message}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <Card className="overflow-hidden rounded-2xl border-border/55 bg-card">
            <div className="flex items-center gap-3 border-b border-border/45 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <MonitorPlay size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black">Preview</h2>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Record reaction sambil menonton
                </p>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <input
                ref={reaction.refs.mainInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void reaction.actions.selectMainVideo(file);
                  event.target.value = '';
                }}
              />
              <input
                ref={reaction.refs.reactionInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void reaction.actions.selectReactionVideo(file, 'uploaded');
                  event.target.value = '';
                }}
              />

              <ReactionStage
                document={reaction.state.document}
                sourceInfo={reaction.state.sourceInfo}
                mainVideoUrl={reaction.state.mainVideoUrl}
                reactionVideoUrl={
                  reaction.state.pendingRecording?.previewUrl ?? reaction.state.reactionVideoUrl
                }
                mainVideoRef={reaction.refs.mainVideoRef}
                reactionVideoRef={reactionPreviewRef}
                liveVideoRef={liveVideoRef}
                isPreviewPlaying={isPreviewPlaying}
                recordingPhase={reaction.state.recordingPhase}
                recordingCountdown={reaction.state.recordingCountdown}
                recordingError={reaction.state.recordingError}
                hasReactionVideo={reaction.state.hasReactionVideo}
                hasPendingRecording={Boolean(reaction.state.pendingRecording)}
                onPlayPreview={handlePlayPreview}
                onPreviewEnded={() => setIsPreviewPlaying(false)}
                onUploadMain={() => reaction.refs.mainInputRef.current?.click()}
                onUploadReaction={() => reaction.refs.reactionInputRef.current?.click()}
                onStartRecording={() => void reaction.actions.startRecording()}
                onStopRecording={reaction.actions.stopRecording}
                onAcceptRecording={() => void reaction.actions.acceptRecording()}
                onDiscardRecording={reaction.actions.discardRecording}
              />

              <SourceSummary
                sourceInfo={reaction.state.sourceInfo}
                hasMainVideo={reaction.state.hasMainVideo}
                hasReactionVideo={reaction.state.hasReactionVideo}
              />

              <ReactionStepGuide
                hasMainVideo={reaction.state.hasMainVideo}
                hasReactionVideo={reaction.state.hasReactionVideo}
              />
            </div>
          </Card>

          <ReactionSettingsPanel
            document={reaction.state.document}
            disabled={reaction.state.isLoading || reaction.state.isSaving}
            hasMainVideo={reaction.state.hasMainVideo}
            hasReactionVideo={reaction.state.hasReactionVideo}
            canRender={reaction.state.hasMainVideo && reaction.state.hasReactionVideo}
            onChange={reaction.actions.updateDocument}
            onRender={() => void reaction.actions.renderReaction()}
          />
        </div>
      </div>

      <ReactionRenderDialog
        open={reaction.state.renderOpen}
        phase={reaction.state.renderPhase}
        progress={reaction.state.renderProgress}
        error={reaction.state.renderError}
        notice={reaction.state.renderNotice}
        result={reaction.state.renderResult}
        onOpenChange={reaction.actions.setRenderOpen}
        onDownload={reaction.actions.downloadResult}
        onEditBack={() => reaction.actions.setRenderOpen(false)}
        onRetry={() => void reaction.actions.renderReaction()}
      />
    </PageTransition>
  );
}

function ReactionPageHeader({
  title,
  hasMainVideo,
  isSaving,
  onTitleChange,
}: {
  readonly title: string;
  readonly hasMainVideo: boolean;
  readonly isSaving: boolean;
  readonly onTitleChange: (value: string) => void;
}) {
  const statusLabel = !hasMainVideo ? 'Draft baru' : isSaving ? 'Menyimpan...' : 'Auto-saved';

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-primary text-white shadow-lg shadow-primary/20">
          <Video size={24} />
        </div>
        <div>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full max-w-md bg-transparent text-2xl font-black text-foreground outline-none"
          />
          <p className="text-sm font-semibold text-muted-foreground">
            Reaction Recorder • {statusLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReactionStepGuide({
  hasMainVideo,
  hasReactionVideo,
}: {
  readonly hasMainVideo: boolean;
  readonly hasReactionVideo: boolean;
}) {
  const activeStep = hasReactionVideo ? 3 : hasMainVideo ? 2 : 1;
  const steps = [
    { id: 1, shortTitle: 'Upload', title: 'Upload video utama' },
    { id: 2, shortTitle: 'Reaction', title: 'Record/Upload Reaction' },
    { id: 3, shortTitle: 'Render', title: 'Render Video' },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/45 bg-muted/10 p-2 sm:flex sm:items-center sm:px-4 sm:py-3">
      {steps.map((step, index) => {
        const isActive = step.id === activeStep;
        const isDone = step.id < activeStep;
        return (
          <div className="contents" key={step.id}>
            <div
              className={cn(
                'flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2 sm:shrink-0 sm:justify-start sm:p-0',
                isActive ? 'text-foreground' : 'text-muted-foreground',
                isActive && 'bg-primary/10 sm:bg-transparent',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black',
                  isDone || isActive ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {isDone ? <Check size={14} /> : step.id}
              </span>
              <span className="min-w-0 truncate text-xs font-black sm:text-sm">
                <span className="sm:hidden">{step.shortTitle}</span>
                <span className="hidden sm:inline">{step.title}</span>
              </span>
            </div>
            {index < steps.length - 1 ? (
              <span className="mx-4 hidden h-px min-w-6 flex-1 bg-border/60 sm:block" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ReactionStage({
  document,
  sourceInfo,
  mainVideoUrl,
  reactionVideoUrl,
  mainVideoRef,
  reactionVideoRef,
  liveVideoRef,
  isPreviewPlaying,
  recordingPhase,
  recordingCountdown,
  recordingError,
  hasReactionVideo,
  hasPendingRecording,
  onPlayPreview,
  onPreviewEnded,
  onUploadMain,
  onUploadReaction,
  onStartRecording,
  onStopRecording,
  onAcceptRecording,
  onDiscardRecording,
}: {
  readonly document: ReactionCreatorProjectDocument;
  readonly sourceInfo?: ReactionSourceSummary;
  readonly mainVideoUrl: string;
  readonly reactionVideoUrl: string;
  readonly mainVideoRef: RefObject<HTMLVideoElement | null>;
  readonly reactionVideoRef: RefObject<HTMLVideoElement | null>;
  readonly liveVideoRef: RefObject<HTMLVideoElement | null>;
  readonly isPreviewPlaying: boolean;
  readonly recordingPhase: string;
  readonly recordingCountdown: number;
  readonly recordingError: string | null;
  readonly hasReactionVideo: boolean;
  readonly hasPendingRecording: boolean;
  readonly onPlayPreview: () => void;
  readonly onPreviewEnded: () => void;
  readonly onUploadMain: () => void;
  readonly onUploadReaction: () => void;
  readonly onStartRecording: () => void;
  readonly onStopRecording: () => void;
  readonly onAcceptRecording: () => void;
  readonly onDiscardRecording: () => void;
}) {
  const isRecordingLive =
    recordingPhase === 'requesting' ||
    recordingPhase === 'countdown' ||
    recordingPhase === 'recording';
  const isBusyRecording = isRecordingLive || recordingPhase === 'saving';
  const stageAspectRatio = getStageAspectRatio(document, sourceInfo);

  if (!mainVideoUrl) {
    return (
      <button
        type="button"
        onClick={onUploadMain}
        className="flex min-h-[420px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/10 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Upload size={28} />
        </div>
        <p className="text-xl font-black">Upload video utama</p>
        <p className="mt-2 max-w-sm text-sm font-semibold text-muted-foreground">
          Masukkan video yang akan ditonton saat kamu record reaction.
        </p>
      </button>
    );
  }

  const mainSplitPane = (
    <div key="main" className="relative min-h-0 min-w-0 overflow-hidden bg-black">
      <video
        ref={mainVideoRef}
        src={mainVideoUrl}
        className="h-full w-full"
        style={getVideoObjectStyle(document.layout.mainFraming)}
        onClick={isBusyRecording ? undefined : onPlayPreview}
        onEnded={() => {
          reactionVideoRef.current?.pause();
          onPreviewEnded();
        }}
      >
        <track kind="captions" />
      </video>
    </div>
  );
  const reactionSplitPane = (
    <ReactionPane
      key="reaction"
      document={document}
      isLive={isRecordingLive}
      liveVideoRef={liveVideoRef}
      reactionVideoRef={reactionVideoRef}
      reactionVideoUrl={reactionVideoUrl}
      variant="split"
    />
  );
  const splitPanes =
    document.layout.mainPlacement === 'end'
      ? [reactionSplitPane, mainSplitPane]
      : [mainSplitPane, reactionSplitPane];

  return (
    <div className="overflow-hidden rounded-2xl border border-border/55 bg-black">
      <div
        className={cn(
          'relative mx-auto max-h-[560px] w-full overflow-hidden bg-black',
          document.output.aspectRatio === '9:16' && 'aspect-[9/16] max-w-[340px]',
          document.output.aspectRatio === '1:1' && 'aspect-square max-w-[520px]',
          document.output.aspectRatio === '4:5' && 'aspect-[4/5] max-w-[420px]',
        )}
        style={{ aspectRatio: stageAspectRatio }}
      >
        {document.layout.mode === 'pip' ? (
          <>
            <video
              ref={mainVideoRef}
              src={mainVideoUrl}
              className="h-full w-full bg-black"
              style={getVideoObjectStyle(document.layout.mainFraming)}
              onClick={isBusyRecording ? undefined : onPlayPreview}
              onEnded={() => {
                reactionVideoRef.current?.pause();
                onPreviewEnded();
              }}
            >
              <track kind="captions" />
            </video>
            <ReactionPane
              document={document}
              isLive={isRecordingLive}
              liveVideoRef={liveVideoRef}
              reactionVideoRef={reactionVideoRef}
              reactionVideoUrl={reactionVideoUrl}
              variant="pip"
            />
          </>
        ) : document.layout.smoothBorder ? (
          <FeatheredSplitPreview
            document={document}
            isBusyRecording={isBusyRecording}
            isLive={isRecordingLive}
            liveVideoRef={liveVideoRef}
            mainVideoRef={mainVideoRef}
            mainVideoUrl={mainVideoUrl}
            reactionVideoRef={reactionVideoRef}
            reactionVideoUrl={reactionVideoUrl}
            onPlayPreview={onPlayPreview}
            onPreviewEnded={onPreviewEnded}
          />
        ) : (
          <div
            className={cn(
              'relative grid h-full w-full overflow-hidden bg-black',
              isHorizontalSplit(document) ? 'grid-cols-2' : 'grid-rows-2',
            )}
            style={getSplitPreviewStyle(document)}
          >
            {splitPanes}
            <SplitBoundaryOverlay document={document} />
          </div>
        )}

        {recordingPhase === 'countdown' ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/50 bg-primary text-4xl font-black text-primary-foreground shadow-2xl shadow-primary/30">
              {recordingCountdown}
            </div>
          </div>
        ) : null}

        {!isPreviewPlaying && !isBusyRecording ? (
          <button
            type="button"
            aria-label="Play preview"
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/0 text-white transition-colors hover:bg-black/10"
            onClick={onPlayPreview}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 backdrop-blur">
              <Play size={30} fill="currentColor" />
            </span>
          </button>
        ) : isPreviewPlaying && !isBusyRecording ? (
          <button
            type="button"
            aria-label="Pause preview"
            className="absolute inset-0 z-50 cursor-pointer bg-transparent"
            onClick={onPlayPreview}
          />
        ) : null}

        {recordingPhase === 'recording' ? (
          <div className="absolute inset-x-4 bottom-4 z-[60] flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              className="h-11 rounded-xl font-black"
              onClick={onStopRecording}
            >
              <StopCircle size={17} />
              Stop
            </Button>
          </div>
        ) : recordingPhase === 'requesting' || recordingPhase === 'saving' ? (
          <div className="absolute inset-x-4 bottom-4 z-[60] flex flex-wrap items-center gap-2">
            <div className="flex h-11 items-center gap-2 rounded-xl border border-primary/25 bg-background/85 px-4 text-sm font-black text-primary backdrop-blur">
              <Loader2 size={16} className="animate-spin" />
              {recordingPhase === 'requesting' ? 'Membuka camera...' : 'Menyiapkan recording...'}
            </div>
          </div>
        ) : null}

        {recordingError ? (
          <div className="absolute left-4 right-4 top-4 z-40 rounded-xl border border-destructive/30 bg-destructive/15 px-3 py-2 text-sm font-semibold text-destructive backdrop-blur">
            {recordingError}
          </div>
        ) : null}
      </div>
      <ReactionStageActions
        hasPendingRecording={hasPendingRecording}
        hasReactionVideo={hasReactionVideo}
        recordingPhase={recordingPhase}
        onAcceptRecording={onAcceptRecording}
        onDiscardRecording={onDiscardRecording}
        onStartRecording={onStartRecording}
        onUploadMain={onUploadMain}
        onUploadReaction={onUploadReaction}
      />
    </div>
  );
}

function ReactionStageActions({
  hasPendingRecording,
  hasReactionVideo,
  recordingPhase,
  onAcceptRecording,
  onDiscardRecording,
  onStartRecording,
  onUploadMain,
  onUploadReaction,
}: {
  readonly hasPendingRecording: boolean;
  readonly hasReactionVideo: boolean;
  readonly recordingPhase: string;
  readonly onAcceptRecording: () => void;
  readonly onDiscardRecording: () => void;
  readonly onStartRecording: () => void;
  readonly onUploadMain: () => void;
  readonly onUploadReaction: () => void;
}) {
  if (
    recordingPhase === 'recording' ||
    recordingPhase === 'requesting' ||
    recordingPhase === 'saving'
  ) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border/50 bg-card/95 p-3 sm:flex-row sm:flex-wrap sm:items-center">
      {recordingPhase === 'ready' && hasPendingRecording ? (
        <>
          <Button type="button" className="h-11 rounded-xl font-black" onClick={onAcceptRecording}>
            <Check size={17} />
            Gunakan Recording
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl font-bold"
            onClick={onDiscardRecording}
          >
            Retake
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl font-bold"
            onClick={onUploadReaction}
          >
            <Upload size={16} />
            Upload Reaction
          </Button>
        </>
      ) : (
        <>
          <Button type="button" className="h-11 rounded-xl font-black" onClick={onStartRecording}>
            <Camera size={17} />
            {hasReactionVideo ? 'Record Ulang' : 'Record Reaction'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl font-bold"
            onClick={onUploadReaction}
          >
            <Upload size={16} />
            Upload Reaction
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl font-bold"
            onClick={onUploadMain}
          >
            <RefreshCw size={16} />
            Ganti Main
          </Button>
        </>
      )}
    </div>
  );
}

function ReactionPane({
  document,
  isLive,
  liveVideoRef,
  reactionVideoRef,
  reactionVideoUrl,
  variant,
}: {
  readonly document: ReactionCreatorProjectDocument;
  readonly isLive: boolean;
  readonly liveVideoRef: RefObject<HTMLVideoElement | null>;
  readonly reactionVideoRef: RefObject<HTMLVideoElement | null>;
  readonly reactionVideoUrl: string;
  readonly variant: 'pip' | 'split';
}) {
  const isPip = variant === 'pip';
  const frameClassName = cn(
    'overflow-hidden bg-black',
    isPip ? 'absolute z-20 border-2 border-white/70 shadow-2xl' : 'relative min-h-0 min-w-0',
    isPip && (document.layout.circular ? 'rounded-full' : 'rounded-2xl'),
  );
  const frameStyle = isPip ? getPipFrameStyle(document) : undefined;

  if (isLive) {
    return (
      <div className={frameClassName} style={frameStyle}>
        <video
          ref={liveVideoRef}
          muted
          autoPlay
          playsInline
          className="h-full w-full"
          style={getVideoObjectStyle(document.layout.reactionFraming)}
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }

  if (reactionVideoUrl) {
    return (
      <div className={frameClassName} style={frameStyle}>
        <video
          ref={reactionVideoRef}
          src={reactionVideoUrl}
          className="h-full w-full"
          style={getVideoObjectStyle(document.layout.reactionFraming)}
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }

  return (
    <div
      className={cn(
        frameClassName,
        'flex items-center justify-center border border-dashed border-white/20 text-center text-sm font-bold text-muted-foreground',
      )}
      style={frameStyle}
    >
      <span className="px-4">Reaction belum ada</span>
    </div>
  );
}

function FeatheredSplitPreview({
  document,
  isBusyRecording,
  isLive,
  liveVideoRef,
  mainVideoRef,
  mainVideoUrl,
  reactionVideoRef,
  reactionVideoUrl,
  onPlayPreview,
  onPreviewEnded,
}: {
  readonly document: ReactionCreatorProjectDocument;
  readonly isBusyRecording: boolean;
  readonly isLive: boolean;
  readonly liveVideoRef: RefObject<HTMLVideoElement | null>;
  readonly mainVideoRef: RefObject<HTMLVideoElement | null>;
  readonly mainVideoUrl: string;
  readonly reactionVideoRef: RefObject<HTMLVideoElement | null>;
  readonly reactionVideoUrl: string;
  readonly onPlayPreview: () => void;
  readonly onPreviewEnded: () => void;
}) {
  const { mainStyle, reactionStyle } = getFeatheredSplitPreviewStyles(document);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div className="absolute overflow-hidden bg-black" style={mainStyle}>
        <video
          ref={mainVideoRef}
          src={mainVideoUrl}
          className="h-full w-full"
          style={getVideoObjectStyle(document.layout.mainFraming)}
          onClick={isBusyRecording ? undefined : onPlayPreview}
          onEnded={() => {
            reactionVideoRef.current?.pause();
            onPreviewEnded();
          }}
        >
          <track kind="captions" />
        </video>
      </div>
      <div className="absolute overflow-hidden bg-black" style={reactionStyle}>
        {isLive ? (
          <video
            ref={liveVideoRef}
            muted
            autoPlay
            playsInline
            className="h-full w-full"
            style={getVideoObjectStyle(document.layout.reactionFraming)}
          >
            <track kind="captions" />
          </video>
        ) : reactionVideoUrl ? (
          <video
            ref={reactionVideoRef}
            src={reactionVideoUrl}
            className="h-full w-full"
            style={getVideoObjectStyle(document.layout.reactionFraming)}
          >
            <track kind="captions" />
          </video>
        ) : (
          <div className="flex h-full w-full items-center justify-center border border-dashed border-white/20 text-center text-sm font-bold text-muted-foreground">
            <span className="px-4">Reaction belum ada</span>
          </div>
        )}
      </div>
      <SplitBoundaryOverlay document={document} />
    </div>
  );
}

function SplitBoundaryOverlay({ document }: { readonly document: ReactionCreatorProjectDocument }) {
  if (
    document.layout.mode === 'pip' ||
    (!document.layout.smoothBorder && !document.layout.blurOverlay)
  ) {
    return null;
  }

  const splitPercent = `${resolveSplitBoundaryPercent(document)}%`;
  const horizontalSplit = isHorizontalSplit(document);
  const maskImage = horizontalSplit
    ? 'linear-gradient(to right, transparent 0%, black 44%, black 56%, transparent 100%)'
    : 'linear-gradient(to bottom, transparent 0%, black 44%, black 56%, transparent 100%)';
  const boundaryStyle: CSSProperties = {
    WebkitMaskImage: maskImage,
    maskImage,
    ...(horizontalSplit ? { left: splitPercent } : { top: splitPercent }),
  };
  const baseClassName = cn(
    'pointer-events-none absolute z-30',
    document.layout.blurOverlay && 'backdrop-blur-sm',
    document.layout.smoothBorder ? 'bg-black/[0.035]' : 'bg-white/[0.01]',
  );

  if (horizontalSplit) {
    return (
      <div className={cn(baseClassName, 'inset-y-0 w-10 -translate-x-1/2')} style={boundaryStyle} />
    );
  }

  return (
    <div className={cn(baseClassName, 'inset-x-0 h-10 -translate-y-1/2')} style={boundaryStyle} />
  );
}

function SourceSummary({
  sourceInfo,
  hasMainVideo,
  hasReactionVideo,
}: {
  readonly sourceInfo?: {
    readonly main?: {
      readonly assetName: string;
      readonly durationMs: number;
      readonly width: number;
      readonly height: number;
      readonly hasAudio: boolean;
    };
    readonly reaction?: {
      readonly assetName: string;
      readonly durationMs: number;
      readonly width: number;
      readonly height: number;
      readonly hasAudio: boolean;
    };
  };
  readonly hasMainVideo: boolean;
  readonly hasReactionVideo: boolean;
}) {
  if (!hasMainVideo) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <MediaInfoCard label="Main video" info={sourceInfo?.main} active={hasMainVideo} />
      <MediaInfoCard label="Reaction" info={sourceInfo?.reaction} active={hasReactionVideo} />
    </div>
  );
}

function MediaInfoCard({
  label,
  info,
  active,
}: {
  readonly label: string;
  readonly info?: {
    readonly assetName: string;
    readonly durationMs: number;
    readonly width: number;
    readonly height: number;
    readonly hasAudio: boolean;
  };
  readonly active: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/45 bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            'rounded-full px-2 py-1 text-[10px] font-black uppercase ring-1',
            active
              ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/25'
              : 'bg-muted text-muted-foreground ring-border/45',
          )}
        >
          {active ? 'Siap' : 'Kosong'}
        </span>
      </div>
      {info ? (
        <>
          <p className="mt-2 truncate text-sm font-black">{info.assetName}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {Math.round(info.durationMs / 1000)}s • {info.width}×{info.height} •{' '}
            {info.hasAudio ? 'Audio tersedia' : 'Tanpa audio'}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm font-semibold text-muted-foreground">Belum ditambahkan.</p>
      )}
    </div>
  );
}

function ReactionSettingsPanel({
  document,
  disabled,
  hasMainVideo,
  hasReactionVideo,
  canRender,
  onChange,
  onRender,
}: {
  readonly document: ReactionCreatorProjectDocument;
  readonly disabled: boolean;
  readonly hasMainVideo: boolean;
  readonly hasReactionVideo: boolean;
  readonly canRender: boolean;
  readonly onChange: (document: ReactionCreatorProjectDocument) => void;
  readonly onRender: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'layout' | 'framing' | 'audio'>('layout');
  const update = (patch: Partial<ReactionCreatorProjectDocument>) => {
    onChange({ ...document, ...patch, savedAt: new Date().toISOString() });
  };
  const activeLayoutMode = document.layout.mode === 'pip' ? 'pip' : 'side-by-side';
  const tabs = [
    { id: 'layout' as const, label: 'Layout' },
    { id: 'framing' as const, label: 'Framing' },
    { id: 'audio' as const, label: 'Audio' },
  ];

  return (
    <Card className="rounded-2xl border-border/55 bg-card p-5 lg:sticky lg:top-24">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <SlidersHorizontal size={18} />
        </div>
        <div>
          <h2 className="font-black">Layout & Audio</h2>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Preset-first
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-1 rounded-2xl border border-border/55 bg-muted/10 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'h-10 rounded-xl text-sm font-black transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[420px] space-y-5">
        {activeTab === 'layout' ? (
          <>
            <section>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Layout
              </p>
              <div className="grid gap-2">
                {LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => update({ layout: { ...document.layout, mode: layout.id } })}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-colors',
                      activeLayoutMode === layout.id
                        ? 'border-primary/70 bg-primary/5 text-foreground'
                        : 'border-border/55 bg-muted/10 text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black">{layout.label}</span>
                      {activeLayoutMode === layout.id ? <Check size={16} /> : null}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {layout.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Format
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <FormatOptionButton
                    key={ratio.id}
                    active={document.output.aspectRatio === ratio.id}
                    disabled={disabled}
                    helper={ratio.helper}
                    label={ratio.label}
                    previewClassName={ratio.previewClassName}
                    onClick={() => update({ output: { aspectRatio: ratio.id } })}
                  />
                ))}
              </div>
            </section>

            {document.layout.mode === 'pip' ? (
              <section className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-black">PiP Position</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PIP_POSITIONS.map((position) => (
                      <button
                        key={position.id}
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          update({ layout: { ...document.layout, pipPosition: position.id } })
                        }
                        className={cn(
                          'h-11 rounded-xl border text-sm font-black transition-colors',
                          document.layout.pipPosition === position.id
                            ? 'border-primary/70 bg-primary/5 text-primary'
                            : 'border-border/55 bg-muted/10 text-muted-foreground hover:border-primary/40',
                        )}
                      >
                        {position.label}
                      </button>
                    ))}
                  </div>
                </div>
                <LabeledSlider
                  disabled={disabled}
                  label="PiP Size"
                  value={Math.round(document.layout.pipScale * 100)}
                  min={12}
                  max={50}
                  unit="%"
                  onChange={(value) =>
                    update({ layout: { ...document.layout, pipScale: value / 100 } })
                  }
                />
                <button
                  type="button"
                  disabled={disabled}
                  className={cn(
                    'h-11 w-full rounded-xl border text-sm font-black transition-colors',
                    document.layout.circular
                      ? 'border-primary/70 bg-primary/5 text-primary'
                      : 'border-border/55 bg-muted/10 text-muted-foreground',
                  )}
                  onClick={() =>
                    update({ layout: { ...document.layout, circular: !document.layout.circular } })
                  }
                >
                  Circular PiP
                </button>
              </section>
            ) : null}

            {activeLayoutMode === 'side-by-side' ? (
              <section className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(['horizontal', 'vertical'] as const).map((orientation) => (
                    <button
                      key={orientation}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        update({ layout: { ...document.layout, splitOrientation: orientation } })
                      }
                      className={cn(
                        'h-11 rounded-xl border text-sm font-black capitalize transition-colors',
                        document.layout.splitOrientation === orientation
                          ? 'border-primary/70 bg-primary/5 text-primary'
                          : 'border-border/55 bg-muted/10 text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      {orientation}
                    </button>
                  ))}
                </div>
                <SplitPlacementControl
                  disabled={disabled}
                  mainPlacement={document.layout.mainPlacement}
                  orientation={document.layout.splitOrientation}
                  onChange={(mainPlacement) =>
                    update({ layout: { ...document.layout, mainPlacement } })
                  }
                />
                <LabeledSlider
                  disabled={disabled}
                  label="Split Ratio"
                  value={Math.round(document.layout.splitRatio * 100)}
                  min={30}
                  max={70}
                  unit="%"
                  onChange={(value) =>
                    update({ layout: { ...document.layout, splitRatio: value / 100 } })
                  }
                />
                <div className="grid gap-2">
                  <ToggleSetting
                    active={document.layout.smoothBorder}
                    description="Gradasi halus di batas video"
                    label="Faded Border"
                    onClick={() =>
                      update({
                        layout: {
                          ...document.layout,
                          smoothBorder: !document.layout.smoothBorder,
                        },
                      })
                    }
                  />
                  <ToggleSetting
                    active={document.layout.blurOverlay ?? false}
                    description="Blur area belakang supaya kedua video terasa menyatu"
                    label="Blur Overlay"
                    onClick={() =>
                      update({
                        layout: {
                          ...document.layout,
                          blurOverlay: !(document.layout.blurOverlay ?? false),
                        },
                      })
                    }
                  />
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {activeTab === 'framing' ? (
          <section className="space-y-4">
            {hasMainVideo ? (
              <FramingControls
                disabled={disabled}
                label="Main Video"
                value={document.layout.mainFraming}
                onChange={(mainFraming) => update({ layout: { ...document.layout, mainFraming } })}
              />
            ) : null}
            {hasReactionVideo ? (
              <FramingControls
                disabled={disabled}
                label="Reaction"
                value={document.layout.reactionFraming}
                onChange={(reactionFraming) =>
                  update({ layout: { ...document.layout, reactionFraming } })
                }
              />
            ) : null}
            {!hasMainVideo && !hasReactionVideo ? (
              <PanelEmptyState text="Upload video dulu untuk mengatur framing." />
            ) : null}
          </section>
        ) : null}

        {activeTab === 'audio' ? (
          <section className="space-y-5">
            {hasMainVideo ? (
              <LabeledSlider
                label="Main"
                value={Math.round(document.audio.mainVolume * 100)}
                min={0}
                max={100}
                unit="%"
                onChange={(value) =>
                  update({
                    audio: { ...document.audio, mainVolume: value / 100, muteMain: value === 0 },
                  })
                }
              />
            ) : null}
            {hasReactionVideo ? (
              <>
                <LabeledSlider
                  label="Reaction Mic"
                  value={Math.round(document.audio.reactionVolume * 100)}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(value) =>
                    update({
                      audio: {
                        ...document.audio,
                        reactionVolume: value / 100,
                        muteReaction: value === 0,
                      },
                    })
                  }
                />
                <LabeledSlider
                  label="Sync Reaction"
                  value={document.sync.reactionOffsetMs}
                  min={-2000}
                  max={2000}
                  unit="ms"
                  onChange={(value) => update({ sync: { reactionOffsetMs: value } })}
                />
              </>
            ) : null}
            {!hasMainVideo && !hasReactionVideo ? (
              <PanelEmptyState text="Audio dan sync akan muncul setelah video ditambahkan." />
            ) : null}
          </section>
        ) : null}
      </div>

      <div className="-mx-5 mt-5 border-t border-border/55 bg-card/95 px-5 pt-4 lg:sticky lg:bottom-0 lg:backdrop-blur">
        <Button
          type="button"
          variant={canRender ? 'default' : 'outline'}
          className={cn(
            'h-12 w-full rounded-xl font-black tracking-[0.08em]',
            !canRender && 'border-border/60 bg-muted/10 text-muted-foreground',
          )}
          disabled={!canRender || disabled}
          onClick={onRender}
        >
          <Download size={17} />
          Render Reaction
        </Button>
      </div>
    </Card>
  );
}

function FormatOptionButton({
  active,
  disabled,
  helper,
  label,
  previewClassName,
  onClick,
}: {
  readonly active: boolean;
  readonly disabled: boolean;
  readonly helper: string;
  readonly label: string;
  readonly previewClassName: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition-colors',
        active
          ? 'border-primary/70 bg-primary/5 text-foreground'
          : 'border-border/55 bg-muted/10 text-muted-foreground hover:border-primary/40',
      )}
    >
      <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg bg-background/60">
        <span
          className={cn(
            'block max-h-8 w-7 rounded-[6px] border-2',
            previewClassName,
            active ? 'border-primary' : 'border-muted-foreground/70',
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black">{label}</span>
        <span className="block truncate text-[11px] font-bold text-muted-foreground">{helper}</span>
      </span>
    </button>
  );
}

function PanelEmptyState({ text }: { readonly text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-muted-foreground">{text}</p>
    </div>
  );
}

function SplitPlacementControl({
  disabled,
  mainPlacement,
  orientation,
  onChange,
}: {
  readonly disabled: boolean;
  readonly mainPlacement: 'start' | 'end';
  readonly orientation: 'horizontal' | 'vertical';
  readonly onChange: (placement: 'start' | 'end') => void;
}) {
  const options =
    orientation === 'horizontal'
      ? [
          { id: 'start' as const, label: 'Main kiri' },
          { id: 'end' as const, label: 'Reaction kiri' },
        ]
      : [
          { id: 'start' as const, label: 'Main atas' },
          { id: 'end' as const, label: 'Reaction atas' },
        ];

  return (
    <div>
      <p className="mb-2 text-sm font-black">Posisi Video</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              'h-11 rounded-xl border text-sm font-black transition-colors',
              mainPlacement === option.id
                ? 'border-primary/70 bg-primary/5 text-primary'
                : 'border-border/55 bg-muted/10 text-muted-foreground hover:border-primary/40',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FramingControls({
  disabled,
  label,
  value,
  onChange,
}: {
  readonly disabled: boolean;
  readonly label: string;
  readonly value: ReactionVideoFraming;
  readonly onChange: (value: ReactionVideoFraming) => void;
}) {
  const update = (patch: Partial<ReactionVideoFraming>) => onChange({ ...value, ...patch });
  const positionPresets = [
    { id: 'center', label: 'Center', patch: { x: 50, y: 50 } },
    { id: 'top', label: 'Top', patch: { y: 20 } },
    { id: 'bottom', label: 'Bottom', patch: { y: 80 } },
    { id: 'left', label: 'Left', patch: { x: 20 } },
    { id: 'right', label: 'Right', patch: { x: 80 } },
  ] as const;

  return (
    <div className="rounded-xl border border-border/55 bg-muted/10 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-black">{label}</p>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-background/45 p-1">
          {(['cover', 'contain'] as const).map((fit) => (
            <button
              key={fit}
              type="button"
              disabled={disabled}
              onClick={() => update({ fit })}
              className={cn(
                'h-8 rounded-lg px-3 text-xs font-black transition-colors',
                value.fit === fit
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {fit === 'cover' ? 'Fill' : 'Fit'}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {positionPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={disabled}
            onClick={() => update(preset.patch)}
            className="h-8 rounded-lg border border-border/55 px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-60"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <LabeledSlider
          disabled={disabled}
          label="Posisi X"
          value={Math.round(value.x)}
          min={0}
          max={100}
          unit="%"
          onChange={(x) => update({ x })}
        />
        <LabeledSlider
          disabled={disabled}
          label="Posisi Y"
          value={Math.round(value.y)}
          min={0}
          max={100}
          unit="%"
          onChange={(y) => update({ y })}
        />
        {value.fit === 'cover' ? (
          <LabeledSlider
            disabled={disabled}
            label="Zoom"
            value={Math.round(value.zoom * 100)}
            min={100}
            max={200}
            unit="%"
            onChange={(zoom) => update({ zoom: zoom / 100 })}
          />
        ) : null}
      </div>
    </div>
  );
}

function ToggleSetting({
  active,
  description,
  label,
  onClick,
}: {
  readonly active: boolean;
  readonly description: string;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
        active
          ? 'border-primary/45 bg-muted/10 text-foreground'
          : 'border-border/55 bg-muted/10 text-muted-foreground hover:border-primary/40',
      )}
      onClick={onClick}
    >
      <span>
        <span className="block text-sm font-black">{label}</span>
        <span className="mt-0.5 block text-xs font-semibold leading-snug text-muted-foreground">
          {description}
        </span>
      </span>
      <span
        className={cn(
          'relative h-6 w-10 shrink-0 rounded-full border transition-colors',
          active ? 'border-primary/70 bg-primary/20' : 'border-border bg-muted',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-current transition-transform',
            active ? 'translate-x-4 text-primary' : 'translate-x-1 text-muted-foreground',
          )}
        />
      </span>
    </button>
  );
}

function LabeledSlider({
  disabled = false,
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  readonly disabled?: boolean;
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly unit: string;
  readonly onChange: (value: number) => void;
}) {
  const [liveValue, setLiveValue] = useState(value);

  useEffect(() => {
    setLiveValue(value);
  }, [value]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-black">
        <span>{label}</span>
        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
          {liveValue}
          {unit}
        </span>
      </div>
      <Slider
        value={[liveValue]}
        min={min}
        max={max}
        step={unit === 'ms' ? 100 : 1}
        disabled={disabled}
        onValueChange={([next]) => setLiveValue(next ?? liveValue)}
        onValueCommit={([next]) => onChange(next ?? liveValue)}
      />
    </div>
  );
}

function getStageAspectRatio(
  document: ReactionCreatorProjectDocument,
  sourceInfo?: ReactionSourceSummary,
): string {
  if (document.output.aspectRatio === '16:9') return '16 / 9';
  if (document.output.aspectRatio === '9:16') return '9 / 16';
  if (document.output.aspectRatio === '1:1') return '1 / 1';
  if (document.output.aspectRatio === '4:5') return '4 / 5';

  const width = sourceInfo?.main?.width;
  const height = sourceInfo?.main?.height;
  if (width && height) {
    return `${width} / ${height}`;
  }

  return '16 / 9';
}

function getPipFrameStyle(document: ReactionCreatorProjectDocument): CSSProperties {
  const edge = `${Math.round(document.layout.pipScale * 100)}%`;
  const margin = '4%';
  const position = document.layout.pipPosition;
  const style: CSSProperties = {
    width: edge,
    maxWidth: 'calc(100% - 2rem)',
    maxHeight: 'calc(100% - 2rem)',
    aspectRatio: document.layout.circular ? '1 / 1' : '16 / 9',
  };

  if (position === 'top-left') {
    return { ...style, left: margin, top: margin };
  }
  if (position === 'bottom-left') {
    return { ...style, left: margin, bottom: margin };
  }
  if (position === 'bottom-right' || position === 'custom') {
    return { ...style, right: margin, bottom: margin };
  }
  return { ...style, right: margin, top: margin };
}

function getVideoObjectStyle(framing: ReactionVideoFraming): CSSProperties {
  return {
    objectFit: framing.fit === 'contain' ? 'contain' : 'cover',
    objectPosition: `${framing.x}% ${framing.y}%`,
    transform: framing.fit === 'cover' && framing.zoom > 1 ? `scale(${framing.zoom})` : undefined,
    transformOrigin: `${framing.x}% ${framing.y}%`,
  };
}

function isHorizontalSplit(document: ReactionCreatorProjectDocument): boolean {
  return (
    document.layout.mode !== 'vertical-short' && document.layout.splitOrientation === 'horizontal'
  );
}

function resolveSplitBoundaryPercent(document: ReactionCreatorProjectDocument): number {
  const mainPercent = Math.round(document.layout.splitRatio * 100);
  return document.layout.mainPlacement === 'end' ? 100 - mainPercent : mainPercent;
}

function getSplitPreviewStyle(document: ReactionCreatorProjectDocument): CSSProperties {
  if (document.layout.mode === 'pip') return {};
  const mainRatio = `${Math.round(document.layout.splitRatio * 100)}fr`;
  const reactionRatio = `${Math.round((1 - document.layout.splitRatio) * 100)}fr`;
  const firstRatio = document.layout.mainPlacement === 'end' ? reactionRatio : mainRatio;
  const secondRatio = document.layout.mainPlacement === 'end' ? mainRatio : reactionRatio;
  if (!isHorizontalSplit(document)) {
    return { gridTemplateRows: `${firstRatio} ${secondRatio}` };
  }
  return { gridTemplateColumns: `${firstRatio} ${secondRatio}` };
}

function getFeatheredSplitPreviewStyles(document: ReactionCreatorProjectDocument): {
  readonly mainStyle: CSSProperties;
  readonly reactionStyle: CSSProperties;
} {
  const mainSplit = Math.round(document.layout.splitRatio * 100);
  const feather = 6;
  const halfFeather = feather / 2;
  const horizontalSplit = isHorizontalSplit(document);
  const firstPercent = document.layout.mainPlacement === 'end' ? 100 - mainSplit : mainSplit;
  const secondPercent = 100 - firstPercent;

  if (horizontalSplit) {
    const firstMask = `linear-gradient(to right, black 0%, black calc(100% - ${feather}%), transparent 100%)`;
    const secondMask = `linear-gradient(to right, transparent 0%, black ${feather}%, black 100%)`;
    const firstStyle: CSSProperties = {
      inset: '0 auto 0 0',
      width: `calc(${firstPercent}% + ${halfFeather}%)`,
      WebkitMaskImage: firstMask,
      maskImage: firstMask,
    };
    const secondStyle: CSSProperties = {
      inset: '0 0 0 auto',
      width: `calc(${secondPercent}% + ${halfFeather}%)`,
      WebkitMaskImage: secondMask,
      maskImage: secondMask,
    };

    return document.layout.mainPlacement === 'end'
      ? { mainStyle: secondStyle, reactionStyle: firstStyle }
      : { mainStyle: firstStyle, reactionStyle: secondStyle };
  }

  const firstMask = `linear-gradient(to bottom, black 0%, black calc(100% - ${feather}%), transparent 100%)`;
  const secondMask = `linear-gradient(to bottom, transparent 0%, black ${feather}%, black 100%)`;
  const firstStyle: CSSProperties = {
    inset: '0 0 auto 0',
    height: `calc(${firstPercent}% + ${halfFeather}%)`,
    WebkitMaskImage: firstMask,
    maskImage: firstMask,
  };
  const secondStyle: CSSProperties = {
    inset: 'auto 0 0 0',
    height: `calc(${secondPercent}% + ${halfFeather}%)`,
    WebkitMaskImage: secondMask,
    maskImage: secondMask,
  };

  return document.layout.mainPlacement === 'end'
    ? { mainStyle: secondStyle, reactionStyle: firstStyle }
    : { mainStyle: firstStyle, reactionStyle: secondStyle };
}
