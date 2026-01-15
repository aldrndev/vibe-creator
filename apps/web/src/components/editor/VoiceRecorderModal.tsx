import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Badge,
} from "@/components/ui";
import { Mic, Square, Pause, Play, Trash2, Check, Radio } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { cn } from "@/lib/utils";

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (blob: Blob, duration: number) => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

export function VoiceRecorderModal({
  isOpen,
  onClose,
  onSave,
}: VoiceRecorderModalProps) {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    error,
  } = useVoiceRecorder();

  const handleSave = () => {
    if (audioBlob) {
      onSave(audioBlob, duration);
      clearRecording();
      onClose();
    }
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    clearRecording();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md bg-background/60 backdrop-blur-3xl border-white/10 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center text-destructive shadow-lg shadow-destructive/10">
                <Mic size={24} />
              </div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">
                Voice Captor
              </DialogTitle>
            </div>
            {isRecording && (
              <Badge
                variant="outline"
                className="h-6 font-black border-destructive/20 bg-destructive/5 text-destructive animate-pulse"
              >
                RECORDING
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl text-xs font-bold flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-destructive animate-ping" />
              {error}
            </div>
          )}

          {/* Timer display */}
          <div className="relative group/timer">
            <div className="absolute -inset-1 bg-gradient-to-b from-destructive/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover/timer:opacity-40 transition duration-1000"></div>
            <div className="relative bg-card/40 border border-border/40 rounded-3xl p-10 text-center space-y-4">
              <div className="text-6xl font-black font-mono tracking-tighter text-foreground tabular-nums drop-shadow-2xl">
                {formatDuration(duration)}
              </div>
              {isRecording ? (
                <div className="flex items-center justify-center gap-3">
                  <Radio
                    size={14}
                    className={cn(
                      "text-destructive",
                      !isPaused && "animate-pulse"
                    )}
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {isPaused
                      ? "Captor Suspended"
                      : "Capturing Audio Signal..."}
                  </span>
                </div>
              ) : (
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                  {audioBlob ? "Capture Successful" : "Ready to Capture"}
                </p>
              )}
            </div>
          </div>

          {/* Audio preview */}
          {audioUrl && !isRecording && (
            <div className="bg-background/40 border border-border/40 rounded-2xl p-4 overflow-hidden shadow-inner">
              <audio
                src={audioUrl}
                controls
                className="w-full h-10 [color-scheme:dark]"
              />
            </div>
          )}

          {/* Recording controls */}
          <div className="flex justify-center items-center gap-6">
            {!isRecording && !audioBlob && (
              <Button
                variant="destructive"
                className="w-20 h-20 rounded-full shadow-2xl shadow-destructive/30 hover:scale-110 active:scale-95 transition-all group"
                onClick={startRecording}
              >
                <Mic
                  size={32}
                  className="group-hover:rotate-12 transition-transform"
                />
              </Button>
            )}

            {isRecording && (
              <>
                <Button
                  variant="secondary"
                  className="w-16 h-16 rounded-full hover:bg-secondary/80 transition-all border border-white/5 active:scale-90"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                >
                  {isPaused ? (
                    <Play size={24} className="fill-current" />
                  ) : (
                    <Pause size={24} className="fill-current" />
                  )}
                </Button>
                <div className="w-px h-12 bg-white/5" />
                <Button
                  variant="destructive"
                  className="w-16 h-16 rounded-full shadow-xl shadow-destructive/20 active:scale-90"
                  onClick={stopRecording}
                >
                  <Square size={20} className="fill-current" />
                </Button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button
                  variant="ghost"
                  className="w-16 h-16 rounded-full text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 transition-all active:scale-90"
                  onClick={clearRecording}
                >
                  <Trash2 size={24} />
                </Button>
                <Button
                  variant="destructive"
                  className="w-20 h-20 rounded-full shadow-2xl shadow-destructive/30 hover:scale-110 transition-all active:scale-90"
                  onClick={startRecording}
                >
                  <Mic size={32} />
                </Button>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="p-8 pt-4 bg-white/5 border-t border-white/5 flex gap-4">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px]"
          >
            Abandon
          </Button>
          <Button
            onClick={handleSave}
            disabled={!audioBlob}
            className="h-12 flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Check size={14} className="mr-2" />
            Commit to Timeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
