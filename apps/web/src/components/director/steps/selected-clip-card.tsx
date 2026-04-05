import { Captions, FileVideo, Pause, Play, Scissors, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { deriveClipInsight } from '@/components/director/steps/editing-insights';
import { Badge, Button, Switch } from '@/components/ui';
import { useAuthenticatedObjectUrl } from '@/hooks/use-authenticated-object-url';
import {
  type ContentMode,
  contentModeValues,
  getContentModeLabel,
  getEffectiveRefineSettings,
  getResolvedContentMode,
} from '@/lib/director-refine-settings';
import type { DirectorSession, RefineSettings, SelectedClip } from '@/stores/director-store';

export interface SelectedClipCardProps {
  readonly activeSession: DirectorSession;
  readonly clip: SelectedClip;
  readonly index: number;
  readonly settings: RefineSettings;
  readonly onRemoveClip: (clipId: string) => void;
  readonly onUpdateRefineSetting: (
    clipId: string,
    key: keyof RefineSettings,
    value: boolean | string,
  ) => void;
  readonly onApplyContentMode: (clip: SelectedClip, mode: ContentMode) => void;
  readonly onUpdateTranscript: (
    clipId: string,
    segments: Array<{ startMs: number; endMs: number; text: string }>,
  ) => void;
}

/**
 * Render a selected clip with editing controls and lightweight AI guidance.
 */
export function SelectedClipCard({
  activeSession,
  clip,
  index,
  settings,
  onRemoveClip,
  onUpdateRefineSetting,
  onApplyContentMode,
  onUpdateTranscript,
}: Readonly<SelectedClipCardProps>) {
  const [isLandscape, setIsLandscape] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const posterUrl = useAuthenticatedObjectUrl(
    `/api/v1/director/sessions/${activeSession.id}/clips/${clip.candidate.id}/poster`,
  );
  const previewVideoUrl = useAuthenticatedObjectUrl(
    isPlaying
      ? `/api/v1/director/sessions/${activeSession.id}/clips/${clip.candidate.id}/preview`
      : null,
  );
  const duration = Math.round((clip.candidate.endMs - clip.candidate.startMs) / 1000);
  const insight = deriveClipInsight(clip);
  const effectiveSettings = getEffectiveRefineSettings(clip, settings);
  const resolvedContentMode = getResolvedContentMode(clip.candidate, settings);
  const aspectClass = isLandscape ? 'aspect-video' : 'aspect-9/16';
  const previewLabel = isPlaying
    ? `Hentikan preview clip ${index + 1}`
    : `Putar preview clip ${index + 1}`;
  const mediaContent = useMemo(() => {
    if (isPlaying && previewVideoUrl) {
      return (
        <video
          key={`${clip.candidate.id}-preview`}
          src={previewVideoUrl}
          autoPlay
          playsInline
          controls
          className="w-full h-full object-contain bg-black"
          onLoadedMetadata={(event) => {
            setIsLandscape(event.currentTarget.videoWidth > event.currentTarget.videoHeight);
          }}
          onEnded={() => {
            setIsPlaying(false);
          }}
        >
          <track kind="captions" srcLang="id" label="Preview clip tanpa caption" />
        </video>
      );
    }

    if (posterUrl) {
      return (
        <img
          src={posterUrl}
          alt={`Preview clip ${index + 1}`}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain bg-black opacity-90 group-hover:opacity-100 transition-opacity"
          onLoad={(event) => {
            setIsLandscape(event.currentTarget.naturalWidth > event.currentTarget.naturalHeight);
          }}
        />
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
        <FileVideo size={32} strokeWidth={1.5} />
      </div>
    );
  }, [clip.candidate.id, index, isPlaying, posterUrl, previewVideoUrl]);

  return (
    <div className="bg-card/40 p-5 sm:p-6 rounded-4xl border border-border/40 flex flex-col sm:row gap-6 group hover:border-primary/30 transition-all duration-300 relative z-10 shadow-sm">
      <div
        className={`w-full sm:w-40 lg:w-72 ${aspectClass} bg-muted/20 rounded-2xl overflow-hidden relative border border-border/50 shrink-0 group-hover:scale-[1.02] transition-transform duration-500`}
      >
        {mediaContent}
        <button
          type="button"
          onClick={() => {
            setIsPlaying((current) => !current);
          }}
          className="absolute top-3 left-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-black/45 text-white backdrop-blur-md transition-all hover:bg-black/60"
          aria-label={previewLabel}
        >
          {isPlaying ? (
            <Pause size={14} className="fill-white" />
          ) : (
            <Play size={14} className="fill-white" />
          )}
        </button>
        <div className="absolute top-3 right-3">
          <div className="w-8 h-8 rounded-xl bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/30">
            <Scissors size={14} className="text-primary" />
          </div>
        </div>
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <span className="text-[10px] font-black tracking-widest px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 uppercase">
            {duration}s
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-foreground text-lg">Clip Segment {index + 1}</h4>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="h-5">
                {clip.candidate.tags?.includes('HIGH ENERGY') ? '🔥 High Energy' : '✨ Highlight'}
              </Badge>
              <Badge variant="secondary" className="h-5">
                {insight.strengthLabel}
              </Badge>
              <Badge variant="secondary" className="h-5">
                {settings.contentMode === 'auto'
                  ? `Auto · ${getContentModeLabel(resolvedContentMode)}`
                  : getContentModeLabel(resolvedContentMode)}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              aria-label={`Hapus clip ${index + 1}`}
              onClick={() => onRemoveClip(clip.id)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-primary/15 bg-linear-to-br from-primary/8 via-orange-500/5 to-transparent p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Captions size={14} className="text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-primary/80">
                Insight Director
              </div>
              <div className="text-sm font-semibold text-foreground">{insight.hookLine}</div>
            </div>
          </div>

          <p className="text-sm leading-6 text-muted-foreground">{insight.summary}</p>

          <div className="flex flex-wrap gap-2">
            {insight.reasons.map((reason) => (
              <span
                key={`${clip.id}-${reason}`}
                className="rounded-full border border-primary/15 bg-card/70 px-3 py-1 text-[11px] font-bold text-foreground/80"
              >
                {reason}
              </span>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Angle Konten
              </div>
              <p className="mt-2 text-sm font-medium leading-6 text-foreground/85">
                {insight.angle}
              </p>
            </div>

            <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Overlay Teks Awal
              </div>
              <p className="mt-2 text-sm font-medium leading-6 text-foreground/85">
                {insight.suggestedOverlay}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-muted/20 rounded-2xl border border-border/40">
          <div className="sm:col-span-2 space-y-3 rounded-2xl border border-border/40 bg-card/60 p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
              Mode Konten
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Preset ini mengatur perilaku edit agar cocok untuk tipe konten seperti podcast,
              talking head, atau short film.
            </p>
            <div className="flex flex-wrap gap-2">
              {contentModeValues.map((mode) => (
                <button
                  key={`${clip.id}-${mode}`}
                  type="button"
                  onClick={() => onApplyContentMode(clip, mode)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-widest transition-all ${
                    effectiveSettings.contentMode === mode
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/20 hover:text-foreground'
                  }`}
                >
                  {mode === 'auto'
                    ? `Auto · ${getContentModeLabel(resolvedContentMode)}`
                    : getContentModeLabel(mode)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">
              Fokus Subjek
            </span>
            <Switch
              checked={effectiveSettings.faceTracking}
              onCheckedChange={(value: boolean) =>
                onUpdateRefineSetting(clip.id, 'faceTracking', value)
              }
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">
              Hapus Diam
            </span>
            <Switch
              checked={effectiveSettings.removeSilence}
              onCheckedChange={(value: boolean) =>
                onUpdateRefineSetting(clip.id, 'removeSilence', value)
              }
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">
              Hook Cepat
            </span>
            <Switch
              checked={effectiveSettings.optimizeHook}
              onCheckedChange={(value: boolean) =>
                onUpdateRefineSetting(clip.id, 'optimizeHook', value)
              }
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">
              Stabilisasi
            </span>
            <Switch
              checked={effectiveSettings.stabilize}
              onCheckedChange={(value: boolean) =>
                onUpdateRefineSetting(clip.id, 'stabilize', value)
              }
            />
          </div>
        </div>

        <div className="flex-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 block ml-1">
            Teks Otomatis
          </div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2">
            {clip.transcript?.segments?.length ? (
              clip.transcript.segments.map((segment, segmentIndex) => (
                <div
                  key={`${clip.id}-segment-${segment.startMs}`}
                  className="flex gap-3 items-start group relative"
                >
                  <div className="text-[10px] font-bold text-muted-foreground/50 tabular-nums w-8 text-right shrink-0 mt-2.5">
                    {Math.floor(segment.startMs / 1000)}s
                  </div>
                  <textarea
                    className="w-full bg-muted/30 hover:bg-muted/50 border border-border/30 rounded-xl px-3 py-2 text-sm leading-normal text-foreground/80 focus:bg-card focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none shadow-sm"
                    rows={1}
                    defaultValue={segment.text}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (!clip.transcript?.segments) return;
                      // Deep clone the segment we want to modify to avoid mutating Zustand state directly
                      const newSegments = clip.transcript.segments.map((s, i) =>
                        i === segmentIndex ? { ...s, text: value } : s,
                      );

                      onUpdateTranscript(clip.id, newSegments);
                    }}
                    onInput={(e) => {
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                    }}
                  />
                </div>
              ))
            ) : (
              <div className="w-full bg-muted/50 border border-border/50 rounded-2xl p-4 text-sm text-muted-foreground/50 text-center italic min-h-24 flex items-center justify-center">
                Menunggu teks otomatis...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
