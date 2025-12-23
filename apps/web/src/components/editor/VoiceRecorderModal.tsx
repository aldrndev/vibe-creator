import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Mic, Square, Pause, Play, Trash2, Check } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (blob: Blob, duration: number) => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function VoiceRecorderModal({ isOpen, onClose, onSave }: VoiceRecorderModalProps) {
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
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalContent>
        <ModalHeader>Rekam Suara</ModalHeader>
        <ModalBody>
          {error && (
            <div className="bg-danger/10 text-danger p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          {/* Timer display */}
          <div className="text-center py-8">
            <div className="text-5xl font-mono font-bold text-foreground">
              {formatDuration(duration)}
            </div>
            {isRecording && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-warning' : 'bg-danger animate-pulse'}`} />
                <span className="text-sm text-foreground/60">
                  {isPaused ? 'Paused' : 'Recording...'}
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
                color="danger"
                size="lg"
                isIconOnly
                className="w-16 h-16 rounded-full"
                onPress={startRecording}
              >
                <Mic size={28} />
              </Button>
            )}

            {isRecording && (
              <>
                <Button
                  variant="flat"
                  size="lg"
                  isIconOnly
                  className="w-14 h-14 rounded-full"
                  onPress={isPaused ? resumeRecording : pauseRecording}
                >
                  {isPaused ? <Play size={24} /> : <Pause size={24} />}
                </Button>
                <Button
                  color="danger"
                  size="lg"
                  isIconOnly
                  className="w-14 h-14 rounded-full"
                  onPress={stopRecording}
                >
                  <Square size={24} />
                </Button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button
                  variant="flat"
                  size="lg"
                  isIconOnly
                  className="w-14 h-14 rounded-full"
                  onPress={clearRecording}
                >
                  <Trash2 size={24} />
                </Button>
                <Button
                  color="danger"
                  size="lg"
                  isIconOnly
                  className="w-16 h-16 rounded-full"
                  onPress={startRecording}
                >
                  <Mic size={28} />
                </Button>
              </>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            Batal
          </Button>
          <Button 
            color="primary" 
            onPress={handleSave}
            isDisabled={!audioBlob}
            startContent={<Check size={18} />}
          >
            Simpan ke Timeline
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
