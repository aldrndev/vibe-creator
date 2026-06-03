import type { TimelineRulerTick } from '@/lib/modern-timeline-utils';
import { cn } from '@/lib/utils';

interface TimelineRulerProps {
  readonly ticks: readonly TimelineRulerTick[];
  readonly widthPx: number;
  readonly currentTimeLeftPx: number;
  readonly onScrubStart: (event: React.PointerEvent<HTMLElement>) => void;
}

export function TimelineRuler({
  ticks,
  widthPx,
  currentTimeLeftPx,
  onScrubStart,
}: TimelineRulerProps) {
  return (
    <button
      type="button"
      aria-label="Scrub timeline"
      className="relative block h-9 min-w-full border-b border-border/50 bg-card/95 text-left backdrop-blur"
      style={{ width: widthPx }}
      onPointerDown={onScrubStart}
    >
      {ticks.map((tick) => (
        <span
          key={tick.timeMs}
          className={cn(
            'pointer-events-none absolute bottom-0 border-l text-[10px] font-semibold text-muted-foreground/70',
            tick.major ? 'h-5 border-border/70 pl-1.5' : 'h-3 border-border/40',
          )}
          style={{ left: tick.leftPx }}
        >
          {tick.major && <span className="absolute -top-4 whitespace-nowrap">{tick.label}</span>}
        </span>
      ))}
      <span
        className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-primary"
        style={{ left: currentTimeLeftPx }}
      />
    </button>
  );
}
