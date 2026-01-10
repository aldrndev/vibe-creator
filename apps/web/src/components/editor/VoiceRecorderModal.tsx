import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";
import { Mic, Square, Pause, Play, Trash2, Check } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rekam Suara</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Timer display */}
          <div className="text-center py-8">
            <div className="text-5xl font-mono font-bold">
              {formatDuration(duration)}
            </div>
            {isRecording && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isPaused ? "bg-warning" : "bg-destructive animate-pulse"
                  }`}
                />
                <span className="text-sm text-muted-foreground">
                  {isPaused ? "Paused" : "Recording..."}
                </span>
              </div>
            )}
          </div>

          {/* Audio preview */}
          {audioUrl && !isRecording && (
            <div className="mb-4">
              <audio src={audioUrl} controls className="w-full" />
            </div>
          )}

          {/* Recording controls */}
          <div className="flex justify-center gap-3">
            {!isRecording && !audioBlob && (
              <Button
                variant="destructive"
                size="lg"
                className="w-16 h-16 rounded-full"
                onClick={startRecording}
              >
                <Mic size={28} />
              </Button>
            )}

            {isRecording && (
              <>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-14 h-14 rounded-full"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                >
                  {isPaused ? <Play size={24} /> : <Pause size={24} />}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-14 h-14 rounded-full"
                  onClick={stopRecording}
                >
                  <Square size={24} />
                </Button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-14 h-14 rounded-full"
                  onClick={clearRecording}
                >
                  <Trash2 size={24} />
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-16 h-16 rounded-full"
                  onClick={startRecording}
                >
                  <Mic size={28} />
                </Button>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={!audioBlob}>
            <Check size={18} />
            Simpan ke Timeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
