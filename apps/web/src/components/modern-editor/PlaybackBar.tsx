/**
 * Playback Bar
 *
 * Video playback controls with scrubber, play/pause, and time display.
 */

import { clsx } from 'clsx';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui';
import { useModernEditorStore } from '@/stores/modern-editor-store';

interface PlaybackBarProps {
  className?: string;
}

export function PlaybackBar({ className }: PlaybackBarProps) {
  const { currentTimeMs, isPlaying, setCurrentTime, togglePlayback, getMaxEndMs } =
    useModernEditorStore();

  const duration = getMaxEndMs() || 15000;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds
      .toString()
      .padStart(2, '0')}`;
  };

  const handleSkipBack = () => {
    setCurrentTime(Math.max(0, currentTimeMs - 5000));
  };

  const handleSkipForward = () => {
    setCurrentTime(Math.min(duration, currentTimeMs + 5000));
  };

  return (
    <div
      className={clsx(
        'flex h-16 shrink-0 items-center justify-between gap-3 border-t border-border/50 bg-card/75 px-4 backdrop-blur-xl md:px-6',
        className,
      )}
    >
      <div className="min-w-[84px] rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-center font-mono text-xs font-black text-primary md:min-w-[104px]">
        {formatTime(currentTimeMs)}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Skip back 5 seconds"
          className="h-11 w-11 rounded-full text-muted-foreground hover:text-foreground"
          onClick={handleSkipBack}
        >
          <SkipBack size={18} />
        </Button>

        <Button
          size="icon"
          variant="default"
          aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
          className="h-12 w-12 rounded-full bg-primary text-primary-foreground transition-all active:scale-95"
          onClick={togglePlayback}
        >
          {isPlaying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" className="ml-0.5" />
          )}
        </Button>

        <Button
          size="icon"
          variant="ghost"
          aria-label="Skip forward 5 seconds"
          className="h-11 w-11 rounded-full text-muted-foreground hover:text-foreground"
          onClick={handleSkipForward}
        >
          <SkipForward size={18} />
        </Button>
      </div>

      <div className="min-w-[84px] rounded-xl border border-border/50 bg-muted/10 px-3 py-2 text-center font-mono text-xs font-black text-muted-foreground md:min-w-[104px]">
        {formatTime(duration)}
      </div>
    </div>
  );
}
