import { Switch } from '@/components/ui';
import {
  type DirectorSubtitleTextColorToken,
  directorSubtitleColorOptions,
} from '@/lib/director-subtitle-colors';
import { cn } from '@/lib/utils';
import type { SubtitleStyle } from '@/stores/director-store';

const defaultPodcastSpeakerStyles: SubtitleStyle['speakerStyles'] = [
  {
    speaker: 'Penanya',
    label: 'Penanya',
    textColorToken: 'C_CYAN',
    bgColorToken: 'BG_TRANSPARENT',
  },
  {
    speaker: 'Penjawab',
    label: 'Penjawab',
    textColorToken: 'C_YELLOW',
    bgColorToken: 'BG_TRANSPARENT',
  },
];

function resolveSpeakerStyles(
  styles: SubtitleStyle['speakerStyles'],
): SubtitleStyle['speakerStyles'] {
  return styles.length ? styles : defaultPodcastSpeakerStyles;
}

export function EditingSubtitleSpeakerControls({
  subtitleStyle,
  onUpdateSubtitleStyle,
}: Readonly<{
  subtitleStyle: SubtitleStyle;
  onUpdateSubtitleStyle: (style: Partial<SubtitleStyle>) => void;
}>) {
  const isSpeakerModeEnabled = subtitleStyle.speakerMode === 'speaker-colors';
  const speakerStyles = resolveSpeakerStyles(subtitleStyle.speakerStyles);

  const handleToggleSpeakerMode = (checked: boolean) => {
    onUpdateSubtitleStyle({
      speakerMode: checked ? 'speaker-colors' : 'single',
      speakerStyles: checked ? speakerStyles : [],
    });
  };

  const handleUpdateSpeakerColor = (
    speaker: string,
    textColorToken: DirectorSubtitleTextColorToken,
  ) => {
    onUpdateSubtitleStyle({
      speakerMode: 'speaker-colors',
      speakerStyles: speakerStyles.map((speakerStyle) =>
        speakerStyle.speaker === speaker ? { ...speakerStyle, textColorToken } : speakerStyle,
      ),
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Warna Pembicara
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Bedakan subtitle penanya dan penjawab untuk interview atau podcast.
          </p>
        </div>
        <Switch
          checked={isSpeakerModeEnabled}
          onCheckedChange={handleToggleSpeakerMode}
          aria-label="Aktifkan warna subtitle per speaker"
        />
      </div>

      {isSpeakerModeEnabled ? (
        <div className="space-y-4 divide-y divide-border/20 border-t border-border/20 mt-3 pt-4">
          {speakerStyles.map((speakerStyle) => (
            <div key={speakerStyle.speaker} className="space-y-2.5 pt-4 first:pt-0">
              <div className="text-xs font-bold text-foreground">{speakerStyle.label}</div>
              <div className="grid grid-cols-4 gap-1.5">
                {directorSubtitleColorOptions
                  .filter((color) => color.value !== 'C_BLACK')
                  .map((color) => (
                    <button
                      type="button"
                      key={`${speakerStyle.speaker}-${color.value}`}
                      onClick={() => handleUpdateSpeakerColor(speakerStyle.speaker, color.value)}
                      className={cn(
                        'rounded-xl border px-1.5 py-1.5 text-[9px] font-bold transition-all',
                        speakerStyle.textColorToken === color.value
                          ? 'border-orange-500/40 bg-orange-500/10 text-orange-500'
                          : 'border-border/40 bg-card/30 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'mx-auto mb-1 block h-3.5 w-3.5 rounded-full border',
                          color.swatchClass,
                        )}
                      />
                      {color.label}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
