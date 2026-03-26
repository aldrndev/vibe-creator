import { Check, Layers, Monitor, Smartphone } from 'lucide-react';
import { useRef } from 'react';
import { ReactionPreview } from '@/components/tools/ReactionPreview';
import { Badge, Button, Card, CardBody, CardHeader } from '@/components/ui';
import type { LayoutMode, SideBySideLayout } from '@/hooks/useReactionCreator';
import { cn } from '@/lib/utils';

const RESOLUTIONS: Record<string, { w: number; h: number }> = {
  '16:9': { w: 1920, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
  '1:1': { w: 1080, h: 1080 },
  '4:5': { w: 1080, h: 1350 },
};

interface ReactionUploadPanelProps {
  mainVideoUrl: string;
  reactionVideoUrl: string;
  layoutMode: LayoutMode;
  aspectRatio: string;
  pipScale: number;
  circular: boolean;
  sideBySideLayout: SideBySideLayout;
  splitRatio: number;
  smoothBorder: boolean;
  overlayMode: boolean;
  setCustomPosition: (pos: { x: number; y: number } | null) => void;
  onMainVideoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReactionVideoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ReactionUploadPanel({
  mainVideoUrl,
  reactionVideoUrl,
  layoutMode,
  aspectRatio,
  pipScale,
  circular,
  sideBySideLayout,
  splitRatio,
  smoothBorder,
  overlayMode,
  setCustomPosition,
  onMainVideoSelect,
  onReactionVideoSelect,
}: ReactionUploadPanelProps) {
  const mainInputRef = useRef<HTMLInputElement>(null);
  const reactionInputRef = useRef<HTMLInputElement>(null);

  const hasBothVideos = mainVideoUrl && reactionVideoUrl;

  return (
    <div className="flex flex-col gap-8">
      {/* Hidden Inputs */}
      <input
        type="file"
        accept="video/*"
        ref={mainInputRef}
        onChange={onMainVideoSelect}
        className="hidden"
      />
      <input
        type="file"
        accept="video/*"
        ref={reactionInputRef}
        onChange={onReactionVideoSelect}
        className="hidden"
      />

      <Card className="bg-card/70 backdrop-blur-xl border-border/50 h-full">
        <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 pb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Layers size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Stage Editor</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Preview & Atur Posisi
            </p>
          </div>
        </CardHeader>

        <CardBody className="p-6">
          <div className="relative min-h-[350px] md:min-h-[500px] bg-muted/20 flex items-center justify-center p-4 md:p-8 overflow-hidden rounded-[2rem] border border-border/50 shadow-inner group">
            {!hasBothVideos ? (
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
                {/* Main Upload Zone */}
                <button
                  type="button"
                  aria-label="Upload main video"
                  onClick={() => mainInputRef.current?.click()}
                  className={cn(
                    'relative aspect-video flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all duration-500 cursor-pointer group/card overflow-hidden active:scale-95',
                    mainVideoUrl
                      ? 'border-primary/40 bg-primary/5'
                      : 'bg-muted/10 border-border/50 hover:border-primary/40 hover:bg-muted/20',
                  )}
                >
                  {mainVideoUrl ? (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Check className="text-primary" size={24} />
                      </div>
                      <p className="font-bold text-xs uppercase tracking-tight">Main Video</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-full h-7 px-3 text-[10px] font-bold uppercase tracking-widest"
                      >
                        Ganti
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-4 group-hover/card:scale-110 transition-transform duration-500 group-hover/card:bg-primary/10">
                        <Monitor
                          className="text-muted-foreground group-hover/card:text-primary transition-colors"
                          size={28}
                        />
                      </div>
                      <p className="font-black text-xs uppercase tracking-widest text-foreground">
                        Main Video
                      </p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                        Video Utama
                      </p>
                    </>
                  )}
                </button>

                {/* Reaction Upload Zone */}
                <button
                  type="button"
                  aria-label="Upload reaction video"
                  onClick={() => reactionInputRef.current?.click()}
                  className={cn(
                    'relative aspect-video flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all duration-500 cursor-pointer group/card overflow-hidden active:scale-95',
                    reactionVideoUrl
                      ? 'border-secondary/40 bg-secondary/5'
                      : 'bg-muted/10 border-border/50 hover:border-secondary/40 hover:bg-muted/20',
                  )}
                >
                  {reactionVideoUrl ? (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Check className="text-orange-500" size={24} />
                      </div>
                      <p className="font-bold text-xs uppercase tracking-tight">Reaction</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-full h-7 px-3 text-[10px] font-bold uppercase tracking-widest"
                      >
                        Ganti
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-4 group-hover/card:scale-110 transition-transform duration-500 group-hover/card:bg-orange-500/10">
                        <Smartphone
                          className="text-muted-foreground group-hover/card:text-orange-500 transition-colors"
                          size={28}
                        />
                      </div>
                      <p className="font-black text-xs uppercase tracking-widest text-foreground">
                        Reaction
                      </p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                        Video Reaksi
                      </p>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* PREVIEW MODE */
              <div className="w-full h-full flex items-center justify-center">
                <ReactionPreview
                  mainVideoUrl={mainVideoUrl}
                  reactionVideoUrl={reactionVideoUrl}
                  aspectRatio={aspectRatio}
                  pipScale={pipScale}
                  circular={circular}
                  onPositionChange={(x, y) => {
                    const res = RESOLUTIONS[aspectRatio];
                    if (res) {
                      setCustomPosition({
                        x: Math.round(x * res.w),
                        y: Math.round(y * res.h),
                      });
                    }
                  }}
                  layoutMode={layoutMode}
                  sideBySideLayout={sideBySideLayout}
                  splitRatio={splitRatio}
                  smoothBorder={smoothBorder}
                  overlayMode={overlayMode}
                />
              </div>
            )}

            {/* Floating Controls Overlay */}
            {hasBothVideos && (
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-white/90 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full pointer-events-auto">
                  Preview
                </Badge>
                <div className="flex gap-2 pointer-events-auto">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full bg-black/60 backdrop-blur-md border-white/20 text-white hover:bg-black/80 font-black text-[9px] uppercase tracking-widest h-8"
                    onClick={() => mainInputRef.current?.click()}
                  >
                    Main
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full bg-black/60 backdrop-blur-md border-white/20 text-white hover:bg-black/80 font-black text-[9px] uppercase tracking-widest h-8"
                    onClick={() => reactionInputRef.current?.click()}
                  >
                    React
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
