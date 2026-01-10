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
  Switch,
} from "@/components/ui";
import { AlertCircle, Download, Sparkles } from "lucide-react";
import { HoverCard } from "@/components/ui/PageTransition";
import { LoopMode } from "@/hooks/useLoopCreator";
import { loopModes } from "./constants";

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
    <Card>
      <CardHeader className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
          <Sparkles size={16} className="text-secondary-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Pengaturan</h2>
      </CardHeader>
      <CardBody className="space-y-6">
        {/* Loop Mode Cards */}
        <div>
          <label className="text-sm font-medium mb-3 block">Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {loopModes.map((mode) => (
              <HoverCard key={mode.id}>
                <Card
                  className={`cursor-pointer border-2 transition-colors ${
                    loopMode === mode.id
                      ? `border-primary bg-primary/10`
                      : "border-transparent hover:border-border"
                  }`}
                  onClick={() => setLoopMode(mode.id)}
                >
                  <CardBody className="p-3 text-center">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-2">
                      <mode.icon size={20} className="text-primary" />
                    </div>
                    <p className="font-medium text-sm">{mode.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {mode.description}
                    </p>
                  </CardBody>
                </Card>
              </HoverCard>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="transition-all space-y-6">
            <Divider />

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">
                Format Output (Canvas)
              </label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Rasio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Original (Tanpa Crop)</SelectItem>
                  <SelectItem value="16:9">16:9 (YouTube, FB Video)</SelectItem>
                  <SelectItem value="9:16">
                    9:16 (TikTok/Reels/Shorts)
                  </SelectItem>
                  <SelectItem value="1:1">1:1 (IG/FB Feed)</SelectItem>
                  <SelectItem value="4:5">4:5 (IG/FB Portrait)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                *Otomatis menambahkan background blur jika rasio tidak sesuai
              </p>
            </div>

            <Divider className="my-4" />

            {/* Trim Controls */}
            <div className="space-y-4">
              <label className="text-sm font-medium block">
                Rentang: {(startMs / 1000).toFixed(1)}s -{" "}
                {(endMs / 1000).toFixed(1)}s
              </label>
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-xs text-muted-foreground">Mulai</label>
                  <Slider
                    min={0}
                    max={endMs - 500}
                    step={100}
                    value={[startMs]}
                    onValueChange={(v: number[]) => setStartMs(v[0] ?? 0)}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-xs text-muted-foreground">Akhir</label>
                  <Slider
                    min={startMs + 500}
                    max={maxDuration}
                    step={100}
                    value={[endMs]}
                    onValueChange={(v: number[]) => setEndMs(v[0] ?? 5000)}
                  />
                </div>
              </div>
            </div>

            {/* GIF Duration Warning */}
            {loopMode === "gif" && endMs - startMs > 10000 && (
              <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-center gap-2">
                <AlertCircle size={14} className="text-yellow-500" />
                <p className="text-xs text-yellow-600">
                  Durasi GIF {((endMs - startMs) / 1000).toFixed(1)}s cukup
                  panjang. Ukuran file mungkin sangat besar.
                </p>
              </div>
            )}

            {/* Loop Count / Duration Control */}
            {(loopMode === "loop" || loopMode === "boomerang") && (
              <>
                <Divider />
                <div className="space-y-4">
                  {loopMode === "loop" && (
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">
                        Target Output
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">
                          {useDurationMode ? "Durasi" : "Jumlah Putar"}
                        </span>
                        <Switch
                          checked={useDurationMode}
                          onCheckedChange={setUseDurationMode}
                        />
                      </div>
                    </div>
                  )}

                  {loopMode === "loop" && useDurationMode ? (
                    (() => {
                      const durationMs = endMs - startMs;
                      let unitMs = durationMs;
                      const overlap = Math.min(2000, durationMs * 0.3);
                      unitMs = durationMs - overlap;

                      const maxPossibleMinutes = Math.floor(
                        (5000 * unitMs) / 60000
                      );
                      const uiMaxMinutes = Math.min(500, maxPossibleMinutes);

                      return (
                        <div className="space-y-2">
                          <Input
                            type="number"
                            label="Durasi Target (Menit)"
                            placeholder={`Maks: ${uiMaxMinutes} menit`}
                            value={targetMinutes.toString()}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) => {
                              const v = e.target.value;
                              setTargetMinutes(Number(v));
                              const targetMs = Number(v) * 60 * 1000;
                              const calcLoops = Math.ceil(targetMs / unitMs);
                              setLoopCount(calcLoops);
                            }}
                            min={1}
                            max={uiMaxMinutes}
                          />
                          <p
                            className={`text-xs ${
                              loopCount > 5000
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            Sistem akan mengulang sebanyak <b>{loopCount}x</b>{" "}
                            {loopCount > 5000 && "(Terlalu Banyak!)"} untuk
                            mencapai durasi ini.
                          </p>
                        </div>
                      );
                    })()
                  ) : (
                    <div>
                      {loopMode === "boomerang" && (
                        <div className="mb-2 p-2 bg-primary/10 rounded-md text-xs text-primary">
                          <b>Mode Boomerang:</b> Total Putar disesuaikan agar
                          durasi maksimal 1 Menit.
                        </div>
                      )}
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium">
                          Total Putar: {loopCount}x
                        </label>
                        <span className="text-xs text-muted-foreground">
                          Estimasi:{" "}
                          {formatDuration(
                            (loopMode === "loop"
                              ? (endMs -
                                  startMs -
                                  Math.min(2000, (endMs - startMs) * 0.3)) *
                                loopCount
                              : (endMs - startMs) * 2 * loopCount) / 1000
                          )}
                        </span>
                      </div>
                      <Slider
                        min={1}
                        max={(() => {
                          if (loopMode === "boomerang") {
                            const unitMs = (endMs - startMs) * 2;
                            return Math.max(1, Math.floor(60000 / unitMs));
                          }
                          return 50;
                        })()}
                        step={1}
                        value={[loopCount]}
                        onValueChange={(v: number[]) => setLoopCount(v[0] ?? 1)}
                      />
                      {loopMode === "boomerang" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Max{" "}
                          {Math.max(
                            1,
                            Math.floor(60000 / ((endMs - startMs) * 2))
                          )}
                          x putaran (karena batas durasi 1 menit).
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <Divider />

        {/* Processing Status */}
        {isProcessing && (
          <div className="space-y-2 p-3 rounded-lg bg-primary/5">
            <Progress value={undefined} className="animate-pulse" />
            <p className="text-sm text-center text-muted-foreground">
              {processingStatus}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            className="flex-1"
            disabled={
              !hasVideo || isProcessing || (loopCount > 5000 && useDurationMode)
            }
            isLoading={isProcessing}
            onClick={onProcess}
            size="lg"
          >
            {!isProcessing && <currentModeConfig.icon size={18} />}
            {loopMode === "gif"
              ? "Buat GIF"
              : loopMode === "boomerang"
              ? "Buat Boomerang"
              : "Buat Loop"}
          </Button>

          {resultUrl && (
            <Button asChild variant="secondary" size="lg">
              <a href={resultUrl} download>
                <Download size={18} />
                Download
              </a>
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
