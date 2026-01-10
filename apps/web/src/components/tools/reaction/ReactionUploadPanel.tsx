import { useRef } from "react";
import { Button, Card, CardBody } from "@/components/ui";
import {
  Download,
  Monitor,
  Smartphone,
  Check,
  AlertTriangle,
} from "lucide-react";
import { ReactionPreview } from "@/components/tools/ReactionPreview";
import { LayoutMode, SideBySideLayout } from "@/hooks/useReactionCreator";

const RESOLUTIONS: Record<string, { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
};

interface ReactionUploadPanelProps {
  mainVideoUrl: string;
  reactionVideoUrl: string;
  mainVideoError: string | null;
  reactionVideoError: string | null;
  resultUrl?: string;
  layoutMode: LayoutMode;
  aspectRatio: string;
  pipScale: number;
  circular: boolean;
  sideBySideLayout: SideBySideLayout;
  splitRatio: number;
  smoothBorder: boolean;
  overlayMode: boolean;
  customPosition: { x: number; y: number } | null;
  setCustomPosition: (pos: { x: number; y: number } | null) => void;
  onMainVideoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReactionVideoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ReactionUploadPanel({
  mainVideoUrl,
  reactionVideoUrl,
  mainVideoError,
  reactionVideoError,
  resultUrl,
  layoutMode,
  aspectRatio,
  pipScale,
  circular,
  sideBySideLayout,
  splitRatio,
  smoothBorder,
  overlayMode,
  customPosition,
  setCustomPosition,
  onMainVideoSelect,
  onReactionVideoSelect,
}: ReactionUploadPanelProps) {
  const mainInputRef = useRef<HTMLInputElement>(null);
  const reactionInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="lg:col-span-8 flex flex-col gap-4">
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

      <Card className="flex-1 bg-black/5 border-border overflow-hidden min-h-[350px] md:min-h-[500px] flex flex-col">
        <div className="relative flex-1 flex items-center justify-center md:items-start md:justify-start bg-zinc-900/50 p-4 md:p-8">
          {/* Empty State / Upload Zone if videos missing */}
          {!mainVideoUrl || !reactionVideoUrl ? (
            <div className="flex flex-col md:flex-row gap-4 w-full max-w-3xl items-stretch justify-center h-full md:h-1/2">
              {/* Main Upload */}
              <div
                onClick={() => mainInputRef.current?.click()}
                className={`flex-1 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 cursor-pointer transition-all hover:scale-[1.02] group active:scale-95
                          ${
                            mainVideoUrl
                              ? "border-green-500/50 bg-green-500/10"
                              : "border-zinc-700 hover:border-primary hover:bg-zinc-800/50"
                          }`}
              >
                {mainVideoUrl ? (
                  <>
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-3 md:mb-4">
                      <Check
                        size={24}
                        className="text-green-500 md:w-8 md:h-8"
                      />
                    </div>
                    <p className="font-semibold text-green-500 text-sm md:text-base">
                      Main Video Loaded
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={() => mainInputRef.current?.click()}
                    >
                      Ganti
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-primary/20 transition-colors">
                      <Monitor
                        size={32}
                        className="text-zinc-400 group-hover:text-primary md:w-10 md:h-10"
                      />
                    </div>
                    <p className="text-base md:text-lg font-bold text-zinc-300">
                      Upload Main
                    </p>
                    <p className="text-xs md:text-sm text-zinc-500 mt-1 text-center">
                      Video utama
                    </p>
                    <p className="text-xs text-zinc-600 mt-2">
                      Max: 200MB / 5 menit
                    </p>
                  </>
                )}
                {mainVideoError && (
                  <p className="text-xs text-destructive mt-2 text-center">
                    {mainVideoError}
                  </p>
                )}
              </div>

              {/* Reaction Upload */}
              <div
                onClick={() => reactionInputRef.current?.click()}
                className={`flex-1 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 cursor-pointer transition-all hover:scale-[1.02] group active:scale-95
                          ${
                            reactionVideoUrl
                              ? "border-green-500/50 bg-green-500/10"
                              : "border-zinc-700 hover:border-secondary hover:bg-zinc-800/50"
                          }`}
              >
                {reactionVideoUrl ? (
                  <>
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-3 md:mb-4">
                      <Check
                        size={24}
                        className="text-green-500 md:w-8 md:h-8"
                      />
                    </div>
                    <p className="font-semibold text-green-500 text-sm md:text-base">
                      Reaction Loaded
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={() => reactionInputRef.current?.click()}
                    >
                      Ganti
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-secondary/20 transition-colors">
                      <Smartphone
                        size={32}
                        className="text-zinc-400 group-hover:text-secondary-foreground md:w-10 md:h-10"
                      />
                    </div>
                    <p className="text-base md:text-lg font-bold text-zinc-300">
                      Upload Reaction
                    </p>
                    <p className="text-xs md:text-sm text-zinc-500 mt-1 text-center">
                      Video Reaction
                    </p>
                    <p className="text-xs text-zinc-600 mt-2">
                      Max: 200MB / 5 menit
                    </p>
                  </>
                )}
                {reactionVideoError && (
                  <p className="text-xs text-destructive mt-2 text-center">
                    {reactionVideoError}
                  </p>
                )}
              </div>
            </div>
          ) : (
            // PREVIEW MODE
            <div className="w-full h-full flex items-center justify-center">
              {/* Interactive Preview Component */}
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
        </div>

        {/* Bottom Bar: File Controls */}
        {(mainVideoUrl || reactionVideoUrl) && (
          <div className="bg-card p-4 flex flex-col sm:flex-row justify-between items-center border-t border-border gap-4">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 sm:flex-none"
                onClick={() => mainInputRef.current?.click()}
              >
                <Monitor size={14} />
                Ganti Main
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 sm:flex-none"
                onClick={() => reactionInputRef.current?.click()}
              >
                <Smartphone size={14} />
                Ganti React
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-center sm:text-right w-full sm:w-auto">
              {customPosition
                ? `Posisi: ${customPosition.x}px, ${customPosition.y}px`
                : "Drag preview untuk mengatur posisi"}
            </div>
          </div>
        )}
      </Card>

      {/* Result Area (Moved below Preview) */}
      {resultUrl && (
        <Card className="border-2 border-green-500/30 bg-green-500/5 animate-in fade-in slide-in-from-bottom-4">
          <CardBody className="space-y-4">
            <div className="flex flex-row items-center gap-4">
              <div className="bg-green-500/20 p-3 rounded-full">
                <Check className="text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-green-700">Video Selesai!</h3>
                <p className="text-xs text-green-600/80">Siap didownload.</p>
              </div>
              <Button asChild>
                <a href={resultUrl} download>
                  <Download size={16} />
                  Download Video
                </a>
              </Button>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
              <AlertTriangle
                className="text-yellow-500 shrink-0 mt-0.5"
                size={18}
              />
              <div>
                <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-500">
                  Video Tidak Disimpan Permanen
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Hasil video ini hanya tersimpan di server selama{" "}
                  <b>60 menit</b>. Harap segera unduh video Anda sebelum dihapus
                  otomatis oleh sistem.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
