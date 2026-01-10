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
} from "@/components/ui";
import { useModernEditorStore } from "@/stores/modern-editor-store";
import type {
  Layer,
  TextLayer,
  VideoLayer,
  AudioLayer,
} from "@vibe-creator/shared";
import { clsx } from "clsx";

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
      <div className={clsx("space-y-4", className)}>
        <Card className="bg-card/50">
          <CardBody className="p-4 space-y-4">
            <h3 className="text-sm font-semibold">Canvas Settings</h3>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground mb-1 block">
                Aspect Ratio
              </label>
              <Select
                value={getCurrentAspectRatio()}
                onValueChange={handleAspectRatioChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  {aspectRatioOptions.map((opt) => (
                    <SelectItem key={opt.label} value={opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                label="Width"
                value={settings.width.toString()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateSettings({ width: Number(e.target.value) })
                }
              />
              <Input
                type="number"
                label="Height"
                value={settings.height.toString()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateSettings({ height: Number(e.target.value) })
                }
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Background Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) =>
                    updateSettings({ backgroundColor: e.target.value })
                  }
                  className="h-9 w-9 p-0.5 rounded cursor-pointer bg-transparent border border-border"
                />
                <Input
                  value={settings.backgroundColor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateSettings({ backgroundColor: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-card/50">
          <CardBody className="p-4 text-center text-muted-foreground text-xs">
            <p>Select a layer to edit its properties.</p>
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
    <div className={clsx("space-y-4", className)}>
      {/* Transform Properties */}
      <Card className="bg-card/50">
        <CardBody className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">Transform</h3>

          {/* Position */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground block">
                X (%)
              </label>
              <Slider
                min={0}
                max={100}
                value={[selectedLayer.x]}
                onValueChange={(v: number[]) => handleUpdate({ x: v[0] })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground block">
                Y (%)
              </label>
              <Slider
                min={0}
                max={100}
                value={[selectedLayer.y]}
                onValueChange={(v: number[]) => handleUpdate({ y: v[0] })}
              />
            </div>
          </div>

          {/* Size */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground block">
                Width (%)
              </label>
              <Slider
                min={1}
                max={200}
                value={[selectedLayer.width]}
                onValueChange={(v: number[]) => handleUpdate({ width: v[0] })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground block">
                Height (%)
              </label>
              <Slider
                min={1}
                max={200}
                value={[selectedLayer.height]}
                onValueChange={(v: number[]) => handleUpdate({ height: v[0] })}
              />
            </div>
          </div>

          {/* Rotation & Opacity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground block">
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
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground block">
                Opacity
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
      <Card className="bg-card/50">
        <CardBody className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">Timing</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground block">
                Start (s)
              </label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={(selectedLayer.startMs / 1000).toFixed(1)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleUpdate({ startMs: parseFloat(e.target.value) * 1000 })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground block">
                End (s)
              </label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={(selectedLayer.endMs / 1000).toFixed(1)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleUpdate({ endMs: parseFloat(e.target.value) * 1000 })
                }
              />
            </div>
          </div>

          {/* Duration slider */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground block">
              Duration:{" "}
              {((selectedLayer.endMs - selectedLayer.startMs) / 1000).toFixed(
                1
              )}
              s
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
    <Card className="bg-card/50">
      <CardBody className="p-4 space-y-4">
        <h3 className="text-sm font-semibold">Text</h3>

        {/* Position Presets */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Position Preset
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onUpdate({ x: 50, y: 85, width: 90, height: 12 })}
              className="flex-1 text-xs px-2 py-1.5 rounded bg-muted hover:bg-muted/80 transition-colors"
            >
              Bottom
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ x: 50, y: 15, width: 90, height: 12 })}
              className="flex-1 text-xs px-2 py-1.5 rounded bg-muted hover:bg-muted/80 transition-colors"
            >
              Top
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ x: 50, y: 50, width: 80, height: 20 })}
              className="flex-1 text-xs px-2 py-1.5 rounded bg-muted hover:bg-muted/80 transition-colors"
            >
              Center
            </button>
          </div>
        </div>

        <Input
          label="Content"
          value={layer.data.text}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            updateData({ text: e.target.value })
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Font Size"
            type="number"
            min={8}
            max={200}
            value={layer.data.fontSize.toString()}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateData({ fontSize: parseInt(e.target.value) || 48 })
            }
          />
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Weight</label>
            <Select
              value={layer.data.fontWeight}
              onValueChange={(v) =>
                updateData({ fontWeight: v as "normal" | "bold" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Color
            </label>
            <input
              type="color"
              value={layer.data.color}
              onChange={(e) => updateData({ color: e.target.value })}
              className="w-full h-8 rounded cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Bg Color
            </label>
            <div className="flex gap-1">
              <input
                type="color"
                value={layer.data.backgroundColor || "#000000"}
                onChange={(e) =>
                  updateData({ backgroundColor: e.target.value })
                }
                className="flex-1 h-8 rounded cursor-pointer"
              />
              <button
                type="button"
                onClick={() => updateData({ backgroundColor: undefined })}
                className="px-2 h-8 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                title="Transparent"
              >
                None
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Align</label>
            <Select
              value={layer.data.textAlign}
              onValueChange={(v) =>
                updateData({ textAlign: v as "left" | "center" | "right" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Animation</label>
          <Select
            value={layer.data.animation}
            onValueChange={(v) =>
              updateData({
                animation: v as
                  | "none"
                  | "fade"
                  | "slide-up"
                  | "slide-down"
                  | "typewriter",
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="fade">Fade</SelectItem>
              <SelectItem value="slide-up">Slide Up</SelectItem>
              <SelectItem value="slide-down">Slide Down</SelectItem>
              <SelectItem value="typewriter">Typewriter</SelectItem>
            </SelectContent>
          </Select>
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
    <Card className="bg-card/50">
      <CardBody className="p-4 space-y-4">
        <h3 className="text-sm font-semibold">Video</h3>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Volume</label>
          <Slider
            min={0}
            max={2}
            step={0.1}
            value={[layer.data.volume]}
            onValueChange={(v: number[]) => updateData({ volume: v[0] })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Fit</label>
          <Select
            value={layer.data.fit}
            onValueChange={(v) => updateData({ fit: v as "cover" | "contain" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contain">Contain</SelectItem>
              <SelectItem value="cover">Cover</SelectItem>
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
    <Card className="bg-card/50">
      <CardBody className="p-4 space-y-4">
        <h3 className="text-sm font-semibold">Audio</h3>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Volume</label>
          <Slider
            min={0}
            max={2}
            step={0.1}
            value={[layer.data.volume]}
            onValueChange={(v: number[]) => updateData({ volume: v[0] })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground block">
              Fade In (s)
            </label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={(layer.data.fadeIn / 1000).toFixed(1)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateData({ fadeIn: parseFloat(e.target.value) * 1000 })
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground block">
              Fade Out (s)
            </label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={(layer.data.fadeOut / 1000).toFixed(1)}
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
