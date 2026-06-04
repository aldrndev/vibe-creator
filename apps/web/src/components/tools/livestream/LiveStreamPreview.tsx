import { Upload, Video, Volume2, VolumeX } from 'lucide-react';
import { useRef } from 'react';
import { Button, Card, CardBody } from '@/components/ui';

interface LiveStreamPreviewProps {
  videoUrl: string;
  isStreaming: boolean;
  onFileSelect: (file: File) => void;
  sourceMetadata?: {
    assetName: string;
    durationMs: number;
    width: number;
    height: number;
    hasAudio: boolean;
  };
  quality: '720p' | '1080p';
  bitrate: number;
  embedded?: boolean;
}

function formatDuration(durationMs: number): string {
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}:${String(remainingSeconds).padStart(2, '0')}` : `${seconds}s`;
}

export function LiveStreamPreview({
  videoUrl,
  isStreaming,
  onFileSelect,
  sourceMetadata,
  quality,
  bitrate,
  embedded = false,
}: LiveStreamPreviewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <Card
      className={
        embedded
          ? 'overflow-hidden border-border/40 bg-black/30 group/container'
          : 'bg-card/70 backdrop-blur-xl border-border/50 overflow-hidden group/container'
      }
    >
      <CardBody className="p-0">
        {!videoUrl ? (
          <button
            type="button"
            aria-label="Pilih file video"
            className="relative w-full min-h-[350px] md:min-h-0 md:aspect-video flex flex-col items-center justify-center p-8 transition-all duration-500 cursor-pointer group/card overflow-hidden active:scale-[0.99]"
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
          <div className="relative bg-black p-3 sm:p-4">
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video src={videoUrl} controls muted loop className="h-full w-full object-contain" />

              <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                  <Video size={12} className="text-primary" />
                  Loop Source
                </div>
                <div className="rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                  {quality} • {bitrate}kbps
                </div>
              </div>

              {isStreaming && (
                <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                  Streaming Live
                </div>
              )}
            </div>

            {sourceMetadata && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-foreground">
                      {sourceMetadata.assetName}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-muted-foreground">
                      <span>{formatDuration(sourceMetadata.durationMs)}</span>
                      <span>
                        {sourceMetadata.width} x {sourceMetadata.height}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        {sourceMetadata.hasAudio ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        {sourceMetadata.hasAudio ? 'Audio tersedia' : 'Tanpa audio'}
                      </span>
                      <span>Output memakai scale + pad, tidak stretch.</span>
                    </div>
                  </div>
                  {!isStreaming && (
                    <Button
                      variant="secondary"
                      className="h-10 shrink-0 rounded-xl px-4 text-xs font-black uppercase tracking-widest"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={14} className="mr-2" />
                      Ganti Video
                    </Button>
                  )}
                </div>
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
