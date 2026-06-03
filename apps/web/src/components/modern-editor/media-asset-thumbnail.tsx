import type { Layer } from '@vibe-creator/shared';
import { ImageIcon, Music, Type, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  buildEditorMediaWaveformBars,
  type EditorMediaPreviewKind,
  getWaveformBarHeightClass,
  resolveEditorAssetPreviewUrl,
  resolveEditorMediaPreviewKind,
} from '@/lib/modern-editor-media-preview';
import { cn } from '@/lib/utils';
import type { EditorAsset } from '@/stores/editor-store';

type MediaThumbnailVariant = 'asset-card' | 'layer' | 'timeline';

interface MediaAssetThumbnailProps {
  readonly asset?: EditorAsset | null;
  readonly className?: string;
  readonly kind?: EditorMediaPreviewKind;
  readonly label?: string;
  readonly layer?: Layer | null;
  readonly previewUrl?: string | null;
  readonly variant?: MediaThumbnailVariant;
}

const variantClassNames: Record<MediaThumbnailVariant, string> = {
  'asset-card': 'h-28 w-full rounded-xl border border-border/35',
  layer: 'h-10 w-10 rounded-lg border',
  timeline: 'h-full w-full rounded-lg border-0',
};

export function MediaAssetThumbnail({
  asset,
  className,
  kind,
  label,
  layer,
  previewUrl,
  variant = 'layer',
}: Readonly<MediaAssetThumbnailProps>) {
  const resolvedKind = kind ?? resolveEditorMediaPreviewKind({ asset, layer });
  const resolvedPreviewUrl = previewUrl ?? resolveEditorAssetPreviewUrl(asset);
  const resolvedLabel = label ?? resolveThumbnailLabel({ asset, layer, kind: resolvedKind });
  const shouldRenderVideoFallback =
    resolvedKind === 'VIDEO' && !resolvedPreviewUrl && variant !== 'timeline' && asset?.url;

  if ((resolvedKind === 'IMAGE' || resolvedKind === 'VIDEO') && resolvedPreviewUrl) {
    return (
      <ThumbnailShell className={className} kind={resolvedKind} variant={variant}>
        <img
          src={resolvedPreviewUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
          loading="lazy"
        />
        {variant === 'asset-card' && <MediaKindPill kind={resolvedKind} />}
      </ThumbnailShell>
    );
  }

  if (shouldRenderVideoFallback) {
    return (
      <ThumbnailShell className={className} kind="VIDEO" variant={variant}>
        <video
          src={asset.url}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
        {variant === 'asset-card' && <MediaKindPill kind="VIDEO" />}
      </ThumbnailShell>
    );
  }

  if (resolvedKind === 'AUDIO') {
    return (
      <ThumbnailShell className={className} kind="AUDIO" variant={variant}>
        <WaveformMark seed={asset?.id ?? layer?.id ?? resolvedLabel} variant={variant} />
        {variant === 'asset-card' && <MediaKindPill kind="AUDIO" />}
      </ThumbnailShell>
    );
  }

  if (resolvedKind === 'TEXT') {
    return (
      <ThumbnailShell
        className={cn(variant === 'layer' && 'h-10 w-10 rounded-xl', className)}
        kind="TEXT"
        variant={variant}
      >
        <TextMark label={resolvedLabel} variant={variant} />
      </ThumbnailShell>
    );
  }

  return (
    <ThumbnailShell className={className} kind={resolvedKind} variant={variant}>
      <FallbackIcon kind={resolvedKind} />
      {variant === 'asset-card' && <MediaKindPill kind={resolvedKind} />}
    </ThumbnailShell>
  );
}

function ThumbnailShell({
  children,
  className,
  kind,
  variant,
}: Readonly<{
  children: ReactNode;
  className?: string;
  kind: EditorMediaPreviewKind;
  variant: MediaThumbnailVariant;
}>) {
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden bg-background/45',
        getToneClassName(kind),
        variantClassNames[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

function WaveformMark({
  seed,
  variant,
}: Readonly<{ seed: string; variant: MediaThumbnailVariant }>) {
  const bars = buildEditorMediaWaveformBars(seed, variant === 'layer' ? 5 : 24);

  return (
    <span
      className={cn(
        'flex h-full w-full items-center justify-center gap-0.5 text-current',
        variant === 'asset-card' && 'px-4',
        variant === 'timeline' && 'justify-start px-10 opacity-75',
      )}
    >
      {bars.map((bar) => (
        <span
          key={bar.id}
          className={cn(
            'rounded-full bg-current',
            variant === 'timeline' ? 'w-0.5' : 'w-1.5',
            getWaveformBarHeightClass(bar.height),
          )}
        />
      ))}
    </span>
  );
}

function TextMark({ label, variant }: Readonly<{ label: string; variant: MediaThumbnailVariant }>) {
  if (variant === 'layer') {
    return (
      <span className="flex h-full w-full items-center justify-center rounded-[inherit] bg-black/20 text-sm font-black leading-none text-primary">
        Aa
      </span>
    );
  }

  return (
    <span className="flex h-full w-full flex-col justify-center px-3 text-primary">
      <span className="font-black text-sm leading-none">Aa</span>
      <span className="mt-1 line-clamp-2 max-w-full font-black text-[9px] leading-tight text-primary/70">
        {label}
      </span>
    </span>
  );
}

function MediaKindPill({ kind }: Readonly<{ kind: EditorMediaPreviewKind }>) {
  return (
    <span className="absolute right-2 bottom-2 rounded-full border border-black/20 bg-black/55 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-lg backdrop-blur">
      {kind}
    </span>
  );
}

function FallbackIcon({ kind }: Readonly<{ kind: EditorMediaPreviewKind }>) {
  if (kind === 'IMAGE') {
    return <ImageIcon size={18} />;
  }

  if (kind === 'AUDIO') {
    return <Music size={18} />;
  }

  if (kind === 'TEXT') {
    return <Type size={18} />;
  }

  return <Video size={18} />;
}

function resolveThumbnailLabel({
  asset,
  kind,
  layer,
}: Readonly<{
  asset?: EditorAsset | null;
  kind: EditorMediaPreviewKind;
  layer?: Layer | null;
}>): string {
  if (asset?.name) {
    return asset.name;
  }

  if (layer?.type === 'text') {
    return layer.data.text.trim() || (layer.id.includes('subtitle') ? 'Subtitle' : 'Text');
  }

  return kind;
}

function getToneClassName(kind: EditorMediaPreviewKind): string {
  if (kind === 'AUDIO') {
    return 'border-sky-400/20 bg-sky-400/10 text-sky-200';
  }

  if (kind === 'TEXT') {
    return 'border-primary/25 bg-primary/10 text-primary';
  }

  if (kind === 'IMAGE') {
    return 'border-violet-300/20 bg-violet-400/10 text-violet-100';
  }

  return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100';
}
