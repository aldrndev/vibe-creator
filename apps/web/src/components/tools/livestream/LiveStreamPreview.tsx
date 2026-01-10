import { useRef } from "react";
import { Button, Card, CardBody, CardHeader, Badge } from "@/components/ui";
import { Video, Upload } from "lucide-react";

interface LiveStreamPreviewProps {
  videoUrl: string;
  isStreaming: boolean;
  onFileSelect: (file: File) => void;
}

export function LiveStreamPreview({
  videoUrl,
  isStreaming,
  onFileSelect,
}: LiveStreamPreviewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Video size={16} className="text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Video Source</h2>
      </CardHeader>
      <CardBody className="space-y-4">
        {!videoUrl ? (
          <div
            className="aspect-video bg-muted rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors border-2 border-dashed border-border hover:border-primary/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload size={32} className="text-primary" />
            </div>
            <p className="text-muted-foreground font-medium">
              Upload video untuk stream
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Video akan di-loop terus menerus
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <video
                src={videoUrl}
                controls
                loop
                className="w-full aspect-video rounded-xl bg-black"
              />
              {isStreaming && (
                <div className="absolute top-3 left-3">
                  <Badge variant="destructive" className="animate-pulse">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      Streaming
                    </span>
                  </Badge>
                </div>
              )}
            </div>
            {!isStreaming && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} />
                Ganti Video
              </Button>
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
