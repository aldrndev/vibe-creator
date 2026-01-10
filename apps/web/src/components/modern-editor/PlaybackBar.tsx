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
      className={clsx("bg-card border-t border-border px-4 py-3", className)}
    >
      <div className="flex items-center gap-4">
        {/* Time Display */}
        <div className="text-sm font-mono text-muted-foreground w-24">
          {formatTime(currentTimeMs)}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={handleSkipBack}>
            <SkipBack size={16} />
          </Button>
          <Button size="icon" variant="default" onClick={togglePlayback}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <Button size="icon" variant="ghost" onClick={handleSkipForward}>
            <SkipForward size={16} />
          </Button>
        </div>

        {/* Scrubber */}
        <div className="flex-1">
          <Slider
            min={0}
            max={duration}
            value={[currentTimeMs]}
            onValueChange={handleScrub}
            className="w-full"
          />
        </div>

        {/* Duration Display */}
        <div className="text-sm font-mono text-muted-foreground w-24 text-right">
          {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
