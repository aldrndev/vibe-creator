import { Captions, FileVideo, Pause, Play, Scissors, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  applyTranscriptCueEdit,
  buildTranscriptCues,
  formatSrtRange,
  getTranscriptLayoutLabel,
  type TranscriptSegment,
} from '@/components/director/steps/editing-transcript-cues';
import { Badge, Button } from '@/components/ui';
import { useAuthenticatedObjectUrl } from '@/hooks/use-authenticated-object-url';
import type { DirectorSession, SelectedClip, SubtitleStyle } from '@/stores/director-store';

export interface SelectedClipCardProps {
  readonly activeSession: DirectorSession;
  readonly clip: SelectedClip;
  readonly index: number;
  readonly onRemoveClip: (clipId: string) => void;
  readonly onUpdateTranscript: (
    clipId: string,
    segments: Array<{ startMs: number; endMs: number; text: string }>,
  ) => void;
  readonly subtitleStyle: SubtitleStyle;
}

/**
 * Render one ready-to-edit short with transcript editing controls.
 */
export function SelectedClipCard({
  activeSession,
  clip,
  index,
  onRemoveClip,
  onUpdateTranscript,
  subtitleStyle,
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
  const aspectClass = isLandscape ? 'aspect-video' : 'aspect-9/16';
  const previewLabel = isPlaying
    ? `Hentikan preview clip ${index + 1}`
    : `Putar preview clip ${index + 1}`;
  const transcriptSegments = clip.transcript?.segments ?? [];
  const transcriptCues = useMemo(
    () => buildTranscriptCues(transcriptSegments as TranscriptSegment[], subtitleStyle.animation),
    [subtitleStyle.animation, transcriptSegments],
  );
  const transcriptLayoutLabel = getTranscriptLayoutLabel(subtitleStyle.animation);
  const resizeTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${Math.max(element.scrollHeight, 72)}px`;
  };
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
    <div className="bg-card/40 p-5 sm:p-6 rounded-4xl border border-border/40 flex flex-col gap-6 group hover:border-primary/30 transition-all duration-300 relative z-10 shadow-sm">
      <div className="w-full flex justify-center">
        <div
          className={`w-full max-w-[18rem] sm:max-w-[20rem] ${aspectClass} bg-muted/20 rounded-2xl overflow-hidden relative border border-border/50 shrink-0 group-hover:scale-[1.02] transition-transform duration-500`}
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
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-foreground text-lg">Short Final {index + 1}</h4>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="h-5">
                {duration} detik
              </Badge>
              <Badge variant="secondary" className="h-5">
                {clip.candidate.tags?.includes('HIGH ENERGY') ? '🔥 High Energy' : '✨ Highlight'}
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

        <div className="rounded-3xl border border-primary/15 bg-linear-to-br from-primary/8 via-orange-500/5 to-transparent p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Captions size={14} className="text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-primary/80">
                Video Studio
              </div>
              <div className="text-sm font-semibold text-foreground">
                Edit transkrip sesuai gaya konten, lalu pilih gaya subtitle di panel kanan.
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 ml-1 flex items-center justify-between gap-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Transkrip
            </div>
            <Badge variant="secondary" className="h-5 px-2 text-[10px] font-semibold">
              {transcriptLayoutLabel}
            </Badge>
          </div>
          <div className="mb-2 ml-1 text-[10px] font-semibold tracking-wide text-muted-foreground/70">
            Waktu tampil subtitle: {'mulai --> selesai'}
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 block ml-1 sr-only">
            Transkrip
          </div>
          <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
            {transcriptCues.length ? (
              transcriptCues.map((cue, cueIndex) => (
                <div
                  key={`${clip.id}-${cue.id}-${cue.text}`}
                  className="rounded-2xl border border-border/35 bg-muted/20 px-3 py-2.5"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/55">
                      Baris {cueIndex + 1}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground/70 tabular-nums">
                      {formatSrtRange(cue.startMs, cue.endMs)}
                    </span>
                  </div>
                  <textarea
                    className="w-full bg-card/35 hover:bg-card/55 border border-border/35 rounded-xl px-3 py-2 text-sm leading-relaxed text-foreground/85 focus:bg-card focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none shadow-sm"
                    rows={2}
                    defaultValue={cue.text}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (!transcriptSegments.length) return;
                      const updated = applyTranscriptCueEdit({
                        segments: transcriptSegments as TranscriptSegment[],
                        cue,
                        nextText: value,
                      });

                      onUpdateTranscript(
                        clip.id,
                        updated.map((segment) => ({
                          startMs: segment.startMs,
                          endMs: segment.endMs,
                          text: segment.text,
                        })),
                      );
                    }}
                    onInput={(e) => {
                      resizeTextarea(e.currentTarget);
                    }}
                    onFocus={(e) => {
                      resizeTextarea(e.currentTarget);
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
