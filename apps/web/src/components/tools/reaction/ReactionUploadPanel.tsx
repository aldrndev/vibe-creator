import { useRef } from "react";
import { Button, Card, CardBody } from "@heroui/react";
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
  resultUrl?: string; // from hook results[layoutMode]
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

      <Card className="flex-1 bg-black/5 border-divider overflow-hidden min-h-[350px] md:min-h-[500px] flex flex-col">
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
                              ? "border-success/50 bg-success/10"
                              : "border-zinc-700 hover:border-primary hover:bg-zinc-800/50"
                          }`}
              >
                {mainVideoUrl ? (
                  <>
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-success/20 flex items-center justify-center mb-3 md:mb-4">
                      <Check size={24} className="text-success md:w-8 md:h-8" />
                    </div>
                    <p className="font-semibold text-success text-sm md:text-base">
                      Main Video Loaded
                    </p>
                    <Button
                      size="sm"
                      variant="flat"
                      className="mt-2"
                      onPress={() => mainInputRef.current?.click()}
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
                  <p className="text-xs text-danger mt-2 text-center">
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
                              ? "border-success/50 bg-success/10"
                              : "border-zinc-700 hover:border-secondary hover:bg-zinc-800/50"
                          }`}
              >
                {reactionVideoUrl ? (
                  <>
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-success/20 flex items-center justify-center mb-3 md:mb-4">
                      <Check size={24} className="text-success md:w-8 md:h-8" />
                    </div>
                    <p className="font-semibold text-success text-sm md:text-base">
                      Reaction Loaded
                    </p>
                    <Button
                      size="sm"
                      variant="flat"
                      className="mt-2"
                      onPress={() => reactionInputRef.current?.click()}
                    >
                      Ganti
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-secondary/20 transition-colors">
                      <Smartphone
                        size={32}
                        className="text-zinc-400 group-hover:text-secondary md:w-10 md:h-10"
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
                  <p className="text-xs text-danger mt-2 text-center">
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
          <div className="bg-content1 p-4 flex flex-col sm:flex-row justify-between items-center border-t border-divider gap-4">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant="flat"
                fullWidth
                className="sm:w-auto"
                startContent={<Monitor size={14} />}
                onPress={() => mainInputRef.current?.click()}
              >
                Ganti Main
              </Button>
              <Button
                size="sm"
                variant="flat"
                fullWidth
                className="sm:w-auto"
                startContent={<Smartphone size={14} />}
                onPress={() => reactionInputRef.current?.click()}
              >
                Ganti React
              </Button>
            </div>
            <div className="text-xs text-foreground/50 text-center sm:text-right w-full sm:w-auto">
              {customPosition
                ? `Posisi: ${customPosition.x}px, ${customPosition.y}px`
                : "Drag preview untuk mengatur posisi"}
            </div>
          </div>
        )}
      </Card>

      {/* Result Area (Moved below Preview) */}
      {resultUrl && (
        <Card className="border-2 border-success/30 bg-success/5 animate-in fade-in slide-in-from-bottom-4">
          <CardBody className="space-y-4">
            <div className="flex flex-row items-center gap-4">
              <div className="bg-success/20 p-3 rounded-full">
                <Check className="text-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-success-700">Video Selesai!</h3>
                <p className="text-xs text-success-600/80">Siap didownload.</p>
              </div>
              <Button
                as="a"
                href={resultUrl}
                download
                color="success"
                startContent={<Download size={16} />}
              >
                Download Video
              </Button>
            </div>

            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
              <AlertTriangle
                className="text-warning shrink-0 mt-0.5"
                size={18}
              />
              <div>
                <h3 className="text-sm font-semibold text-warning-700 dark:text-warning-500">
                  Video Tidak Disimpan Permanen
                </h3>
                <p className="text-xs text-muted-foreground mt-1 text-warning-800/80 dark:text-warning-300/80">
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
