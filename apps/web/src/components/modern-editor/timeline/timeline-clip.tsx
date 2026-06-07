import type { Layer } from '@vibe-creator/shared';
import { Film, ImageIcon, Lock, Music, Type } from 'lucide-react';
import {
  getTimelineThumbnailTileCount,
  shouldShowTimelineClipLabel,
  type TimelineClipViewModel,
  type TimelineLayerLabel,
} from '@/lib/modern-timeline-utils';
import { cn } from '@/lib/utils';
import { MediaAssetThumbnail } from '../media-asset-thumbnail';

type TimelinePointerMode = 'move' | 'trim-start' | 'trim-end';

interface TimelineClipProps {
  readonly layer: Layer;
  readonly viewModel: TimelineClipViewModel;
  readonly previewLeftPx: number | null;
  readonly previewWidthPx: number | null;
  readonly previewTranslateYPx?: number;
  readonly onSelect: (event: React.MouseEvent<HTMLButtonElement>) => void;
  readonly onPointerStart: (
    event: React.PointerEvent<HTMLButtonElement>,
    mode: TimelinePointerMode,
  ) => void;
}

function getLaneIcon(lane: TimelineLayerLabel) {
  if (lane === 'Video') return Film;
  if (lane === 'Image') return ImageIcon;
  if (lane === 'Audio') return Music;
  return Type;
}

function getClipTone(lane: TimelineLayerLabel): string {
  if (lane === 'Video') {
    return 'border-emerald-400/30 bg-emerald-400/10';
  }

  if (lane === 'Audio') {
    return 'border-sky-400/30 bg-sky-400/10';
  }

  if (lane === 'Image') {
    return 'border-violet-300/30 bg-violet-400/10';
  }

  return 'border-primary/30 bg-primary/10';
}

export function TimelineClip({
  layer,
  viewModel,
  previewLeftPx,
  previewWidthPx,
  previewTranslateYPx = 0,
  onSelect,
  onPointerStart,
}: TimelineClipProps) {
  const LaneIcon = getLaneIcon(viewModel.lane);
  const leftPx = previewLeftPx ?? viewModel.leftPx;
  const widthPx = Math.max(viewModel.visualWidthPx, previewWidthPx ?? viewModel.widthPx);
  const isInteractive = !layer.locked;
  const showTextLabel = shouldShowTimelineClipLabel({ lane: viewModel.lane, widthPx });
  const isTextClip = viewModel.lane === 'Text' || viewModel.lane === 'Subtitle';
  const isCompactTextLabel = isTextClip && widthPx < 96;

  return (
    <div
      className={cn(
        'group/clip absolute top-1 z-0 h-10 overflow-hidden rounded-xl border shadow-sm transition-shadow',
        getClipTone(viewModel.lane),
        viewModel.selected && 'z-10 border-primary/80 ring-1 ring-primary/70',
        previewTranslateYPx !== 0 && 'z-20 shadow-lg',
      )}
      style={{
        left: Math.max(0, leftPx),
        width: widthPx,
        transform: previewTranslateYPx === 0 ? undefined : `translateY(${previewTranslateYPx}px)`,
      }}
    >
      <TimelineClipBackdrop viewModel={viewModel} widthPx={widthPx} />

      <button
        type="button"
        aria-label={`Select ${viewModel.label}`}
        className={cn(
          'absolute inset-0 z-10 flex min-w-0 items-center gap-1 px-1.5 text-left',
          isInteractive ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-70',
        )}
        onClick={onSelect}
        onPointerDown={(event) => {
          if (isInteractive) {
            onPointerStart(event, 'move');
          }
        }}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-black/50 text-primary shadow-sm backdrop-blur">
          {layer.locked ? <Lock size={12} /> : <LaneIcon size={12} />}
        </span>
        {showTextLabel && (
          <TimelineClipLabel
            compact={isCompactTextLabel}
            detail={viewModel.detail}
            isTextClip={isTextClip}
            label={viewModel.label}
          />
        )}
      </button>

      {viewModel.selected && isInteractive && (
        <>
          <button
            type="button"
            aria-label="Trim clip start"
            className="absolute left-0 top-0 z-20 h-full w-2.5 cursor-ew-resize bg-primary/20 transition-colors hover:bg-primary/40"
            onPointerDown={(event) => onPointerStart(event, 'trim-start')}
          >
            <span className="mx-auto block h-4 w-0.5 rounded-full bg-white/60" />
          </button>
          <button
            type="button"
            aria-label="Trim clip end"
            className="absolute right-0 top-0 z-20 h-full w-2.5 cursor-ew-resize bg-primary/20 transition-colors hover:bg-primary/40"
            onPointerDown={(event) => onPointerStart(event, 'trim-end')}
          >
            <span className="mx-auto block h-4 w-0.5 rounded-full bg-white/60" />
          </button>
        </>
      )}
    </div>
  );
}

