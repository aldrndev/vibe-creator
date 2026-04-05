import { FileVideo, Upload } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import { Button, Card, CardBody, CardHeader } from '@/components/ui';

const LOOP_VIDEO_LIMIT_LABEL = 'MP4, MOV, WebM • Max 200MB, 5 Min';

interface LoopVideoPreviewProps {
  readonly videoUrl: string;
  readonly videoRef: RefObject<HTMLVideoElement | null>;
  readonly fileInputRef: RefObject<HTMLInputElement | null>;
  readonly onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onVideoLoaded: (durationSec: number) => void;
}

export function LoopVideoPreview({
  videoUrl,
  videoRef,
  fileInputRef,
  onFileSelect,
  onVideoLoaded,
}: Readonly<LoopVideoPreviewProps>) {
  const handleSelectVideo = () => {
    fileInputRef.current?.click();
  };

  const handleMetadataLoaded = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    onVideoLoaded(event.currentTarget.duration);
  };

  return (
    <Card className="bg-card/70 backdrop-blur-xl border-border/50 h-full">
      <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 pb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <FileVideo size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight">Source Video</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Preview Asli
          </p>
        </div>
      </CardHeader>
      <CardBody className="p-6">
        {videoUrl ? (
          <div className="space-y-6">
            <div className="relative group overflow-hidden rounded-4xl border border-border/50 bg-black/40">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                loop
                className="w-full aspect-video rounded-4xl"
                onLoadedMetadata={handleMetadataLoaded}
              >
                <track kind="captions" label="Loop source preview" />
              </video>
            </div>
            <div className="flex items-center justify-center pt-2">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleSelectVideo}
                className="rounded-2xl px-8 font-bold text-xs uppercase tracking-widest"
              >
                <Upload size={14} className="mr-2" />
                Ganti Video
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Upload video source"
            className="aspect-video bg-muted/20 rounded-4xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-all duration-300 border-2 border-dashed border-border/50 hover:border-primary/50 group"
            onClick={handleSelectVideo}
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mt-4 mb-6 group-hover:scale-110 transition-transform group-hover:bg-primary/20">
              <Upload size={32} className="text-primary" />
            </div>
            <p className="text-foreground font-black tracking-tight text-lg">
              Klik untuk upload video
            </p>
            <p className="text-muted-foreground text-sm font-medium p-5">
              {LOOP_VIDEO_LIMIT_LABEL}
            </p>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={onFileSelect}
          className="hidden"
        />
      </CardBody>
    </Card>
  );
}
