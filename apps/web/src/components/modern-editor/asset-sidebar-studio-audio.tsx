import { Music2, Pause, Play, Plus, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { VideoStudioAsset } from '@/services/video-studio-assets-api';

interface StudioAudioAssetListProps {
  readonly assets: VideoStudioAsset[];
  readonly onAdd: (asset: VideoStudioAsset) => void;
}

function formatDuration(durationMs: number | null): string {
  if (!durationMs) {
    return '-';
  }

  if (durationMs < 1000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }

  const roundedSeconds = Math.round(durationMs / 1000);
  if (roundedSeconds < 60) {
    return `${roundedSeconds}s`;
  }

  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function groupAudioAssets(assets: readonly VideoStudioAsset[]) {
  return assets.reduce<Record<string, VideoStudioAsset[]>>((groups, asset) => {
    const group = groups[asset.category] ?? [];
    groups[asset.category] = [...group, asset];
    return groups;
  }, {});
}

const waveformBars = ['h-5', 'h-9', 'h-6', 'h-11', 'h-7', 'h-4'] as const;

export function StudioAudioAssetList({ assets, onAdd }: Readonly<StudioAudioAssetListProps>) {
  const groupedAssets = groupAudioAssets(assets);
  const categories = Object.keys(groupedAssets);

  if (assets.length === 0) {
    return (
      <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border/45 p-4 text-center">
        <Sparkles size={18} className="mb-2 text-primary/70" />
        <p className="text-sm font-black text-foreground">Audio pack belum tersedia</p>
        <p className="mt-1 text-xs font-semibold text-muted-foreground/70">
          Upload audio sendiri atau coba lagi setelah katalog siap.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {categories.map((category) => (
        <section key={category} className="space-y-2.5">
          <div className="px-1">
            <p className="text-xs font-black capitalize tracking-tight text-foreground">
              {category}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground/75">
              Preview singkat, lalu tambahkan ke timeline.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {groupedAssets[category]?.map((asset) => (
              <AudioAssetCard key={asset.id} asset={asset} onAdd={() => onAdd(asset)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function AudioAssetCard({
  asset,
  onAdd,
}: Readonly<{ asset: VideoStudioAsset; onAdd: () => void }>) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const hasPreview = Boolean(asset.previewUrl);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const handlePreview = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setPlaybackError(null);

    try {
      audio.currentTime = 0;
    } catch {
      // Some browsers reject seeking before metadata is ready. Playback still works.
    }

    void audio
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        setIsPlaying(false);
        setPlaybackError('Preview audio tidak bisa diputar.');
      });
  };

  return (
    <article className="overflow-hidden rounded-xl border border-border/45 bg-card/55 p-2.5 shadow-sm transition-all hover:border-primary/40 hover:bg-card/75">
      <div className="mb-2.5 flex h-16 items-center justify-center rounded-lg border border-white/10 bg-linear-to-br from-sky-950/70 via-primary/10 to-card">
        <div className="flex items-end gap-1.5 text-primary">
          {waveformBars.map((heightClass) => (
            <span key={heightClass} className={cn('w-2 rounded-full bg-current/80', heightClass)} />
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <Music2 size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-black leading-tight tracking-tight text-foreground">
              {asset.title}
            </p>
            <Badge
              variant="outline"
              className="h-5 border-primary/20 bg-primary/5 px-2 text-[9px] font-black uppercase tracking-widest text-primary"
            >
              {formatDuration(asset.durationMs)}
            </Badge>
          </div>
          <p className="line-clamp-2 text-[10px] font-semibold leading-snug text-muted-foreground/70">
            {asset.description}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-lg bg-primary text-primary-foreground"
          onClick={onAdd}
          aria-label={`Tambah ${asset.title}`}
        >
          <Plus size={16} />
        </Button>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 w-full rounded-lg border-border/55 bg-background/50 text-xs font-black"
          onClick={handlePreview}
          disabled={!hasPreview}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {isPlaying ? 'Stop' : 'Preview'}
        </Button>
      </div>

      {playbackError && (
        <p className="mt-2 rounded-lg border border-destructive/25 bg-destructive/10 px-2 py-1.5 text-[10px] font-bold text-destructive">
          {playbackError}
        </p>
      )}

      {asset.previewUrl && (
        <audio
          ref={audioRef}
          src={asset.previewUrl}
          preload="metadata"
          className="hidden"
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onError={() => {
            setIsPlaying(false);
            setPlaybackError('Preview audio tidak bisa diputar.');
          }}
        >
          <track
            kind="captions"
            src="data:text/vtt,WEBVTT%0A%0A"
            srcLang="id"
            label="Efek audio tanpa dialog"
          />
        </audio>
      )}
    </article>
  );
}
