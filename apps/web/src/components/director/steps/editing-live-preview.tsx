import { MonitorPlay, Pause, Play, ScanFace } from 'lucide-react';
import { useState } from 'react';
import {
  deriveLivePreviewDraft,
  deriveLivePreviewScene,
  getLivePreviewSubtitleText,
} from '@/components/director/steps/editing-live-preview-utils';
import { Badge, Card, CardBody } from '@/components/ui';
import { useAuthenticatedObjectUrl } from '@/hooks/use-authenticated-object-url';
import { getEffectiveRefineSettings } from '@/lib/director-refine-settings';
import { cn } from '@/lib/utils';
import type {
  DirectorSession,
  ExportSettings,
  RefineSettings,
  SelectedClip,
  SubtitleStyle,
} from '@/stores/director-store';

interface EditingLivePreviewProps {
  readonly activeSession: DirectorSession | null;
  readonly exportSettings: ExportSettings;
  readonly subtitleStyle: SubtitleStyle;
  readonly selectedClips: SelectedClip[];
  readonly refineSettings: Record<string, RefineSettings>;
}

export function EditingLivePreview({
  activeSession,
  exportSettings,
  subtitleStyle,
  selectedClips,
  refineSettings,
}: Readonly<EditingLivePreviewProps>) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const primaryClip = selectedClips[0];
  const activeRefineSettings = primaryClip
    ? getEffectiveRefineSettings(primaryClip, refineSettings[primaryClip.id])
    : undefined;
  const scene = deriveLivePreviewScene(
    exportSettings,
    subtitleStyle,
    primaryClip,
    activeRefineSettings,
  );
  const previewDraft = deriveLivePreviewDraft(primaryClip, activeRefineSettings);
  const previewUrl = useAuthenticatedObjectUrl(
    activeSession && primaryClip
      ? `/api/v1/director/sessions/${activeSession.id}/clips/${primaryClip.candidate.id}/poster`
      : null,
  );
  const previewVideoUrl = useAuthenticatedObjectUrl(
    activeSession && primaryClip && isPlaying
      ? `/api/v1/director/sessions/${activeSession.id}/clips/${primaryClip.candidate.id}/preview`
      : null,
  );
  const previewPlaybackLabel = isPlaying ? 'Hentikan draft preview' : 'Putar draft preview';
  const previewSubtitleText = getLivePreviewSubtitleText(
    previewDraft,
    currentTimeMs,
    subtitleStyle.animation,
  );

  let mediaContent = null;
  if (isPlaying && previewVideoUrl) {
    mediaContent = (
      <video
        key={`${primaryClip?.id ?? 'preview'}-live`}
        src={previewVideoUrl}
        autoPlay
        playsInline
        controls
        className={cn('w-full h-full transition-all duration-300 bg-black', scene.mediaClass)}
        onLoadedMetadata={(event) => {
          const target = event.currentTarget;
          const startAtSeconds = (previewDraft?.startOffsetMs ?? 0) / 1000;
          if (startAtSeconds > 0) {
            target.currentTime = startAtSeconds;
          }
        }}
        onTimeUpdate={(event) => {
          const target = event.currentTarget;
          const rawTimeMs = Math.round(target.currentTime * 1000);
          const draftStartOffsetMs = previewDraft?.startOffsetMs ?? 0;
          const nextTimeMs = Math.max(0, rawTimeMs - draftStartOffsetMs);

          if (previewDraft && nextTimeMs >= previewDraft.durationMs) {
            target.pause();
            setIsPlaying(false);
            setCurrentTimeMs(previewDraft.durationMs);
            return;
          }

          setCurrentTimeMs(nextTimeMs);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTimeMs(0);
        }}
      >
        <track kind="captions" srcLang="id" label="Preview hasil tanpa caption terpisah" />
      </video>
    );
  } else if (previewUrl) {
    mediaContent = (
      <img
        src={previewUrl}
        alt="Preview hasil edit"
        className={cn('w-full h-full transition-all duration-300', scene.mediaClass)}
      />
    );
  } else {
    mediaContent = (
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,99,33,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.25))]" />
    );
  }

  return (
    <Card className="bg-card/70 border-border/50 backdrop-blur-xl rounded-4xl overflow-hidden">
      <CardBody className="p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <MonitorPlay size={20} className="text-primary" />
          </div>
          <div>
            <h4 className="font-black tracking-tight text-lg">Draft Preview</h4>
            <p className="text-xs text-muted-foreground">
              Timing mungkin sedikit berbeda dari ekspor final.
            </p>
          </div>
        </div>

        <div
          className={cn(
            'w-full rounded-4xl border border-border/50 overflow-hidden relative min-h-80',
            scene.aspectClass,
            scene.frameClass,
          )}
        >
          {mediaContent}

          <div className="absolute inset-0 pointer-events-none bg-linear-to-t from-black/70 via-transparent to-black/15" />

          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Badge className="rounded-full bg-black/55 text-white border-white/10">
              {scene.presetLabel}
            </Badge>
            {activeRefineSettings?.faceTracking && exportSettings.aspectRatio === '9:16' && (
              <Badge className="rounded-full bg-primary/15 text-primary border-primary/30">
                <ScanFace size={12} className="mr-1" />
                Tracking
              </Badge>
            )}
          </div>

          {primaryClip && (
            <button
              type="button"
              onClick={() => {
                setIsPlaying((current) => {
                  if (current) {
                    setCurrentTimeMs(0);
                  }

                  return !current;
                });
              }}
              className="absolute top-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition-all hover:bg-black/60"
              aria-label={previewPlaybackLabel}
            >
              {isPlaying ? (
                <Pause size={16} className="fill-white" />
              ) : (
                <Play size={16} className="fill-white" />
              )}
            </button>
          )}

          {exportSettings.includeSubtitles && previewSubtitleText && (
            <div
              className={cn(
                'pointer-events-none absolute inset-0 flex px-5 sm:px-6',
                scene.subtitleContainerClass,
              )}
            >
              <div
                className={cn(
                  'max-w-[82%] rounded-2xl border border-white/10 bg-black/68 px-4 py-3 text-center text-white shadow-lg backdrop-blur-md',
                  scene.subtitleTextClass,
                )}
                style={{ fontSize: `${Math.max(16, subtitleStyle.fontSize - 2)}px` }}
              >
                {previewSubtitleText}
              </div>
            </div>
          )}
        </div>

        {scene.appliedFeatureLabels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {scene.appliedFeatureLabels.map((label) => (
              <Badge
                key={label}
                className="rounded-full border-border/50 bg-muted/30 text-foreground"
              >
                {label}
              </Badge>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
