import { HoverCard } from '@/components/ui/PageTransition';
import type { StreamPlatform } from '@/hooks/useLiveStream';
import { cn } from '@/lib/utils';
import { platformConfigs } from './constants';

interface LiveStreamPlatformSelectorProps {
  platform: StreamPlatform;
  setPlatform: (p: StreamPlatform) => void;
  isStreaming: boolean;
  embedded?: boolean;
}

export function LiveStreamPlatformSelector({
  platform,
  setPlatform,
  isStreaming,
  embedded = false,
}: LiveStreamPlatformSelectorProps) {
  return (
    <section
      className={cn(
        'overflow-hidden',
        embedded ? 'bg-transparent' : 'rounded-3xl border border-border/50 bg-card/70',
      )}
    >
      <div
        className={cn(
          'flex min-h-[82px] flex-col justify-center border-b border-border/50 px-5 py-4',
          embedded && 'px-5 sm:px-6',
        )}
      >
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
          Pilih Platform
        </h2>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75">
          Target tujuan siaran anda
        </p>
      </div>

      <div className={cn('grid grid-cols-3 gap-2 p-5 md:grid-cols-6', embedded && 'sm:p-6')}>
        {Object.entries(platformConfigs).map(([key, config]) => {
          const isActive = platform === key;
          return (
            <HoverCard key={key}>
              <button
                type="button"
                onClick={() => !isStreaming && setPlatform(key as StreamPlatform)}
                disabled={isStreaming}
                className={cn(
                  'group relative flex h-28 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border p-3 transition-all duration-300 active:scale-95',
                  isActive
                    ? 'border-primary/35 bg-muted/25'
                    : 'bg-card/20 border-border/50 hover:border-primary/30 hover:bg-muted/20',
                  isStreaming && !isActive ? 'opacity-40 grayscale' : '',
                )}
              >
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300',
                    isActive
                      ? 'bg-muted text-primary scale-105'
                      : 'bg-muted text-muted-foreground group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary',
                  )}
                >
                  {config.icon}
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-black tracking-tight text-foreground">
                    {config.name}
                  </p>
                </div>

                {isActive && (
                  <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                )}
              </button>
            </HoverCard>
          );
        })}
      </div>
    </section>
  );
}
