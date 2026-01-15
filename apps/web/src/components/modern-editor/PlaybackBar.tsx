/**
 * Playback Bar
 *
 * Video playback controls with scrubber, play/pause, and time display.
 */

import { Button, Slider } from "@/components/ui";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useModernEditorStore } from "@/stores/modern-editor-store";
import { clsx } from "clsx";

interface PlaybackBarProps {
  className?: string;
}

export function PlaybackBar({ className }: PlaybackBarProps) {
  const {
    currentTimeMs,
    isPlaying,
    setCurrentTime,
    pause,
    togglePlayback,
    getMaxEndMs,
  } = useModernEditorStore();

  const duration = getMaxEndMs() || 60000; // Default 60s if no layers

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds
      .toString()
      .padStart(2, "0")}`;
  };

  const handleSkipBack = () => {
    setCurrentTime(Math.max(0, currentTimeMs - 5000));
  };

  const handleSkipForward = () => {
    setCurrentTime(Math.min(duration, currentTimeMs + 5000));
  };

  const handleScrub = (value: number[]) => {
    const newTime = value[0];
    if (newTime !== undefined) {
      setCurrentTime(newTime);
      if (isPlaying) {
        pause();
      }
    }
  };

  return (
    <div
      className={clsx(
        "bg-card/70 backdrop-blur-xl border-t border-border/50 px-4 md:px-6 py-3 md:py-4 flex flex-col gap-3",
        className
      )}
    >
      {/* Scrubber - Full width on top */}
      <div className="w-full px-1">
        <Slider
          min={0}
          max={duration}
          value={[currentTimeMs]}
          onValueChange={handleScrub}
          className="w-full cursor-pointer"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Time Display - Current */}
        <div className="text-[10px] md:text-xs font-black font-mono text-primary/80 bg-primary/5 px-2 py-1 rounded-md border border-primary/10 w-20 md:w-24 text-center">
          {formatTime(currentTimeMs)}
        </div>

        {/* Playback Controls - Centered */}
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full w-8 h-8 md:w-10 md:h-10 text-muted-foreground hover:text-foreground"
            onClick={handleSkipBack}
          >
            <SkipBack size={18} />
          </Button>

          <Button
            size="icon"
            variant="default"
            className="rounded-full w-10 h-10 md:w-12 md:h-12 bg-primary text-white transition-all active:scale-95"
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
            className="rounded-full w-8 h-8 md:w-10 md:h-10 text-muted-foreground hover:text-foreground"
            onClick={handleSkipForward}
          >
            <SkipForward size={18} />
          </Button>
        </div>

        {/* Time Display - Total */}
        <div className="text-[10px] md:text-xs font-black font-mono text-muted-foreground/60 bg-muted/5 px-2 py-1 rounded-md border border-border/50 w-20 md:w-24 text-center">
          {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