function TimelineClipLabel({
  compact,
  detail,
  isTextClip,
  label,
}: Readonly<{ compact: boolean; detail: string; isTextClip: boolean; label: string }>) {
  if (isTextClip && compact) {
    return (
      <span className="min-w-0 max-w-[120px] rounded-md bg-black/35 px-1.5 py-0.5 shadow-sm backdrop-blur">
        <span className="block truncate text-[9px] font-black leading-tight text-white">
          {label}
        </span>
      </span>
    );
  }

  if (isTextClip) {
    return (
      <span className="flex min-w-0 max-w-[190px] flex-col rounded-md bg-black/35 px-1.5 py-0.5 shadow-sm backdrop-blur">
        <span className="block truncate text-[8px] font-black uppercase leading-none tracking-widest text-primary/90">
          {detail}
        </span>
        <span className="mt-0.5 block truncate text-[9px] font-black leading-tight text-white">
          {label}
        </span>
      </span>
    );
  }

  return (
    <span className="min-w-0 max-w-[170px] rounded-md bg-black/35 px-1.5 py-0.5 shadow-sm backdrop-blur">
      <span className="block truncate text-[9px] font-black leading-tight text-white">{label}</span>
    </span>
  );
}

function TimelineClipBackdrop({
  viewModel,
  widthPx,
}: Readonly<{ viewModel: TimelineClipViewModel; widthPx: number }>) {
  if (viewModel.lane === 'Audio') {
    return (
      <MediaAssetThumbnail
        kind="AUDIO"
        label={viewModel.label}
        variant="timeline"
        className="absolute inset-0 border-0 opacity-70"
      />
    );
  }

  if (viewModel.lane === 'Image' || viewModel.lane === 'Video') {
    if (viewModel.thumbnailStripUrls.length > 0) {
      return (
        <TimelineThumbnailStrip
          urls={viewModel.thumbnailStripUrls}
          widthPx={widthPx}
          isVideo={viewModel.lane === 'Video'}
        />
      );
    }

    if (viewModel.lane === 'Video' && viewModel.assetSourceUrl) {
      return <TimelineVideoFallback src={viewModel.assetSourceUrl} />;
    }
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
  );
}

function TimelineThumbnailStrip({
  isVideo,
  urls,
  widthPx,
}: Readonly<{ isVideo: boolean; urls: readonly string[]; widthPx: number }>) {
  const tileCount = getTimelineThumbnailTileCount(widthPx);

  return (
    <div className="absolute inset-0 flex overflow-hidden opacity-80">
      {Array.from({ length: tileCount }, (_, index) => (
        <div
          key={`${urls[index % urls.length]}-${index.toString(36)}`}
          className="relative min-w-[78px] flex-1 overflow-hidden border-r border-black/25 last:border-r-0"
        >
          <img
            src={urls[index % urls.length]}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            loading="lazy"
          />
          {isVideo && (
            <span className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-[repeating-linear-gradient(to_bottom,rgba(0,0,0,0.5)_0_3px,transparent_3px_7px)]" />
          )}
        </div>
      ))}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/50 via-black/10 to-black/40" />
    </div>
  );
}

function TimelineVideoFallback({ src }: Readonly<{ src: string }>) {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-80">
      <video
        src={src}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
      <span className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-[repeating-linear-gradient(to_bottom,rgba(0,0,0,0.5)_0_3px,transparent_3px_7px)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-black/45" />
    </div>
  );
}
