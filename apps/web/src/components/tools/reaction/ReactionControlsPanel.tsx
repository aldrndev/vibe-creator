import { ChangeEvent } from "react";
import {
  Button,
  Card,
  CardBody,
  Slider,
  Divider,
  Select,
  SelectItem,
  Switch,
  Accordion,
  AccordionItem,
} from "@heroui/react";
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
          <div className="p-4 bg-default-50/50 border-b border-divider">
            <label className="text-xs font-semibold uppercase text-foreground/50 mb-3 block px-1">
              Mode Layout
            </label>
            <div className="grid grid-cols-2 gap-3">
              {layoutModes.map((mode) => (
                <Card
                  key={mode.id}
                  isPressable
                  onPress={() => setLayoutMode(mode.id)}
                  className={`border-2 transition-all ${
                    layoutMode === mode.id
                      ? `border-${mode.color} bg-${mode.color}/5`
                      : "border-transparent hover:border-default-200"
                  }`}
                  shadow="sm"
                >
                  <CardBody className="p-3 text-center flex flex-col items-center justify-center gap-2 h-full">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        layoutMode === mode.id
                          ? `bg-${mode.color}/20 text-${mode.color}`
                          : "bg-default-100 text-default-500"
                      }`}
                    >
                      <mode.icon size={18} />
                    </div>
                    <div>
                      <p
                        className={`font-semibold text-sm ${
                          layoutMode === mode.id ? `text-${mode.color}` : ""
                        }`}
                      >
                        {mode.name}
                      </p>
                      <p className="text-[10px] text-foreground/50 leading-tight mt-0.5">
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
              defaultExpandedKeys={["visual", "audio"]}
              selectionMode="multiple"
              className="md:hidden px-2"
            >
              <AccordionItem
                key="visual"
                aria-label="Visual Preferences"
                title={
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Settings2 size={16} /> Preferensi Visual
                  </div>
                }
              >
                <div className="space-y-6 pb-2">
                  {/* Aspect Ratio */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">
                        Aspect Ratio Output
                      </label>
                    </div>
                    <Select
                      selectedKeys={[aspectRatio]}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setAspectRatio(e.target.value)
                      }
                      size="sm"
                      aria-label="Aspect Ratio"
                    >
                      <SelectItem key="16:9">
                        16:9 (YouTube, FB Video)
                      </SelectItem>
                      <SelectItem key="9:16">
                        9:16 (TikTok/Reels/Shorts)
                      </SelectItem>
                      <SelectItem key="1:1">1:1 (IG/FB Feed)</SelectItem>
                      <SelectItem key="4:5">4:5 (IG/FB Portrait)</SelectItem>
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
              </AccordionItem>
              <AccordionItem
                key="audio"
                aria-label="Audio Mixer"
                title={
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Volume2 size={16} /> Audio Mixer
                  </div>
                }
              >
                <div className="space-y-4 pb-4">
                  <AudioControls
                    mainVolume={mainVolume}
                    setMainVolume={setMainVolume}
                    reactionVolume={reactionVolume}
                    setReactionVolume={setReactionVolume}
                  />
                </div>
              </AccordionItem>
            </Accordion>

            {/* Desktop Only: Unwrapped */}
            <div className="hidden md:block space-y-6">
              <Card
                className="border border-divider shadow-none bg-default-50/50"
                radius="sm"
              >
                <CardBody className="space-y-4 p-4">
                  <h3 className="text-xs font-bold uppercase text-foreground/50 flex items-center gap-2">
                    <Settings2 size={14} /> Preferensi Visual
                  </h3>
                  {/* Aspect Ratio */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">
                        Aspect Ratio Output
                      </label>
                    </div>
                    <Select
                      selectedKeys={[aspectRatio]}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setAspectRatio(e.target.value)
                      }
                      size="sm"
                      aria-label="Aspect Ratio"
                    >
                      <SelectItem key="16:9">
                        16:9 (YouTube, FB Video)
                      </SelectItem>
                      <SelectItem key="9:16">
                        9:16 (TikTok/Reels/Shorts)
                      </SelectItem>
                      <SelectItem key="1:1">1:1 (IG/FB Feed)</SelectItem>
                      <SelectItem key="4:5">4:5 (IG/FB Portrait)</SelectItem>
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

              <Card
                className="border border-divider shadow-none bg-default-50/50"
                radius="sm"
              >
                <CardBody className="space-y-4 p-4">
                  <h3 className="text-xs font-bold uppercase text-foreground/50 flex items-center gap-2">
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
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-divider md:static md:bg-transparent md:border-none md:p-0 z-50">
              <Button
                size="lg"
                color="primary"
                className="w-full font-semibold shadow-lg shadow-primary/20"
                startContent={!isProcessing && <Sparkles size={20} />}
                isLoading={isProcessing}
                isDisabled={!hasFiles}
                onPress={onProcess}
              >
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
            <Switch
              size="sm"
              isSelected={circular}
              onValueChange={setCircular}
              aria-label="Circular Mode"
            />
          </div>
          <p className="text-[10px] text-foreground/50">
            Ubah bentuk video reaction menjadi lingkaran.
          </p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium">Ukuran (Scale)</label>
            <span className="text-xs font-mono bg-default-200 px-2 py-0.5 rounded text-foreground/70">
              {Math.round(pipScale * 100)}%
            </span>
          </div>
          <Slider
            size="sm"
            step={0.01}
            minValue={0.15}
            maxValue={0.5}
            value={pipScale}
            onChange={(v) => setPipScale(v as number)}
            className="max-w-md"
            aria-label="PIP Scale"
          />
        </div>
        <p className="text-xs text-foreground/50 mt-1 italic">
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
          <Grid size={14} className="text-secondary" />
          Arah Grid
        </label>
        <div className="flex gap-2">
          <Button
            size="md"
            variant={sideBySideLayout === "horizontal" ? "solid" : "flat"}
            color="secondary"
            className="flex-1"
            onPress={() => setSideBySideLayout("horizontal")}
          >
            <div className="flex flex-col">
              <p>Horizontal</p>
              <p className="text-xs">Kanan-Kiri</p>
            </div>
          </Button>
          <Button
            size="md"
            variant={sideBySideLayout === "vertical" ? "solid" : "flat"}
            color="secondary"
            className="flex-1"
            onPress={() => setSideBySideLayout("vertical")}
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
          <span className="text-xs font-mono bg-default-200 px-2 py-0.5 rounded text-foreground/70">
            {Math.round(splitRatio * 100)}% /{" "}
            {Math.round((1 - splitRatio) * 100)}%
          </span>
        </div>
        <Slider
          size="sm"
          step={0.05}
          minValue={0.5}
          maxValue={0.7}
          value={splitRatio}
          onChange={(v) => setSplitRatio(v as number)}
          aria-label="Split Ratio"
        />
        <p className="text-[10px] text-foreground/40 mt-1">
          Default ratio 50/50, geser kekanan untuk merubah.
        </p>
      </div>

      <div className="space-y-3 pt-2 bg-default-100/50 p-2 rounded-lg">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium block">
              Gradient Blending
            </label>
            <p className="text-[10px] text-foreground/50 leading-tight">
              Membuat batas antar video menjadi halus (seamless) dengan gradasi.
            </p>
          </div>
          <Switch
            size="sm"
            isSelected={smoothBorder}
            onValueChange={setSmoothBorder}
            aria-label="Smooth Border"
          />
        </div>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium block">
              Overlay Background
            </label>
            <p className="text-[10px] text-foreground/50 leading-tight">
              Menambahkan background blur di area kosong agar terlihat smooth.
            </p>
          </div>
          <Switch
            size="sm"
            isSelected={overlayMode}
            onValueChange={setOverlayMode}
            aria-label="Overlay Mode"
          />
        </div>
        <p className="text-[10px] text-foreground/50">
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
          <label className="text-xs font-semibold text-foreground/70">
            Main Audio
          </label>
          <span className="text-[10px] font-mono bg-success/10 text-success px-1.5 py-0.5 rounded">
            {Math.round(mainVolume * 100)}%
          </span>
        </div>
        <Slider
          size="sm"
          color="success"
          step={0.1}
          minValue={0}
          maxValue={2}
          value={mainVolume}
          onChange={(v) => setMainVolume(v as number)}
          aria-label="Main Volume"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-semibold text-foreground/70">
            Reaction Audio
          </label>
          <span className="text-[10px] font-mono bg-secondary/10 text-secondary px-1.5 py-0.5 rounded">
            {Math.round(reactionVolume * 100)}%
          </span>
        </div>
        <Slider
          size="sm"
          color="secondary"
          step={0.1}
          minValue={0}
          maxValue={2}
          value={reactionVolume}
          onChange={(v) => setReactionVolume(v as number)}
          aria-label="Reaction Volume"
        />
      </div>
    </>
  );
}
