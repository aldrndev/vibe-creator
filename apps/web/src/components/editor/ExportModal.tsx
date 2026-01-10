import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from "@/components/ui";
import { Download } from "lucide-react";
import { useState } from "react";

interface ExportModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onExport: (options: {
    format: "MP4" | "WEBM" | "MOV";
    resolution: "SD" | "HD" | "UHD";
    width?: number;
    height?: number;
    fps?: number;
  }) => void;
  isExporting: boolean;
  currentDimensions?: { width: number; height: number };
}

export function ExportModal({
  isOpen,
  onOpenChange,
  onExport,
  isExporting,
  currentDimensions,
}: ExportModalProps) {
  const [resolutionScale, setResolutionScale] = useState<number>(1);

  if (!currentDimensions) return null;

  const width = Math.round(currentDimensions.width * resolutionScale);
  const height = Math.round(currentDimensions.height * resolutionScale);

  const handleExport = () => {
    onExport({
      format: "MP4",
      resolution: "HD",
      width,
      height,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={24} className="text-primary" />
            Export Video
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 space-y-4 border border-border">
          {/* Summary of what will be exported */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Output Settings (From Canvas)
            </label>
            <div className="flex items-center gap-3">
              <div className="bg-background rounded p-2 border border-border">
                <div className="text-lg font-bold font-mono">
                  {width} x {height}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                MP4 Video <br />
                30 FPS
              </div>
            </div>
          </div>

          {/* Simple Resolution Toggle */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Quality
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={resolutionScale === 1 ? "default" : "outline"}
                onClick={() => setResolutionScale(1)}
              >
                Original (100%)
              </Button>
              <Button
                size="sm"
                variant={resolutionScale === 0.5 ? "default" : "outline"}
                onClick={() => setResolutionScale(0.5)}
              >
                Draft (50%)
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Video akan dirender sesuai tampilan canvas editing Anda.
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleExport} isLoading={isExporting}>
            {!isExporting && <Download size={18} />}
            Start Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
