import type { Layer } from '@vibe-creator/shared';
import type { TimelineClipViewModel } from '@/lib/modern-timeline-utils';
import { cn } from '@/lib/utils';

interface CompactMobileTimelineProps {
  readonly layers: readonly Layer[];
  readonly clipViewModelById: ReadonlyMap<string, TimelineClipViewModel>;
  readonly currentTimeLeftPx: number;
  readonly timelineWidthPx: number;
  readonly onScrubStart: (event: React.PointerEvent<HTMLElement>) => void;
  readonly onSelectLayer: (layerId: string) => void;
}

export function CompactMobileTimeline({
  layers,
  clipViewModelById,
  currentTimeLeftPx,
  timelineWidthPx,
  onScrubStart,
  onSelectLayer,
}: CompactMobileTimelineProps) {
  return (
    <div className="flex h-full flex-col gap-2 p-3 md:hidden">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Timeline
        </p>
        <p className="text-[10px] font-bold text-muted-foreground">{layers.length} layer</p>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Scrub mini timeline"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, timelineWidthPx)}
        aria-valuenow={Math.max(0, currentTimeLeftPx)}
        className="relative min-h-0 flex-1 overflow-x-auto rounded-xl border border-border/40 bg-background/40 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onPointerDown={onScrubStart}
      >
        <div className="relative h-full min-w-full" style={{ width: timelineWidthPx }}>
          <span
            className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-primary"
            style={{ left: currentTimeLeftPx }}
          />
          {layers.map((layer, index) => {
            const viewModel = clipViewModelById.get(layer.id);
            if (!viewModel) return null;

            return (
              <button
                type="button"
                key={layer.id}
                aria-label={`Select ${viewModel.label}`}
                className={cn(
                  'absolute h-4 rounded border border-primary/30 bg-primary/20',
                  viewModel.selected && 'bg-primary/50',
                )}
                style={{
                  top: 8 + index * 18,
                  left: viewModel.leftPx,
                  width: viewModel.visualWidthPx,
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectLayer(layer.id);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
