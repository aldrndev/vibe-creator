import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { Upload } from "lucide-react";
import { RefObject } from "react";

interface LoopVideoPreviewProps {
  videoUrl: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVideoLoaded: (durationSec: number) => void;
}

export function LoopVideoPreview({
  videoUrl,
  videoRef,
  fileInputRef,
  onFileSelect,
  onVideoLoaded,
}: LoopVideoPreviewProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Upload size={16} className="text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Video</h2>
      </CardHeader>
      <CardBody className="space-y-4">
        {!videoUrl ? (
          <div
            className="aspect-video bg-content2 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-content3 transition-colors border-2 border-dashed border-divider hover:border-primary/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload size={32} className="text-primary" />
            </div>
            <p className="text-foreground/60 font-medium">
              Klik untuk upload video
            </p>
            <p className="text-foreground/40 text-sm mt-1">
              MP4, MOV, WebM • Max 200MB, 5 Min
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              loop
              className="w-full aspect-video rounded-xl bg-black"
              onLoadedMetadata={(e) => onVideoLoaded(e.currentTarget.duration)}
            />
            <div className="flex items-center justify-center">
              <Button
                variant="flat"
                size="sm"
                onPress={() => fileInputRef.current?.click()}
                startContent={<Upload size={14} />}
              >
                Ganti Video
              </Button>
            </div>
          </div>
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
