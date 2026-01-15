import { Button, Card, CardBody, CardHeader } from "@/components/ui";
import { Upload, FileVideo } from "lucide-react";
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
        {!videoUrl ? (
          <div
            className="aspect-video bg-muted/20 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-all duration-300 border-2 border-dashed border-border/50 hover:border-primary/50 group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform group-hover:bg-primary/20">
              <Upload size={32} className="text-primary" />
            </div>
            <p className="text-foreground font-black tracking-tight text-lg">
              Klik untuk upload video
            </p>
            <p className="text-muted-foreground text-sm mt-1 font-medium">
              MP4, MOV, WebM • Max 200MB, 5 Min
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative group overflow-hidden rounded-[2rem] border border-border/50 bg-black/40">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                loop
                className="w-full aspect-video rounded-[2rem]"
                onLoadedMetadata={(e) =>
                  onVideoLoaded(e.currentTarget.duration)
                }
              />
            </div>
            <div className="flex items-center justify-center pt-2">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl px-8 font-bold text-xs uppercase tracking-widest"
              >
                <Upload size={14} className="mr-2" />
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
