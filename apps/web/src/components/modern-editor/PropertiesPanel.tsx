/**
 * Properties Panel
 *
 * Context-aware property editor based on selected layer.
 * Shows transform, timing, and type-specific properties.
 */

import {
  Card,
  CardBody,
  Slider,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
} from "@/components/ui";
import { useModernEditorStore } from "@/stores/modern-editor-store";
import type {
  Layer,
  TextLayer,
  VideoLayer,
  AudioLayer,
} from "@vibe-creator/shared";
import { cn } from "@/lib/utils";

interface PropertiesPanelProps {
  className?: string;
}

export function PropertiesPanel({ className }: PropertiesPanelProps) {
  const {
    selectedLayerId,
    layersById,
    updateLayer,
    getMaxEndMs,
    settings,
    updateSettings,
  } = useModernEditorStore();

  const selectedLayer = selectedLayerId ? layersById[selectedLayerId] : null;

  const aspectRatioOptions = [
    { label: "16:9 (Landscape)", width: 1920, height: 1080 },
    { label: "9:16 (Portrait)", width: 1080, height: 1920 },
    { label: "1:1 (Square)", width: 1080, height: 1080 },
    { label: "4:5 (IG Portrait)", width: 1080, height: 1350 },
    { label: "Custom", width: 0, height: 0 },
  ];

  const handleAspectRatioChange = (value: string) => {
    const selected = aspectRatioOptions.find((opt) => opt.label === value);
    if (selected && selected.width > 0) {
      updateSettings({ width: selected.width, height: selected.height });
    }
  };

  const getCurrentAspectRatio = () => {
    const found = aspectRatioOptions.find(
      (opt) => opt.width === settings.width && opt.height === settings.height
    );
    return found?.label || "Custom";
  };

  if (!selectedLayer) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card className="bg-card/70 backdrop-blur-xl border-border/40 overflow-hidden">
          <CardBody className="p-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Canvas Settings
              </h3>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Aspect Ratio
              </label>
              <Select
                value={getCurrentAspectRatio()}
                onValueChange={handleAspectRatioChange}
              >
                <SelectTrigger className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  {aspectRatioOptions.map((opt) => (
                    <SelectItem
                      key={opt.label}
                      value={opt.label}
                      className="text-xs font-bold uppercase"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Width
                </label>
                <Input
                  type="number"
                  value={settings.width.toString()}
                  className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateSettings({ width: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Height
                </label>
                <Input
                  type="number"
                  value={settings.height.toString()}
                  className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateSettings({ height: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Background Color
              </label>
              <div className="flex gap-2">
                <div className="flex items-center gap-3 bg-background/30 p-1.5 rounded-xl border border-border/20 flex-1 group">
                  <input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) =>
                      updateSettings({ backgroundColor: e.target.value })
                    }
                    className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border-none appearance-none"
                  />
                  <Input
                    value={settings.backgroundColor}
                    className="bg-transparent border-none focus:ring-0 h-8 font-mono font-bold text-xs group-hover:text-primary transition-colors"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateSettings({ backgroundColor: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-card/50 border-dashed border-border/40">
          <CardBody className="p-8 text-center text-muted-foreground">
            <p className="text-xs font-bold uppercase tracking-widest opacity-40">
              Pilih layer untuk edit properti
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<Layer>) => {
    updateLayer(selectedLayerId!, updates);
  };

  const maxDuration = Math.max(getMaxEndMs(), 60000);

  return (
    <div
      className={cn(
        "space-y-6 h-full overflow-y-auto pr-1 scrollbar-hide pb-20 md:pb-0",
        className
      )}
    >
      {/* Transform Properties */}
      <Card className="bg-card/70 backdrop-blur-xl border-border/40 overflow-hidden">
        <CardBody className="p-6 space-y-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Transform
          </h3>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Position X ({selectedLayer.x}%)
              </label>
              <Slider
                min={0}
                max={100}
                value={[selectedLayer.x]}
                onValueChange={(v: number[]) => handleUpdate({ x: v[0] })}
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Position Y ({selectedLayer.y}%)
              </label>
              <Slider
                min={0}
                max={100}
                value={[selectedLayer.y]}
                onValueChange={(v: number[]) => handleUpdate({ y: v[0] })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Width ({selectedLayer.width}%)
              </label>
              <Slider
                min={1}
                max={200}
                value={[selectedLayer.width]}
                onValueChange={(v: number[]) => handleUpdate({ width: v[0] })}
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Height ({selectedLayer.height}%)
              </label>
              <Slider
                min={1}
                max={200}
                value={[selectedLayer.height]}
                onValueChange={(v: number[]) => handleUpdate({ height: v[0] })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Rotation (°)
              </label>
              <Slider
                min={-180}
                max={180}
                value={[selectedLayer.rotation]}
                onValueChange={(v: number[]) =>
                  handleUpdate({ rotation: v[0] })
                }
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Opacity ({Math.round(selectedLayer.opacity * 100)}%)
              </label>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[selectedLayer.opacity]}
                onValueChange={(v: number[]) => handleUpdate({ opacity: v[0] })}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Timing Properties */}
      <Card className="bg-card/70 backdrop-blur-xl border-border/40 overflow-hidden">
        <CardBody className="p-6 space-y-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Timing Control
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Start (s)
              </label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={(selectedLayer.startMs / 1000).toFixed(1)}
                className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight text-center"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleUpdate({ startMs: parseFloat(e.target.value) * 1000 })
                }
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                End (s)
              </label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={(selectedLayer.endMs / 1000).toFixed(1)}
                className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight text-center"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleUpdate({ endMs: parseFloat(e.target.value) * 1000 })
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Timeline Position
            </label>
            <Slider
              min={0}
              max={maxDuration}
              value={[selectedLayer.startMs, selectedLayer.endMs]}
              onValueChange={(v: number[]) => {
                if (v.length === 2) {
                  handleUpdate({ startMs: v[0], endMs: v[1] });
                }
              }}
            />
            <div className="flex justify-between">
              <span className="text-[10px] font-bold text-muted-foreground/40">
                Durasi:{" "}
                {((selectedLayer.endMs - selectedLayer.startMs) / 1000).toFixed(
                  1
                )}
                s
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Type-specific Properties */}
      {selectedLayer.type === "text" && (
        <TextLayerProperties layer={selectedLayer} onUpdate={handleUpdate} />
      )}
      {selectedLayer.type === "video" && (
        <VideoLayerProperties layer={selectedLayer} onUpdate={handleUpdate} />
      )}
      {selectedLayer.type === "audio" && (
        <AudioLayerProperties layer={selectedLayer} onUpdate={handleUpdate} />
      )}
    </div>
  );
}

// Text Layer Properties
function TextLayerProperties({
  layer,
  onUpdate,
}: {
  layer: TextLayer;
  onUpdate: (updates: Partial<Layer>) => void;
}) {
  const updateData = (dataUpdates: Partial<TextLayer["data"]>) => {
    onUpdate({ data: { ...layer.data, ...dataUpdates } } as Partial<Layer>);
  };

  return (
    <Card className="bg-card/70 backdrop-blur-xl border-border/40 overflow-hidden">
      <CardBody className="p-6 space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Text Style
          </h3>
          <Badge
            variant="outline"
            className="bg-primary/5 text-primary border-primary/20 text-[10px] font-black uppercase"
          >
            {layer.data.text.length} chars
          </Badge>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Content
          </label>
          <textarea
            value={layer.data.text}
            placeholder="Ketik teks di sini..."
            className="w-full min-h-[100px] p-4 bg-background/40 border border-border/40 focus:border-primary/40 focus:ring-1 focus:ring-primary/40 rounded-2xl outline-none text-sm font-bold transition-all resize-none"
            onChange={(e) => updateData({ text: e.target.value })}
          />
        </div>

        {/* Style Grid */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Font Size
            </label>
            <div className="flex items-center bg-background/40 border border-border/40 h-12 rounded-2xl overflow-hidden px-4 gap-2 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/40 transition-all">
              <input
                type="number"
                min={8}
                max={200}
                value={layer.data.fontSize}
                className="bg-transparent border-none focus:ring-0 p-0 h-full font-bold text-sm w-full outline-none"
                onChange={(e) =>
                  updateData({ fontSize: parseInt(e.target.value) || 48 })
                }
              />
              <span className="text-[10px] font-black text-muted-foreground/40">
                PX
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Weight
            </label>
            <Select
              value={layer.data.fontWeight}
              onValueChange={(v) =>
                updateData({ fontWeight: v as "normal" | "bold" })
              }
            >
              <SelectTrigger className="bg-background/40 border-border/40 h-12 rounded-2xl font-bold text-xs uppercase tracking-widest focus:ring-1 focus:ring-primary/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="normal"
                  className="text-xs font-bold uppercase"
                >
                  Normal
                </SelectItem>
                <SelectItem
                  value="bold"
                  className="text-xs font-black uppercase"
                >
                  Bold
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Appearance Grid */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Color
            </label>
            <div className="flex items-center gap-3 bg-background/40 border border-border/40 h-12 rounded-2xl px-3 group transition-all focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/40">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-border/20 flex-shrink-0">
                <input
                  type="color"
                  value={layer.data.color}
                  onChange={(e) => updateData({ color: e.target.value })}
                  className="absolute inset-[-10px] w-[200%] h-[200%] cursor-pointer"
                />
              </div>
              <span className="text-[10px] font-mono font-black text-muted-foreground/60 group-hover:text-primary transition-colors">
                {layer.data.color.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Animation
            </label>
            <Select
              value={layer.data.animation}
              onValueChange={(v) => updateData({ animation: v as any })}
            >
              <SelectTrigger className="bg-background/40 border-border/40 h-12 rounded-2xl font-bold text-xs uppercase tracking-widest focus:ring-1 focus:ring-primary/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  { label: "None", value: "none" },
                  { label: "Fade In", value: "fade" },
                  { label: "Slide Up", value: "slide-up" },
                  { label: "Slide Down", value: "slide-down" },
                  { label: "Typewriter", value: "typewriter" },
                ].map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-xs font-bold uppercase"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Layout & Presets */}
        <div className="space-y-6 pt-2 border-t border-border/10">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Position Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Top", x: 50, y: 15, w: 90, h: 12 },
                { label: "Center", x: 50, y: 50, w: 80, h: 20 },
                { label: "Bottom", x: 50, y: 85, w: 90, h: 12 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    onUpdate({
                      x: preset.x,
                      y: preset.y,
                      width: preset.w,
                      height: preset.h,
                    })
                  }
                  className="h-10 text-[10px] font-black uppercase tracking-widest rounded-xl bg-card border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-95"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Text Alignment
            </label>
            <div className="flex bg-muted/20 p-1.5 rounded-2xl gap-2 border border-border/10">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => updateData({ textAlign: align })}
                  className={cn(
                    "flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                    layer.data.textAlign === align
                      ? "bg-primary text-primary-foreground  scale-[1.02]"
                      : "text-muted-foreground/60 hover:bg-white/5 hover:text-muted-foreground"
                  )}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// Video Layer Properties
function VideoLayerProperties({
  layer,
  onUpdate,
}: {
  layer: VideoLayer;
  onUpdate: (updates: Partial<Layer>) => void;
}) {
  const updateData = (dataUpdates: Partial<VideoLayer["data"]>) => {
    onUpdate({ data: { ...layer.data, ...dataUpdates } } as Partial<Layer>);
  };

  return (
    <Card className="bg-card/70 backdrop-blur-xl border-border/40 overflow-hidden">
      <CardBody className="p-6 space-y-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Video Properties
        </h3>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block">
            Volume ({Math.round(layer.data.volume * 100)}%)
          </label>
          <Slider
            min={0}
            max={2}
            step={0.1}
            value={[layer.data.volume]}
            onValueChange={(v: number[]) => updateData({ volume: v[0] })}
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Fit Mode
          </label>
          <Select
            value={layer.data.fit}
            onValueChange={(v) => updateData({ fit: v as "cover" | "contain" })}
          >
            <SelectTrigger className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="contain"
                className="text-xs font-bold uppercase"
              >
                Contain
              </SelectItem>
              <SelectItem value="cover" className="text-xs font-bold uppercase">
                Cover
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardBody>
    </Card>
  );
}

// Audio Layer Properties
function AudioLayerProperties({
  layer,
  onUpdate,
}: {
  layer: AudioLayer;
  onUpdate: (updates: Partial<Layer>) => void;
}) {
  const updateData = (dataUpdates: Partial<AudioLayer["data"]>) => {
    onUpdate({ data: { ...layer.data, ...dataUpdates } } as Partial<Layer>);
  };

  return (
    <Card className="bg-card/70 backdrop-blur-xl border-border/40 overflow-hidden">
      <CardBody className="p-6 space-y-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Audio Properties
        </h3>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block">
            Volume ({Math.round(layer.data.volume * 100)}%)
          </label>
          <Slider
            min={0}
            max={2}
            step={0.1}
            value={[layer.data.volume]}
            onValueChange={(v: number[]) => updateData({ volume: v[0] })}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block">
              Fade In (s)
            </label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={(layer.data.fadeIn / 1000).toFixed(1)}
              className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight text-center"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateData({ fadeIn: parseFloat(e.target.value) * 1000 })
              }
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block">
              Fade Out (s)
            </label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={(layer.data.fadeOut / 1000).toFixed(1)}
              className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight text-center"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateData({ fadeOut: parseFloat(e.target.value) * 1000 })
              }
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
