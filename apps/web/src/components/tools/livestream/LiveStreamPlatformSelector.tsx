import { HoverCard } from '@/components/ui/PageTransition';
import type { StreamPlatform } from '@/hooks/useLiveStream';
import { cn } from '@/lib/utils';
import { platformConfigs } from './constants';

interface LiveStreamPlatformSelectorProps {
  platform: StreamPlatform;
  setPlatform: (p: StreamPlatform) => void;
  isStreaming: boolean;
}

export function LiveStreamPlatformSelector({
  platform,
  setPlatform,
  isStreaming,
}: LiveStreamPlatformSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 ml-1">
        <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Pilih Platform
        </div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          Target tujuan siaran anda
        </p>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-6 gap-2">
        {Object.entries(platformConfigs).map(([key, config]) => {
          const isActive = platform === key;
          return (
            <HoverCard key={key}>
              <button
                type="button"
                onClick={() => !isStreaming && setPlatform(key as StreamPlatform)}
                disabled={isStreaming}
                className={cn(
                  'flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border transition-all duration-300 relative group overflow-hidden active:scale-95 w-full h-full',
                  isActive
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card/20 backdrop-blur-xl border-border/50 hover:border-primary/30 hover:bg-muted/20',
                  isStreaming && !isActive ? 'opacity-40 grayscale' : '',
                )}
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300',
                    isActive
                      ? 'bg-primary text-white scale-110'
                      : 'bg-muted text-muted-foreground group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary',
                  )}
                >
                  {config.icon}
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      'text-xs font-black tracking-tight',
                      isActive ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    {config.name}
                  </p>
                </div>

                {isActive && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            </HoverCard>
          );
        })}
      </div>
    </div>
  );
}
