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
  SelectItem,
} from "@heroui/react";
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
  ];

  const handleAspectRatioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = aspectRatioOptions.find(
      (opt) => opt.label === e.target.value
    );
    if (selected) {
      updateSettings({ width: selected.width, height: selected.height });
    }
  };

  if (!selectedLayer) {
    return (
      <div className={clsx("space-y-4", className)}>
        <Card className="bg-content1/50">
          <CardBody className="p-4 space-y-4">
            <h3 className="text-sm font-semibold">Canvas Settings</h3>

            <div>
              <label className="text-xs text-foreground/60 mb-1 block">
                Aspect Ratio
              </label>
              <Select
                size="sm"
                aria-label="Aspect Ratio"
                selectedKeys={[
                  aspectRatioOptions.find(
                    (opt) =>
                      opt.width === settings.width &&
                      opt.height === settings.height
                  )?.label || "Custom",
                ]}
                onChange={handleAspectRatioChange}
              >
                {[
                  ...aspectRatioOptions,
                  { label: "Custom", width: 0, height: 0 },
                ].map((opt) => (
                  <SelectItem key={opt.label}>{opt.label}</SelectItem>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                size="sm"
                type="number"
                label="Width"
                value={settings.width.toString()}
                onChange={(e) =>
                  updateSettings({ width: Number(e.target.value) })
                }
              />
              <Input
                size="sm"
                type="number"
                label="Height"
                value={settings.height.toString()}
                onChange={(e) =>
                  updateSettings({ height: Number(e.target.value) })
                }
              />
            </div>

            <div>
              <label className="text-xs text-foreground/60 mb-1 block">
                Background Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) =>
                    updateSettings({ backgroundColor: e.target.value })
                  }
                  className="h-9 w-9 p-0.5 rounded cursor-pointer bg-transparent border border-default-200"
                />
                <Input
                  size="sm"
                  value={settings.backgroundColor}
                  onChange={(e) =>
                    updateSettings({ backgroundColor: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-content1/50">
          <CardBody className="p-4 text-center text-foreground/50 text-xs">
            <p>Select a layer to edit its properties.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<Layer>) => {
    updateLayer(selectedLayerId!, updates);
  };

  const maxDuration = Math.max(getMaxEndMs(), 60000); // At least 60s for slider

  return (
    <div className={clsx("space-y-4", className)}>
      {/* Transform Properties */}
      <Card className="bg-content1/50">
        <CardBody className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">Transform</h3>

          {/* Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-foreground/60 mb-1 block">
                X (%)
              </label>
              <Slider
                size="sm"
                minValue={0}
                maxValue={100}
                value={selectedLayer.x}
                onChange={(v) => handleUpdate({ x: v as number })}
                aria-label="Position X"
              />
            </div>
            <div>
              <label className="text-xs text-foreground/60 mb-1 block">
                Y (%)
              </label>
              <Slider
                size="sm"
                minValue={0}
                maxValue={100}
                value={selectedLayer.y}
                onChange={(v) => handleUpdate({ y: v as number })}
                aria-label="Position Y"
              />
            </div>
          </div>

          {/* Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-foreground/60 mb-1 block">
                Width (%)
              </label>
              <Slider
                size="sm"
                minValue={1}
                maxValue={200}
                value={selectedLayer.width}
                onChange={(v) => handleUpdate({ width: v as number })}
                aria-label="Width"
              />
            </div>
            <div>
              <label className="text-xs text-foreground/60 mb-1 block">
                Height (%)
              </label>
              <Slider
                size="sm"
                minValue={1}
                maxValue={200}
                value={selectedLayer.height}
                onChange={(v) => handleUpdate({ height: v as number })}
                aria-label="Height"
              />
            </div>
          </div>

          {/* Rotation & Opacity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-foreground/60 mb-1 block">
                Rotation (°)
              </label>
              <Slider
                size="sm"
                minValue={-180}
                maxValue={180}
                value={selectedLayer.rotation}
                onChange={(v) => handleUpdate({ rotation: v as number })}
                aria-label="Rotation"
              />
            </div>
            <div>
              <label className="text-xs text-foreground/60 mb-1 block">
                Opacity
              </label>
              <Slider
                size="sm"
                minValue={0}
                maxValue={1}
                step={0.05}
                value={selectedLayer.opacity}
                onChange={(v) => handleUpdate({ opacity: v as number })}
                aria-label="Opacity"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Timing Properties */}
      <Card className="bg-content1/50">
        <CardBody className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">Timing</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-foreground/60 mb-1 block">
                Start (s)
              </label>
              <Input
                size="sm"
                type="number"
                min={0}
                step={0.1}
                value={(selectedLayer.startMs / 1000).toFixed(1)}
                onChange={(e) =>
                  handleUpdate({ startMs: parseFloat(e.target.value) * 1000 })
                }
                aria-label="Start Time"
              />
            </div>
            <div>
              <label className="text-xs text-foreground/60 mb-1 block">
                End (s)
              </label>
              <Input
                size="sm"
                type="number"
                min={0}
                step={0.1}
                value={(selectedLayer.endMs / 1000).toFixed(1)}
                onChange={(e) =>
                  handleUpdate({ endMs: parseFloat(e.target.value) * 1000 })
                }
                aria-label="End Time"
              />
            </div>
          </div>

          {/* Duration slider */}
          <div>
            <label className="text-xs text-foreground/60 mb-1 block">
              Duration:{" "}
              {((selectedLayer.endMs - selectedLayer.startMs) / 1000).toFixed(
                1
              )}
              s
            </label>
            <Slider
              size="sm"
              minValue={0}
              maxValue={maxDuration}
              value={[selectedLayer.startMs, selectedLayer.endMs]}
              onChange={(v) => {
                if (Array.isArray(v)) {
                  handleUpdate({ startMs: v[0], endMs: v[1] });
                }
              }}
              aria-label="Duration Range"
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
    <Card className="bg-content1/50">
      <CardBody className="p-4 space-y-4">
        <h3 className="text-sm font-semibold">Text</h3>

        {/* Position Presets */}
        <div>
          <label className="text-xs text-foreground/60 mb-1 block">
            Position Preset
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onUpdate({ x: 50, y: 85, width: 90, height: 12 })}
              className="flex-1 text-xs px-2 py-1.5 rounded bg-default-100 hover:bg-default-200 transition-colors"
            >
              Bottom
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ x: 50, y: 15, width: 90, height: 12 })}
              className="flex-1 text-xs px-2 py-1.5 rounded bg-default-100 hover:bg-default-200 transition-colors"
            >
              Top
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ x: 50, y: 50, width: 80, height: 20 })}
              className="flex-1 text-xs px-2 py-1.5 rounded bg-default-100 hover:bg-default-200 transition-colors"
            >
              Center
            </button>
          </div>
        </div>

        <Input
          size="sm"
          label="Content"
          value={layer.data.text}
          onChange={(e) => updateData({ text: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            size="sm"
            label="Font Size"
            type="number"
            min={8}
            max={200}
            value={layer.data.fontSize.toString()}
            onChange={(e) =>
              updateData({ fontSize: parseInt(e.target.value) || 48 })
            }
          />
          <Select
            size="sm"
            label="Weight"
            selectedKeys={[layer.data.fontWeight]}
            onChange={(e) =>
              updateData({ fontWeight: e.target.value as "normal" | "bold" })
            }
          >
            <SelectItem key="normal">Normal</SelectItem>
            <SelectItem key="bold">Bold</SelectItem>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-foreground/60 mb-1 block">
              Color
            </label>
            <input
              type="color"
              value={layer.data.color}
              onChange={(e) => updateData({ color: e.target.value })}
              className="w-full h-8 rounded cursor-pointer"
              aria-label="Text Color"
            />
          </div>
          <div>
            <label className="text-xs text-foreground/60 mb-1 block">
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
                aria-label="Background Color"
              />
              <button
                type="button"
                onClick={() => updateData({ backgroundColor: undefined })}
                className="px-2 h-8 text-xs bg-default-100 hover:bg-default-200 rounded transition-colors"
                title="Transparent"
              >
                None
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            size="sm"
            label="Align"
            selectedKeys={[layer.data.textAlign]}
            onChange={(e) =>
              updateData({
                textAlign: e.target.value as "left" | "center" | "right",
              })
            }
          >
            <SelectItem key="left">Left</SelectItem>
            <SelectItem key="center">Center</SelectItem>
            <SelectItem key="right">Right</SelectItem>
          </Select>
        </div>

        <Select
          size="sm"
          label="Animation"
          selectedKeys={[layer.data.animation]}
          onChange={(e) =>
            updateData({
              animation: e.target.value as
                | "none"
                | "fade"
                | "slide-up"
                | "slide-down"
                | "typewriter",
            })
          }
        >
          <SelectItem key="none">None</SelectItem>
          <SelectItem key="fade">Fade</SelectItem>
          <SelectItem key="slide-up">Slide Up</SelectItem>
          <SelectItem key="slide-down">Slide Down</SelectItem>
          <SelectItem key="typewriter">Typewriter</SelectItem>
        </Select>
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
    <Card className="bg-content1/50">
      <CardBody className="p-4 space-y-4">
        <h3 className="text-sm font-semibold">Video</h3>

        <div>
          <label className="text-xs text-foreground/60 mb-1 block">
            Volume
          </label>
          <Slider
            size="sm"
            minValue={0}
            maxValue={2}
            step={0.1}
            value={layer.data.volume}
            onChange={(v) => updateData({ volume: v as number })}
            aria-label="Volume"
          />
        </div>

        <Select
          size="sm"
          label="Fit"
          selectedKeys={[layer.data.fit]}
          onChange={(e) =>
            updateData({ fit: e.target.value as "cover" | "contain" })
          }
        >
          <SelectItem key="contain">Contain</SelectItem>
          <SelectItem key="cover">Cover</SelectItem>
        </Select>
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
    <Card className="bg-content1/50">
      <CardBody className="p-4 space-y-4">
        <h3 className="text-sm font-semibold">Audio</h3>

        <div>
          <label className="text-xs text-foreground/60 mb-1 block">
            Volume
          </label>
          <Slider
            size="sm"
            minValue={0}
            maxValue={2}
            step={0.1}
            value={layer.data.volume}
            onChange={(v) => updateData({ volume: v as number })}
            aria-label="Volume"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-foreground/60 mb-1 block">
              Fade In (s)
            </label>
            <Input
              size="sm"
              type="number"
              min={0}
              step={0.1}
              value={(layer.data.fadeIn / 1000).toFixed(1)}
              onChange={(e) =>
                updateData({ fadeIn: parseFloat(e.target.value) * 1000 })
              }
              aria-label="Fade In"
            />
          </div>
          <div>
            <label className="text-xs text-foreground/60 mb-1 block">
              Fade Out (s)
            </label>
            <Input
              size="sm"
              type="number"
              min={0}
              step={0.1}
              value={(layer.data.fadeOut / 1000).toFixed(1)}
              onChange={(e) =>
                updateData({ fadeOut: parseFloat(e.target.value) * 1000 })
              }
              aria-label="Fade Out"
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
