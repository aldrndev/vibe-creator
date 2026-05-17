import { Check, Mic, RotateCcw, Square, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
} from '@/components/ui';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import { cn } from '@/lib/utils';

interface RecordVoiceDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (recording: { file: File; durationMs: number }) => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function createRecordingFile(blob: Blob, name: string): File {
  const extension = blob.type.includes('mp4') ? 'm4a' : 'webm';
  const normalizedName = name.trim() || 'Voice recording';
  return new File([blob], `${normalizedName}.${extension}`, {
    type: blob.type || 'audio/webm',
    lastModified: Date.now(),
  });
}

export function RecordVoiceDialog({
  open,
  onOpenChange,
  onSave,
}: Readonly<RecordVoiceDialogProps>) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [name, setName] = useState('Voice over');
  const [localError, setLocalError] = useState<string | null>(null);
  const {
    audioBlob,
    audioUrl,
    clearRecording,
    duration,
    error,
    isRecording,
    startRecording,
    stopRecording,
  } = useVoiceRecorder();

  const canRecord = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined',
    [],
  );

  useEffect(() => {
    if (!open) {
      setCountdown(null);
      setLocalError(null);
      clearRecording();
      return;
    }
  }, [clearRecording, open]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      setCountdown(null);
      void startRecording();
      return;
    }

    const timer = window.setTimeout(() => setCountdown((value) => (value ?? 1) - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, startRecording]);

  const handleStart = () => {
    if (!canRecord) {
      setLocalError('Browser ini belum mendukung rekam audio langsung.');
      return;
    }

    setLocalError(null);
    clearRecording();
    setCountdown(3);
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    clearRecording();
    setCountdown(null);
    setLocalError(null);
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!audioBlob || duration <= 0) {
      setLocalError('Recording kosong. Rekam ulang beberapa detik dulu.');
      return;
    }

    onSave({ file: createRecordingFile(audioBlob, name), durationMs: duration });
    handleClose();
  };

  const visibleError = localError ?? error;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (!nextOpen ? handleClose() : onOpenChange(true))}
    >
      <DialogContent
        hideCloseButton
        className="max-w-md overflow-hidden rounded-3xl border-border/50 bg-card p-0 shadow-2xl"
      >
        <button
          type="button"
          aria-label="Tutup recorder"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border/35 bg-background/50 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          onClick={handleClose}
        >
          <X size={18} />
        </button>

        <div className="space-y-5 p-6 pt-8">
          <div className="flex items-center gap-3 pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Mic size={22} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-black tracking-tight">Record Voice</DialogTitle>
              <DialogDescription className="mt-1 text-xs font-semibold text-muted-foreground">
                Rekam dubbing, preview, lalu tambahkan ke timeline.
              </DialogDescription>
            </div>
          </div>

          <div className="rounded-3xl border border-border/35 bg-background/30 p-5 text-center">
            <div className="text-5xl font-black tabular-nums tracking-tighter">
              {countdown ?? formatDuration(duration)}
            </div>
            <p
              className={cn(
                'mt-2 text-[10px] font-black uppercase tracking-widest',
                isRecording ? 'text-primary' : 'text-muted-foreground/70',
              )}
            >
              {countdown !== null
                ? 'Mulai rekam...'
                : isRecording
                  ? 'Recording'
                  : audioBlob
                    ? 'Preview ready'
                    : 'Ready'}
            </p>
          </div>

          {visibleError && (
            <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-xs font-bold text-destructive">
              {visibleError}
            </div>
          )}

          {audioUrl && !isRecording && (
            <div className="space-y-3">
              <Input
                value={name}
                className="h-11 rounded-xl border-border/40 bg-background/40 text-sm font-bold"
                onChange={(event) => setName(event.target.value)}
              />
              <audio src={audioUrl} controls className="h-10 w-full [color-scheme:dark]">
                <track kind="captions" label="Voice recording preview" />
              </audio>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {isRecording ? (
              <Button
                type="button"
                className="col-span-2 h-12 rounded-2xl font-black"
                onClick={stopRecording}
              >
                <Square size={16} className="mr-2 fill-current" />
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                variant={audioBlob ? 'outline' : 'default'}
                className={cn('h-12 rounded-2xl font-black', !audioBlob && 'col-span-2')}
                onClick={handleStart}
                disabled={countdown !== null}
              >
                {audioBlob ? (
                  <RotateCcw size={16} className="mr-2" />
                ) : (
                  <Mic size={16} className="mr-2" />
                )}
                {audioBlob ? 'Retake' : 'Record'}
              </Button>
            )}

            {audioBlob && !isRecording && (
              <Button type="button" className="h-12 rounded-2xl font-black" onClick={handleSave}>
                <Check size={16} className="mr-2" />
                Add
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
