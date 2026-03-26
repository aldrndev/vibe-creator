import { Download, Film, ShieldCheck, Zap } from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { cn } from '@/lib/utils';

interface ExportModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onExport: (options: {
    format: 'MP4' | 'WEBM' | 'MOV';
    resolution: 'SD' | 'HD' | 'UHD';
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
      format: 'MP4',
      resolution: 'HD',
      width,
      height,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background/60 backdrop-blur-3xl border-white/10 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                <Download size={24} />
              </div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">
                Export Engine
              </DialogTitle>
            </div>
            <Badge
              variant="outline"
              className="h-6 font-black border-primary/20 bg-primary/5 text-primary"
            >
              v1.0.4-PRO
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8">
          {/* Summary Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-purple-500/30 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-card/40 border border-border/40 rounded-2xl p-6 space-y-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3 block">
                  Final Output Specifications
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-background/40 rounded-xl p-4 border border-border/20">
                    <div className="text-2xl font-black font-mono tracking-tighter text-foreground">
                      {width} <span className="text-primary/40">×</span> {height}
                    </div>
                    <div className="text-[10px] font-black text-muted-foreground/60 uppercase mt-1">
                      Resolution (px)
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-amber-400" />
                      <span className="text-xs font-bold">MP4 / H.264</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground/60">
                      <Film size={14} />
                      <span className="text-xs font-bold">30 FPS Stable</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resolution Config */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                  Quality Preset
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    size="lg"
                    variant={resolutionScale === 1 ? 'default' : 'outline'}
                    className={cn(
                      'h-14 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all',
                      resolutionScale === 1
                        ? 'shadow-lg shadow-primary/20 scale-[1.02]'
                        : 'border-border/40 opacity-60 hover:opacity-100',
                    )}
                    onClick={() => setResolutionScale(1)}
                  >
                    High Fidelity (100%)
                  </Button>
                  <Button
                    size="lg"
                    variant={resolutionScale === 0.5 ? 'default' : 'outline'}
                    className={cn(
                      'h-14 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all',
                      resolutionScale === 0.5
                        ? 'shadow-lg shadow-primary/20 scale-[1.02]'
                        : 'border-border/40 opacity-60 hover:opacity-100',
                    )}
                    onClick={() => setResolutionScale(0.5)}
                  >
                    Optimized (50%)
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 py-4 bg-primary/5 rounded-xl border border-primary/10">
            <ShieldCheck size={16} className="text-primary" />
            <p className="text-[10px] font-bold text-primary/80 leading-relaxed">
              Your project will be rendered locally using high-performance hardware acceleration.
            </p>
          </div>
        </div>

        <DialogFooter className="p-8 pt-4 bg-white/5 border-t border-white/5 flex gap-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px]"
          >
            Abort
          </Button>
          <Button
            onClick={handleExport}
            isLoading={isExporting}
            className="h-12 flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            {!isExporting && <Download size={14} className="mr-2" />}
            Initialize Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
