import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Progress,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Slider,
} from "@/components/ui";
import { Download, Settings2 } from "lucide-react";
import { LoopMode } from "@/hooks/useLoopCreator";
import { loopModes } from "./constants";
import { cn } from "@/lib/utils";

interface LoopSettingsPanelProps {
  loopMode: LoopMode;
  setLoopMode: (mode: LoopMode) => void;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  startMs: number;
  setStartMs: (ms: number) => void;
  endMs: number;
  setEndMs: (ms: number) => void;
  maxDuration: number;
  loopCount: number;
  setLoopCount: (count: number) => void;
  useDurationMode: boolean;
  setUseDurationMode: (use: boolean) => void;
  targetMinutes: number;
  setTargetMinutes: (min: number) => void;
  isProcessing: boolean;
  processingStatus: string;
  onProcess: () => void;
  resultUrl?: string;
  hasVideo: boolean;
}

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

export function LoopSettingsPanel({
  loopMode,
  setLoopMode,
  aspectRatio,
  setAspectRatio,
  startMs,
  setStartMs,
  endMs,
  setEndMs,
  maxDuration,
  loopCount,
  setLoopCount,
  useDurationMode,
  setUseDurationMode,
  targetMinutes,
  setTargetMinutes,
  isProcessing,
  processingStatus,
  onProcess,
  resultUrl,
  hasVideo,
}: LoopSettingsPanelProps) {
  const currentModeConfig = loopModes.find((m) => m.id === loopMode)!;

  return (
    <Card className="bg-card/70 backdrop-blur-xl border-border/50 h-full">
      <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 pb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <Settings2 size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight">Konfigurasi</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Sesuaikan Hasil
          </p>
        </div>
      </CardHeader>
      <CardBody className="p-6 space-y-8">
        {/* Loop Mode Selection */}
        <div className="space-y-4">
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
            Pilih Mode
          </label>
          <div className="grid grid-cols-3 gap-3">
            {loopModes.map((mode) => {
              const isActive = loopMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setLoopMode(mode.id)}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 group relative overflow-hidden",
                    isActive
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/10 border-border/50 hover:border-primary/30 hover:bg-muted/20"
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                      isActive
                        ? "bg-primary text-white scale-110"
                        : "bg-muted text-muted-foreground group-hover:scale-110"
                    )}
                  >
                    <mode.icon size={22} />
                  </div>
                  <div className="text-center">
                    <p
                      className={cn(
                        "text-xs font-black tracking-tight",
                        isActive ? "text-primary" : "text-foreground"
                      )}
                    >
                      {mode.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Divider className="opacity-40" />

        {/* Format & Trim Section */}
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
              Rasio Video
            </label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/50">
                <SelectValue placeholder="Original" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">Original (Asli)</SelectItem>
                <SelectItem value="16:9">16:9 Landscape</SelectItem>
                <SelectItem value="9:16">
                  9:16 Portrait (TikTok/Reels)
                </SelectItem>
                <SelectItem value="1:1">1:1 Square</SelectItem>
                <SelectItem value="4:5">4:5 Portrait</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-5">
            <div className="flex justify-between items-end px-1">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Rentang Waktu
              </label>
              <div className="text-[10px] font-black tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                {((endMs - startMs) / 1000).toFixed(1)} DETIK
              </div>
            </div>

            <div className="space-y-6 bg-muted/10 p-5 rounded-3xl border border-border/40">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Start: {(startMs / 1000).toFixed(1)}s</span>
                </div>
                <Slider
                  min={0}
                  max={endMs - 500}
                  step={100}
                  value={[startMs]}
                  onValueChange={(v: number[]) => setStartMs(v[0] ?? 0)}
                  className="py-2"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>End: {(endMs / 1000).toFixed(1)}s</span>
                </div>
                <Slider
                  min={startMs + 500}
                  max={maxDuration}
                  step={100}
                  value={[endMs]}
                  onValueChange={(v: number[]) => setEndMs(v[0] ?? 5000)}
                  className="py-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Loop Controls Section */}
        {(loopMode === "loop" || loopMode === "boomerang") && (
          <div className="space-y-8 bg-muted/5 p-6 rounded-3xl border border-border/40">
            {/* Mode Selection like Orientation in photo */}
            {loopMode === "loop" && (
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Mode Pengulangan
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setUseDurationMode(false)}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group",
                      !useDurationMode
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/10 border-border/50 hover:bg-muted/20"
                    )}
                  >
                    <p
                      className={cn(
                        "text-[10px] font-black uppercase tracking-tight",
                        !useDurationMode ? "text-primary" : "text-foreground"
                      )}
                    >
                      Jumlah Putaran
                    </p>
                  </button>
                  <button
                    onClick={() => setUseDurationMode(true)}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group",
                      useDurationMode
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/10 border-border/50 hover:bg-muted/20"
                    )}
                  >
                    <p
                      className={cn(
                        "text-[10px] font-black uppercase tracking-tight",
                        useDurationMode ? "text-primary" : "text-foreground"
                      )}
                    >
                      Target Durasi
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Value & Slider Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {useDurationMode ? "Durasi Menit" : "Set Putaran"}
                </label>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-black tracking-widest bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
                    {useDurationMode
                      ? `${targetMinutes} MENIT`
                      : `${loopCount}X PUTAR`}
                  </div>
                  <div className="text-[10px] font-black tracking-widest bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-full border border-orange-500/20">
                    EST:{" "}
                    {formatDuration(
                      ((loopMode === "loop"
                        ? endMs -
                          startMs -
                          Math.min(2000, (endMs - startMs) * 0.3)
                        : (endMs - startMs) * 2) *
                        loopCount) /
                        1000
                    )}
                  </div>
                </div>
              </div>

              {useDurationMode ? (
                <div className="px-1">
                  <Input
                    type="number"
                    placeholder="Contoh: 10"
                    value={targetMinutes.toString()}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTargetMinutes(Number(v));
                      const unitMs =
                        endMs -
                        startMs -
                        Math.min(2000, (endMs - startMs) * 0.3);
                      const targetMs = Number(v) * 60 * 1000;
                      setLoopCount(Math.ceil(targetMs / unitMs));
                    }}
                    className="h-12 rounded-xl bg-muted/20 border-border/50 font-bold"
                  />
                </div>
              ) : (
                <Slider
                  min={1}
                  max={
                    loopMode === "boomerang"
                      ? Math.max(1, Math.floor(60000 / ((endMs - startMs) * 2)))
                      : 100
                  }
                  step={1}
                  value={[loopCount]}
                  onValueChange={(v: number[]) => setLoopCount(v[0] ?? 1)}
                  className="py-2"
                />
              )}
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="space-y-3 p-5 rounded-3xl bg-secondary/10 border border-secondary/20">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest mb-1">
              <span className="text-primary animate-pulse">
                Memproses Video...
              </span>
              <span>75%</span>
            </div>
            <Progress value={75} className="h-2 bg-muted transition-all" />
            <p className="text-[10px] text-muted-foreground text-center font-medium uppercase tracking-wider">
              {processingStatus}
            </p>
          </div>
        )}

        {/* Final Action Button */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            size="lg"
            className="w-full flex-1 h-14 md:h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all active:scale-[0.98]"
            disabled={!hasVideo || isProcessing}
            isLoading={isProcessing}
            onClick={onProcess}
          >
            {!isProcessing && (
              <currentModeConfig.icon size={18} className="mr-2" />
            )}
            {loopMode === "gif" ? "Render GIF" : "Proses Video Loop"}
          </Button>

          {resultUrl && (
            <Button
              asChild
              variant="secondary"
              className="h-14 md:h-12 rounded-2xl px-8 font-black uppercase tracking-[0.2em] text-sm border-border/40 hover:bg-muted"
            >
              <a href={resultUrl} download>
                <Download size={18} className="mr-2" />
                Simpan
              </a>
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
