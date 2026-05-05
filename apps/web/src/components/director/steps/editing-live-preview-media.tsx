import { Loader2, Play, ScanFace } from 'lucide-react';
import { getTranscriptLayoutLabel } from '@/components/director/steps/editing-transcript-cues';
import { Badge } from '@/components/ui';
import { getContentModeLabel, type ResolvedContentMode } from '@/lib/director-refine-settings';
import { cn } from '@/lib/utils';
import type { ExportSettings, RefineSettings, SubtitleStyle } from '@/stores/director-store';

interface LivePreviewMediaProps {
  readonly previewVideoUrl: string | null;
  readonly posterUrl: string | null;
  readonly previewError: string | null;
  readonly showGeneratingState: boolean;
  readonly previewProgressPercent: number;
  readonly mediaClass: string;
  readonly canPlayPreview: boolean;
  readonly onPlay: () => void;
}

export function LivePreviewMedia({
  previewVideoUrl,
  posterUrl,
  previewError,
  showGeneratingState,
  previewProgressPercent,
  mediaClass,
  canPlayPreview,
  onPlay,
}: LivePreviewMediaProps) {
  if (canPlayPreview && previewVideoUrl) {
    return (
      <>
        {posterUrl ? (
          <img
            src={posterUrl}
            alt="Thumbnail preview final"
            className={cn('w-full h-full object-contain rounded-[inherit]', mediaClass)}
          />
        ) : (
          <div className={cn('w-full h-full rounded-[inherit] bg-black/80', mediaClass)} />
        )}

        {!showGeneratingState && (
          <button
            type="button"
            onClick={onPlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-16 h-16 rounded-[1.25rem] border border-white/20 bg-black/35 text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-black/50 flex items-center justify-center shadow-xl"
            aria-label="Putar Preview Final"
          >
            <Play className="w-7 h-7 fill-white translate-x-[2px]" />
          </button>
        )}
        {showGeneratingState ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <div className="rounded-2xl border border-primary/20 bg-card/90 px-4 py-3 text-center backdrop-blur-md">
              <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                <Loader2 size={16} className="animate-spin text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Generate Ulang Preview</p>
              <p className="mt-1 text-xs text-muted-foreground">{previewProgressPercent}%</p>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (showGeneratingState) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt="Thumbnail clip yang sedang digenerate"
            className={cn('absolute inset-0 h-full w-full object-contain opacity-50', mediaClass)}
          />
        ) : null}
        <div className="rounded-2xl border border-primary/20 bg-card/85 px-4 py-3 text-center backdrop-blur-md">
          <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <Loader2 size={16} className="animate-spin text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">Preview Sedang Digenerate</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {previewProgressPercent}% • Mohon tunggu sebentar.
          </p>
        </div>
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-6 text-center">
        <div className="rounded-2xl border border-border/40 bg-card/90 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Preview Final Belum Tersedia</p>
          <p className="mt-1 text-xs text-muted-foreground">{previewError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,99,33,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.25))] px-6 text-center">
      {posterUrl ? (
        <img
          src={posterUrl}
          alt="Thumbnail clip"
          className={cn('absolute inset-0 h-full w-full object-contain', mediaClass)}
        />
      ) : null}
      <div className="relative rounded-2xl border border-border/40 bg-card/80 px-4 py-3 backdrop-blur-md">
        <p className="text-sm font-semibold text-foreground">Preview Final Belum Digenerate</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Generate preview untuk memutar hasil final.
        </p>
      </div>
    </div>
  );
}

interface PreviewBadgesProps {
  readonly resolvedContentMode: ResolvedContentMode | null;
  readonly exportSettings: ExportSettings;
  readonly subtitleStyle: SubtitleStyle;
  readonly activeRefineSettings: RefineSettings | undefined;
}

export function PreviewBadges({
  resolvedContentMode,
  exportSettings,
  subtitleStyle,
  activeRefineSettings,
}: PreviewBadgesProps) {
  return (
    <>
      {resolvedContentMode ? (
        <Badge className="rounded-full border-border/50 bg-muted/30 px-2 py-1 text-[10px] text-foreground">
          Mode {getContentModeLabel(resolvedContentMode)}
        </Badge>
      ) : null}
      {exportSettings.includeSubtitles ? (
        <Badge className="rounded-full border-border/50 bg-muted/30 px-2 py-1 text-[10px] text-foreground">
          {getTranscriptLayoutLabel(subtitleStyle.animation)}
        </Badge>
      ) : null}
      {activeRefineSettings?.faceTracking && exportSettings.aspectRatio === '9:16' ? (
        <Badge className="rounded-full border-border/50 bg-muted/30 px-2 py-1 text-[10px] text-foreground">
          <ScanFace size={12} className="mr-1" />
          Smart Crop Aktif
        </Badge>
      ) : null}
    </>
  );
}
