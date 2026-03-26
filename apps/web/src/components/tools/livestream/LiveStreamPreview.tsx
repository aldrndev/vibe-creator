import { Upload, Video } from 'lucide-react';
import { useRef } from 'react';
import { Button, Card, CardBody } from '@/components/ui';

interface LiveStreamPreviewProps {
  videoUrl: string;
  isStreaming: boolean;
  onFileSelect: (file: File) => void;
}

export function LiveStreamPreview({ videoUrl, isStreaming, onFileSelect }: LiveStreamPreviewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <Card className="bg-card/70 backdrop-blur-xl border-border/50 overflow-hidden group/container">
      <CardBody className="p-0">
        {!videoUrl ? (
          <button
            type="button"
            aria-label="Pilih file video"
            className="w-full min-h-[350px] md:min-h-0 md:aspect-video flex flex-col items-center justify-center p-8 transition-all duration-500 cursor-pointer group/card overflow-hidden active:scale-[0.99]"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="absolute inset-0 bg-muted/10 group-hover/card:bg-muted/20 transition-colors duration-500" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 group-hover/card:scale-110 transition-transform duration-500 group-hover/card:bg-primary/20 border border-primary/20">
                <Video size={36} className="text-primary" />
              </div>
              <h3 className="text-lg font-black tracking-tight uppercase text-foreground mb-2">
                Pilih Sumber Video
              </h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] max-w-[200px] text-center leading-relaxed">
                Video akan disiarkan secara terus menerus (looping)
              </p>

              <div className="mt-8 px-6 py-2 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest group-hover/card:bg-primary/90 transition-all">
                Pilih File Video
              </div>
            </div>
          </button>
        ) : (
          <div className="relative aspect-video">
            <video src={videoUrl} autoPlay muted loop className="w-full h-full object-cover" />

            {/* Status Overlays */}
            <div className="absolute top-4 left-4 flex gap-2">
              <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-[9px] text-white font-black uppercase tracking-widest flex items-center gap-2">
                <Video size={12} className="text-primary" />
                Source: {videoUrl.split('/').pop()}
              </div>

              {isStreaming && (
                <div className="px-3 py-1.5 bg-rose-500 border border-rose-400/30 rounded-full text-[9px] text-white font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                  Streaming Live
                </div>
              )}
            </div>

            {/* Change Button Overlay */}
            {!isStreaming && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/container:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                <Button
                  variant="secondary"
                  className="rounded-full h-12 px-6 font-black uppercase tracking-widest text-xs scale-90 group-hover/container:scale-100 transition-transform duration-300"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} className="mr-2" />
                  Ganti Video
                </Button>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </CardBody>
    </Card>
  );
}
