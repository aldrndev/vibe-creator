import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Progress,
  Select,
  SelectItem,
  Slider,
  Switch,
} from "@heroui/react";
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
          <Sparkles size={16} className="text-secondary" />
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
                  isPressable
                  onPress={() => setLoopMode(mode.id)}
                  className={`border-2 transition-colors ${
                    loopMode === mode.id
                      ? `border-${mode.color} bg-${mode.color}/10`
                      : "border-transparent hover:border-divider"
                  }`}
                >
                  <CardBody className="p-3 text-center">
                    <div
                      className={`w-10 h-10 rounded-lg bg-${mode.color}/20 flex items-center justify-center mx-auto mb-2`}
                    >
                      <mode.icon size={20} className={`text-${mode.color}`} />
                    </div>
                    <p className="font-medium text-sm">{mode.name}</p>
                    <p className="text-xs text-foreground/50 mt-0.5">
                      {mode.description}
                    </p>
                  </CardBody>
                </Card>
              </HoverCard>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className={"transition-all space-y-6"}>
            <Divider />

            <div className="mt-4">
              <Select
                label="Format Output (Canvas)"
                placeholder="Pilih Rasio"
                selectedKeys={aspectRatio ? [aspectRatio] : []}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="max-w-full"
                size="sm"
              >
                <SelectItem key="">Original (Tanpa Crop)</SelectItem>
                <SelectItem key="16:9">16:9 (YouTube, FB Video)</SelectItem>
                <SelectItem key="9:16">9:16 (TikTok/Reels/Shorts)</SelectItem>
                <SelectItem key="1:1">1:1 (IG/FB Feed)</SelectItem>
                <SelectItem key="4:5">4:5 (IG/FB Portrait)</SelectItem>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                *Otomatis menambahkan background blur jika rasio tidak sesuai
              </p>
            </div>

            <Divider className="my-4" />

            {/* Trim Controls */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Rentang: {(startMs / 1000).toFixed(1)}s -{" "}
                {(endMs / 1000).toFixed(1)}s
              </label>
              <div className="flex gap-4">
                <Slider
                  label="Mulai"
                  step={100}
                  minValue={0}
                  maxValue={endMs - 500}
                  value={startMs}
                  onChange={(v) => setStartMs(v as number)}
                  getValue={(v) => `${((v as number) / 1000).toFixed(1)}s`}
                  className="flex-1"
                  color="primary"
                />
                <Slider
                  label="Akhir"
                  step={100}
                  minValue={startMs + 500}
                  maxValue={maxDuration}
                  value={endMs}
                  onChange={(v) => setEndMs(v as number)}
                  getValue={(v) => `${((v as number) / 1000).toFixed(1)}s`}
                  className="flex-1"
                  color="primary"
                />
              </div>
            </div>

            {/* GIF Duration Warning */}
            {loopMode === "gif" && endMs - startMs > 10000 && (
              <div className="mt-3 p-2 bg-warning/10 border border-warning/20 rounded-md flex items-center gap-2">
                <AlertCircle size={14} className="text-warning" />
                <p className="text-xs text-warning-700">
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
                      <Switch
                        size="sm"
                        isSelected={useDurationMode}
                        onValueChange={setUseDurationMode}
                      >
                        <span className="text-xs">
                          {useDurationMode ? "Durasi" : "Jumlah Putar"}
                        </span>
                      </Switch>
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
                            onValueChange={(v) => {
                              setTargetMinutes(Number(v));
                              const targetMs = Number(v) * 60 * 1000;
                              const calcLoops = Math.ceil(targetMs / unitMs);
                              setLoopCount(calcLoops);
                            }}
                            min={1}
                            max={uiMaxMinutes}
                            classNames={{
                              input:
                                "[&::-webkit-inner-spin-button]:appearance-none",
                            }}
                            description={`Maksimal input: ${uiMaxMinutes} menit (berdasarkan batas 5000x putaran).`}
                            isInvalid={loopCount > 5000}
                            errorMessage={
                              loopCount > 5000
                                ? `Durasi ini membutuhkan ${loopCount}x putaran (Melebihi batas 5000x). Harap kurangi durasi.`
                                : ""
                            }
                          />
                          <p
                            className={`text-xs ${
                              loopCount > 5000
                                ? "text-danger"
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
                        aria-label="Loop Count"
                        step={1}
                        minValue={1}
                        maxValue={(() => {
                          if (loopMode === "boomerang") {
                            const unitMs = (endMs - startMs) * 2;
                            return Math.max(1, Math.floor(60000 / unitMs));
                          }
                          return 50;
                        })()}
                        value={loopCount}
                        onChange={(v) => setLoopCount(v as number)}
                        className="flex-1"
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
            <Progress
              isIndeterminate
              size="sm"
              color="primary"
              aria-label="Sedang memproses"
            />
            <p className="text-sm text-center text-foreground/60">
              {processingStatus}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            color={
              currentModeConfig.color as
                | "primary"
                | "secondary"
                | "warning"
                | "default"
            }
            className="flex-1"
            isDisabled={
              !hasVideo || isProcessing || (loopCount > 5000 && useDurationMode)
            }
            isLoading={isProcessing}
            onPress={onProcess}
            startContent={!isProcessing && <currentModeConfig.icon size={18} />}
            size="lg"
          >
            {loopMode === "gif"
              ? "Buat GIF"
              : loopMode === "boomerang"
              ? "Buat Boomerang"
              : "Buat Loop"}
          </Button>

          {resultUrl && (
            <Button
              as="a"
              href={resultUrl}
              download
              color="success"
              size="lg"
              startContent={<Download size={18} />}
            >
              Download
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
