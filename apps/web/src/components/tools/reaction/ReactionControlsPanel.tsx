import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Slider,
  Divider,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Progress,
} from "@/components/ui";
import {
  Grid,
  Layers,
  Settings2,
  Volume2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { LayoutMode, SideBySideLayout } from "@/hooks/useReactionCreator";
import { cn } from "@/lib/utils";

const layoutModes = [
  {
    id: "pip" as const,
    name: "Picture-in-Picture",
    description: "Overlay video reaksi",
    icon: Layers,
  },
  {
    id: "side-by-side" as const,
    name: "Side by Side",
    description: "Berdampingan",
    icon: Grid,
  },
];

interface ReactionControlsPanelProps {
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  circular: boolean;
  setCircular: (val: boolean) => void;
  pipScale: number;
  setPipScale: (val: number) => void;
  sideBySideLayout: SideBySideLayout;
  setSideBySideLayout: (layout: SideBySideLayout) => void;
  splitRatio: number;
  setSplitRatio: (val: number) => void;
  smoothBorder: boolean;
  setSmoothBorder: (val: boolean) => void;
  overlayMode: boolean;
  setOverlayMode: (val: boolean) => void;
  mainVolume: number;
  setMainVolume: (val: number) => void;
  reactionVolume: number;
  setReactionVolume: (val: number) => void;
  isProcessing: boolean;
  processingStatus: string;
  hasFiles: boolean;
  onProcess: () => void;
}

export function ReactionControlsPanel({
  layoutMode,
  setLayoutMode,
  aspectRatio,
  setAspectRatio,
  circular,
  setCircular,
  pipScale,
  setPipScale,
  sideBySideLayout,
  setSideBySideLayout,
  splitRatio,
  setSplitRatio,
  smoothBorder,
  setSmoothBorder,
  overlayMode,
  setOverlayMode,
  mainVolume,
  setMainVolume,
  reactionVolume,
  setReactionVolume,
  isProcessing,
  processingStatus,
  hasFiles,
  onProcess,
}: ReactionControlsPanelProps) {
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
        {/* Mode Selector */}
        <div className="space-y-4">
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
            Mode Layout
          </label>
          <div className="grid grid-cols-2 gap-3">
            {layoutModes.map((mode) => {
              const isActive = layoutMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setLayoutMode(mode.id)}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 relative group overflow-hidden",
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

        {/* Dynamic Settings */}
        <div className="space-y-6">
          {/* Visual Settings Section */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
              Format Output
            </label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/50 font-bold px-4">
                <SelectValue placeholder="Pilih Rasio" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="16:9">16:9 Landscape</SelectItem>
                <SelectItem value="9:16">9:16 Portrait</SelectItem>
                <SelectItem value="1:1">1:1 Square</SelectItem>
                <SelectItem value="4:5">4:5 Portrait</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/5 p-5 rounded-3xl border border-border/40 space-y-8">
            <DynamicControls
              layoutMode={layoutMode}
              circular={circular}
              setCircular={setCircular}
              pipScale={pipScale}
              setPipScale={setPipScale}
              sideBySideLayout={sideBySideLayout}
              setSideBySideLayout={setSideBySideLayout}
              splitRatio={splitRatio}
              setSplitRatio={setSplitRatio}
              smoothBorder={smoothBorder}
              setSmoothBorder={setSmoothBorder}
              overlayMode={overlayMode}
              setOverlayMode={setOverlayMode}
            />
          </div>

          {/* Audio Settings */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
              <Volume2 size={14} className="text-primary" /> Audio Mixer
            </label>
            <div className="bg-muted/5 p-6 rounded-3xl border border-border/40 space-y-8">
              <AudioControls
                mainVolume={mainVolume}
                setMainVolume={setMainVolume}
                reactionVolume={reactionVolume}
                setReactionVolume={setReactionVolume}
              />
            </div>
          </div>

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

          {/* Core Action Button */}
          <div className="flex flex-col gap-3 pt-4">
            <Button
              size="lg"
              className="w-full h-14 md:h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all active:scale-[0.98]"
              isLoading={isProcessing}
              disabled={!hasFiles}
              onClick={onProcess}
            >
              {!isProcessing && <Sparkles size={18} className="mr-2" />}
              {isProcessing ? processingStatus : "Proses Video Reaction"}
            </Button>

            {!hasFiles && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <AlertCircle className="text-amber-500 shrink-0" size={14} />
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">
                  Upload kedua video untuk memulai
                </p>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function DynamicControls({
  layoutMode,
  circular,
  setCircular,
  pipScale,
  setPipScale,
  sideBySideLayout,
  setSideBySideLayout,
  splitRatio,
  setSplitRatio,
  smoothBorder,
  setSmoothBorder,
  overlayMode,
  setOverlayMode,
}: {
  layoutMode: string;
  circular: boolean;
  setCircular: (val: boolean) => void;
  pipScale: number;
  setPipScale: (val: number) => void;
  sideBySideLayout: SideBySideLayout;
  setSideBySideLayout: (val: SideBySideLayout) => void;
  splitRatio: number;
  setSplitRatio: (val: number) => void;
  smoothBorder: boolean;
  setSmoothBorder: (val: boolean) => void;
  overlayMode: boolean;
  setOverlayMode: (val: boolean) => void;
}) {
  if (layoutMode === "pip") {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center px-1">
          <div className="space-y-1">
            <label className="text-xs font-black tracking-tight uppercase text-foreground">
              Frame Lingkaran
            </label>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
              Ubah menjadi circle
            </p>
          </div>
          <Switch
            checked={circular}
            onCheckedChange={setCircular}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        <div className="space-y-5">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Ukuran (Scale)
            </label>
            <div className="text-[10px] font-black tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
              {Math.round(pipScale * 100)}%
            </div>
          </div>
          <Slider
            min={0.15}
            max={0.5}
            step={0.01}
            value={[pipScale]}
            onValueChange={(v: number[]) => setPipScale(v[0] ?? 0.3)}
            className="py-2"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          Orientasi
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSideBySideLayout("horizontal")}
            className={cn(
              "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group",
              sideBySideLayout === "horizontal"
                ? "bg-primary/10 border-primary"
                : "bg-muted/10 border-border/50 hover:bg-muted/20"
            )}
          >
            <p
              className={cn(
                "text-[10px] font-black uppercase tracking-tight",
                sideBySideLayout === "horizontal"
                  ? "text-primary"
                  : "text-foreground"
              )}
            >
              Horizontal
            </p>
          </button>
          <button
            onClick={() => setSideBySideLayout("vertical")}
            className={cn(
              "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group",
              sideBySideLayout === "vertical"
                ? "bg-primary/10 border-primary"
                : "bg-muted/10 border-border/50 hover:bg-muted/20"
            )}
          >
            <p
              className={cn(
                "text-[10px] font-black uppercase tracking-tight",
                sideBySideLayout === "vertical"
                  ? "text-primary"
                  : "text-foreground"
              )}
            >
              Vertikal
            </p>
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Split Ratio
          </label>
          <div className="text-[10px] font-black tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
            {Math.round(splitRatio * 100)}% :{" "}
            {Math.round((1 - splitRatio) * 100)}%
          </div>
        </div>
        <Slider
          min={0.3}
          max={0.7}
          step={0.05}
          value={[splitRatio]}
          onValueChange={(v: number[]) => setSplitRatio(v[0] ?? 0.5)}
          className="py-2"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 pt-2">
        <div className="flex justify-between items-center px-1">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-tight text-foreground">
              Faded Border
            </label>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">
              Gradasi halus antar video
            </p>
          </div>
          <Switch
            checked={smoothBorder}
            onCheckedChange={setSmoothBorder}
            className="data-[state=checked]:bg-primary"
          />
        </div>
        <div className="flex justify-between items-center px-1">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-tight text-foreground">
              Blur Overlay
            </label>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">
              Background area blur
            </p>
          </div>
          <Switch
            checked={overlayMode}
            onCheckedChange={setOverlayMode}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>
    </div>
  );
}

function AudioControls({
  mainVolume,
  setMainVolume,
  reactionVolume,
  setReactionVolume,
}: {
  mainVolume: number;
  setMainVolume: (val: number) => void;
  reactionVolume: number;
  setReactionVolume: (val: number) => void;
}) {
  return (
    <div className="space-y-10">
      <div className="space-y-5">
        <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            Main Audio
          </label>
          <div className="text-[10px] font-black tracking-widest bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20">
            {Math.round(mainVolume * 100)}%
          </div>
        </div>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={[mainVolume]}
          onValueChange={(v: number[]) => setMainVolume(v[0] ?? 1)}
          className="py-2"
        />
      </div>

      <div className="space-y-5">
        <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Reaction Audio
          </label>
          <div className="text-[10px] font-black tracking-widest bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full border border-orange-500/20">
            {Math.round(reactionVolume * 100)}%
          </div>
        </div>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={[reactionVolume]}
          onValueChange={(v: number[]) => setReactionVolume(v[0] ?? 1)}
          className="py-2"
        />
      </div>
    </div>
  );
}
