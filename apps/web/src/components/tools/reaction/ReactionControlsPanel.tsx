import {
  Button,
  Card,
  CardBody,
  Slider,
  Divider,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui";
import { Grid, Layers, Settings2, Volume2, Sparkles } from "lucide-react";
import { LayoutMode, SideBySideLayout } from "@/hooks/useReactionCreator";

const layoutModes = [
  {
    id: "pip" as const,
    name: "Picture-in-Picture",
    description: "Video reaksi di sudut",
    icon: Layers,
    color: "primary",
  },
  {
    id: "side-by-side" as const,
    name: "Side by Side",
    description: "Dua video berdampingan",
    icon: Grid,
    color: "secondary",
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
    <div className="lg:col-span-4 space-y-4 md:space-y-6">
      <Card>
        <CardBody className="p-0 overflow-hidden">
          {/* Mode Selector (Always Visible) */}
          <div className="p-4 bg-muted/50 border-b border-border">
            <label className="text-xs font-semibold uppercase text-muted-foreground mb-3 block px-1">
              Mode Layout
            </label>
            <div className="grid grid-cols-2 gap-3">
              {layoutModes.map((mode) => (
                <Card
                  key={mode.id}
                  className={`cursor-pointer border-2 transition-all ${
                    layoutMode === mode.id
                      ? `border-primary bg-primary/5`
                      : "border-transparent hover:border-border"
                  }`}
                  onClick={() => setLayoutMode(mode.id)}
                >
                  <CardBody className="p-3 text-center flex flex-col items-center justify-center gap-2 h-full">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        layoutMode === mode.id
                          ? `bg-primary/20 text-primary`
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <mode.icon size={18} />
                    </div>
                    <div>
                      <p
                        className={`font-semibold text-sm ${
                          layoutMode === mode.id ? `text-primary` : ""
                        }`}
                      >
                        {mode.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        {mode.description}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>

          {/* Desktop: Standard Vertical Flow / Mobile: Accordion */}
          <div className="p-0 md:p-6 md:space-y-6">
            {/* Accordion Wrapper for Mobile Layout Optimization */}
            <Accordion
              type="multiple"
              defaultValue={["visual", "audio"]}
              className="md:hidden px-2"
            >
              <AccordionItem value="visual">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <Settings2 size={16} /> Preferensi Visual
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pb-2">
                    {/* Aspect Ratio */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Aspect Ratio Output
                      </label>
                      <Select
                        value={aspectRatio}
                        onValueChange={setAspectRatio}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Rasio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="16:9">
                            16:9 (YouTube, FB Video)
                          </SelectItem>
                          <SelectItem value="9:16">
                            9:16 (TikTok/Reels/Shorts)
                          </SelectItem>
                          <SelectItem value="1:1">1:1 (IG/FB Feed)</SelectItem>
                          <SelectItem value="4:5">
                            4:5 (IG/FB Portrait)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Divider />
                    {/* Dynamic Controls based on Layout */}
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
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="audio">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} /> Audio Mixer
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pb-4">
                    <AudioControls
                      mainVolume={mainVolume}
                      setMainVolume={setMainVolume}
                      reactionVolume={reactionVolume}
                      setReactionVolume={setReactionVolume}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Desktop Only: Unwrapped */}
            <div className="hidden md:block space-y-6">
              <Card className="border border-border shadow-none bg-muted/50">
                <CardBody className="space-y-4 p-4">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Settings2 size={14} /> Preferensi Visual
                  </h3>
                  {/* Aspect Ratio */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Aspect Ratio Output
                    </label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Rasio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">
                          16:9 (YouTube, FB Video)
                        </SelectItem>
                        <SelectItem value="9:16">
                          9:16 (TikTok/Reels/Shorts)
                        </SelectItem>
                        <SelectItem value="1:1">1:1 (IG/FB Feed)</SelectItem>
                        <SelectItem value="4:5">
                          4:5 (IG/FB Portrait)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Divider className="my-2" />
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
                </CardBody>
              </Card>

              <Card className="border border-border shadow-none bg-muted/50">
                <CardBody className="space-y-4 p-4">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Volume2 size={14} /> Audio Mixer
                  </h3>
                  <AudioControls
                    mainVolume={mainVolume}
                    setMainVolume={setMainVolume}
                    reactionVolume={reactionVolume}
                    setReactionVolume={setReactionVolume}
                  />
                </CardBody>
              </Card>
            </div>

            {/* Process Button - Sticky on Mobile */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border md:static md:bg-transparent md:border-none md:p-0 z-50">
              <Button
                size="lg"
                className="w-full font-semibold shadow-lg shadow-primary/20"
                isLoading={isProcessing}
                disabled={!hasFiles}
                onClick={onProcess}
              >
                {!isProcessing && <Sparkles size={20} />}
                {isProcessing ? processingStatus : "Buat Video Reaction"}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
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
      <div className="space-y-4 animate-in fade-in">
        <div>
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Mode Lingkaran</label>
            <Switch checked={circular} onCheckedChange={setCircular} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Ubah bentuk video reaction menjadi lingkaran.
          </p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium">Ukuran (Scale)</label>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
              {Math.round(pipScale * 100)}%
            </span>
          </div>
          <Slider
            min={0.15}
            max={0.5}
            step={0.01}
            value={[pipScale]}
            onValueChange={(v: number[]) => setPipScale(v[0] ?? 0.3)}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1 italic">
          *Tip: Ubah posisi video reaction dengan menggeser kotak preview di
          kiri.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in">
      <div>
        <label className="text-sm font-medium mb-3 block flex items-center gap-2">
          <Grid size={14} className="text-secondary-foreground" />
          Arah Grid
        </label>
        <div className="flex gap-2">
          <Button
            variant={
              sideBySideLayout === "horizontal" ? "default" : "secondary"
            }
            className="flex-1"
            onClick={() => setSideBySideLayout("horizontal")}
          >
            <div className="flex flex-col">
              <p>Horizontal</p>
              <p className="text-xs">Kanan-Kiri</p>
            </div>
          </Button>
          <Button
            variant={sideBySideLayout === "vertical" ? "default" : "secondary"}
            className="flex-1"
            onClick={() => setSideBySideLayout("vertical")}
          >
            <div className="flex flex-col">
              <p>Vertical</p>
              <p className="text-xs">Atas-Bawah</p>
            </div>
          </Button>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium">Split Ratio</label>
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
            {Math.round(splitRatio * 100)}% /{" "}
            {Math.round((1 - splitRatio) * 100)}%
          </span>
        </div>
        <Slider
          min={0.5}
          max={0.7}
          step={0.05}
          value={[splitRatio]}
          onValueChange={(v: number[]) => setSplitRatio(v[0] ?? 50)}
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Default ratio 50/50, geser kekanan untuk merubah.
        </p>
      </div>

      <div className="space-y-3 pt-2 bg-muted/50 p-2 rounded-lg">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium block">
              Gradient Blending
            </label>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Membuat batas antar video menjadi halus (seamless) dengan gradasi.
            </p>
          </div>
          <Switch checked={smoothBorder} onCheckedChange={setSmoothBorder} />
        </div>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium block">
              Overlay Background
            </label>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Menambahkan background blur di area kosong agar terlihat smooth.
            </p>
          </div>
          <Switch checked={overlayMode} onCheckedChange={setOverlayMode} />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Aktifkan keduanya untuk smooth faded border antar video utama dan
          reaction.
        </p>
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
    <>
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-semibold text-muted-foreground">
            Main Audio
          </label>
          <span className="text-[10px] font-mono bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">
            {Math.round(mainVolume * 100)}%
          </span>
        </div>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={[mainVolume]}
          onValueChange={(v: number[]) => setMainVolume(v[0] ?? 100)}
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-semibold text-muted-foreground">
            Reaction Audio
          </label>
          <span className="text-[10px] font-mono bg-secondary/10 text-secondary-foreground px-1.5 py-0.5 rounded">
            {Math.round(reactionVolume * 100)}%
          </span>
        </div>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={[reactionVolume]}
          onValueChange={(v: number[]) => setReactionVolume(v[0] ?? 100)}
        />
      </div>
    </>
  );
}
