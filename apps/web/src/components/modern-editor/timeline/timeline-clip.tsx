import type { Layer } from '@vibe-creator/shared';
import { Film, ImageIcon, Lock, Music, Type } from 'lucide-react';
import type { TimelineClipViewModel, TimelineLayerLabel } from '@/lib/modern-timeline-utils';
import { cn } from '@/lib/utils';

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
    return 'border-primary/45 bg-primary/20';
  }

  if (lane === 'Audio') {
    return 'border-primary/35 bg-background/80';
  }

  if (lane === 'Image') {
    return 'border-border/70 bg-muted/70';
  }

  return 'border-primary/30 bg-card/95';
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

  return (
    <div
      className={cn(
        'group/clip absolute top-1.5 h-9 overflow-hidden rounded-lg border shadow-sm transition-shadow',
        getClipTone(viewModel.lane),
        viewModel.selected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
        previewTranslateYPx !== 0 && 'z-40 shadow-lg',
      )}
      style={{
        left: Math.max(0, leftPx),
        width: widthPx,
        transform: previewTranslateYPx !== 0 ? `translateY(${previewTranslateYPx}px)` : undefined,
      }}
    >
      <button
        type="button"
        aria-label={`Select ${viewModel.label}`}
        className={cn(
          'absolute inset-0 z-10 flex min-w-0 items-center gap-2 px-2 text-left',
          isInteractive ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-70',
        )}
        onClick={onSelect}
        onPointerDown={(event) => {
          if (isInteractive) {
            onPointerStart(event, 'move');
          }
        }}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-background/70 text-primary">
          {layer.locked ? <Lock size={13} /> : <LaneIcon size={13} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-black text-foreground">
            {viewModel.label}
          </span>
          <span className="block truncate text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
            {viewModel.detail}
          </span>
        </span>
      </button>

      {viewModel.assetPreviewUrl && viewModel.lane !== 'Audio' && (
        <div className="absolute inset-0 opacity-35">
          <img
            src={viewModel.assetPreviewUrl}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      )}

      {viewModel.lane === 'Audio' && (
        <div className="pointer-events-none absolute inset-y-1.5 left-10 right-2 flex items-center gap-0.5 opacity-70">
          {viewModel.waveformBars.map((bar) => (
            <span
              key={bar.id}
              className="w-0.5 rounded-full bg-primary/70"
              style={{ height: `${bar.height}%` }}
            />
          ))}
        </div>
      )}

      {viewModel.selected && isInteractive && (
        <>
          <button
            type="button"
            aria-label="Trim clip start"
            className="absolute left-0 top-0 z-20 h-full w-3 cursor-ew-resize bg-primary/20 transition-colors hover:bg-primary/45"
            onPointerDown={(event) => onPointerStart(event, 'trim-start')}
          >
            <span className="mx-auto block h-5 w-1 rounded-full bg-primary-foreground/90" />
          </button>
          <button
            type="button"
            aria-label="Trim clip end"
            className="absolute right-0 top-0 z-20 h-full w-3 cursor-ew-resize bg-primary/20 transition-colors hover:bg-primary/45"
            onPointerDown={(event) => onPointerStart(event, 'trim-end')}
          >
            <span className="mx-auto block h-5 w-1 rounded-full bg-primary-foreground/90" />
          </button>
        </>
      )}
    </div>
  );
}
