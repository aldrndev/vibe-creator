import {
  Card,
  CardBody,
  Slider,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Divider,
  Button,
} from "@/components/ui";
import {
  Settings2,
  Move,
  RotateCw,
  Maximize2,
  Eye,
  Volume2,
  VolumeX,
  Gauge,
  Palette,
  Film,
  Unlink,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { clsx } from "clsx";

// Filter presets
const FILTER_PRESETS = [
  { id: "none", name: "None", css: "" },
  { id: "grayscale", name: "B&W", css: "grayscale(100%)" },
  { id: "sepia", name: "Sepia", css: "sepia(100%)" },
  {
    id: "vintage",
    name: "Vintage",
    css: "sepia(50%) contrast(1.1) brightness(0.9)",
  },
  { id: "cold", name: "Cold", css: "saturate(0.8) hue-rotate(180deg)" },
  { id: "warm", name: "Warm", css: "saturate(1.2) sepia(20%)" },
  { id: "high-contrast", name: "High Contrast", css: "contrast(1.4)" },
  {
    id: "fade",
    name: "Fade",
    css: "contrast(0.9) brightness(1.1) saturate(0.8)",
  },
  { id: "vivid", name: "Vivid", css: "saturate(1.5) contrast(1.1)" },
];

// Speed presets
const SPEED_PRESETS = [
  { value: 0.25, label: "0.25x" },
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x (Normal)" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x" },
];

interface InspectorPanelProps {
  className?: string;
}

export function InspectorPanel({ className }: InspectorPanelProps) {
  const { timeline, selectedClipId, updateClip, detachLinkedClips } =
    useEditorStore();

  // Find selected clip and its track type
  let selectedClip = null;
  let selectedTrackId: string | null = null;
  let selectedTrackType: "VIDEO" | "AUDIO" | "TEXT" | "OVERLAY" | null = null;

  for (const track of timeline.tracks) {
    const clip = track.clips.find((c) => c.id === selectedClipId);
    if (clip) {
      selectedClip = clip;
      selectedTrackId = track.id;
      selectedTrackType = track.type;
      break;
    }
  }

  const handleTransformChange = (key: string, value: number) => {
    if (!selectedTrackId || !selectedClipId || !selectedClip) return;

    const currentTransforms = selectedClip.transforms || {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    };
    updateClip(selectedTrackId, selectedClipId, {
      transforms: {
        x: currentTransforms.x,
        y: currentTransforms.y,
        scale: currentTransforms.scale,
        rotation: currentTransforms.rotation,
        opacity: currentTransforms.opacity,
        [key]: value,
      },
    });
  };

  const handleEffectChange = (
    key: string,
    value: number | string | string[]
  ) => {
    if (!selectedTrackId || !selectedClipId || !selectedClip) return;

    const currentEffects = selectedClip.effects || {
      filters: [],
      speed: 1,
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
    };
    updateClip(selectedTrackId, selectedClipId, {
      effects: {
        filters: currentEffects.filters,
        speed: currentEffects.speed,
        volume: currentEffects.volume,
        fadeIn: currentEffects.fadeIn,
        fadeOut: currentEffects.fadeOut,
        [key]: value,
      },
    });
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
  };

  if (!selectedClip) {
    return (
      <div
        className={clsx(
          "w-72 bg-card border-l border-border flex flex-col",
          className
        )}
      >
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings2 size={18} />
            Inspector
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Pilih clip di timeline untuk melihat properti
          </p>
        </div>
      </div>
    );
  }

  const transforms = selectedClip.transforms || {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
  };
  const effects = selectedClip.effects || {
    filters: [],
    speed: 1,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
  };
  const isMuted = effects.volume === 0;
  const currentFilter = effects.filters?.[0] || "none";

  return (
    <div
      className={clsx(
        "w-72 bg-card border-l border-border flex flex-col overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <h3 className="font-semibold flex items-center gap-2">
          <Settings2 size={18} />
          Inspector
        </h3>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Clip Info */}
        <Card className="bg-muted">
          <CardBody className="p-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded flex items-center justify-center ${
                  selectedTrackType === "AUDIO"
                    ? "bg-green-500/20"
                    : "bg-primary/20"
                }`}
              >
                {selectedTrackType === "AUDIO" ? (
                  <Volume2 size={20} className="text-green-500" />
                ) : (
                  <Film size={20} className="text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {selectedClip.asset?.name || "Untitled Clip"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedTrackType === "AUDIO" ? "Audio" : "Video"} •{" "}
                  {formatTime(selectedClip.endMs - selectedClip.startMs)}
                  {selectedClip.linkId && " • Linked"}
                </p>
              </div>
            </div>
            {/* Detach button for linked clips */}
            {selectedClip.linkId && (
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3"
                onClick={() => {
                  if (selectedClipId) {
                    detachLinkedClips(selectedClipId);
                  }
                }}
              >
                <Unlink size={14} />
                Detach Audio
              </Button>
            )}
          </CardBody>
        </Card>

        <Divider />

        {/* Transform Section - VIDEO ONLY */}
        {selectedTrackType !== "AUDIO" && (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Move size={14} />
                Transform
              </h4>

              <div className="space-y-4">
                {/* Position X */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Position X</span>
                    <span>{Math.round(transforms.x)}px</span>
                  </div>
                  <Slider
                    min={-500}
                    max={500}
                    step={1}
                    value={[transforms.x ?? 0]}
                    onValueChange={(v: number[]) =>
                      handleTransformChange("x", v[0] ?? 0)
                    }
                  />
                </div>

                {/* Position Y */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Position Y</span>
                    <span>{Math.round(transforms.y)}px</span>
                  </div>
                  <Slider
                    min={-500}
                    max={500}
                    step={1}
                    value={[transforms.y ?? 0]}
                    onValueChange={(v: number[]) =>
                      handleTransformChange("y", v[0] ?? 0)
                    }
                  />
                </div>

                {/* Scale */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Maximize2 size={12} />
                      Scale
                    </span>
                    <span>{Math.round(transforms.scale * 100)}%</span>
                  </div>
                  <Slider
                    min={0.1}
                    max={3}
                    step={0.01}
                    value={[transforms.scale ?? 1]}
                    onValueChange={(v: number[]) =>
                      handleTransformChange("scale", v[0] ?? 1)
                    }
                  />
                </div>

                {/* Rotation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <RotateCw size={12} />
                      Rotation
                    </span>
                    <span>{Math.round(transforms.rotation)}°</span>
                  </div>
                  <Slider
                    min={-180}
                    max={180}
                    step={1}
                    value={[transforms.rotation ?? 0]}
                    onValueChange={(v: number[]) =>
                      handleTransformChange("rotation", v[0] ?? 0)
                    }
                  />
                </div>

                {/* Opacity */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Eye size={12} />
                      Opacity
                    </span>
                    <span>{Math.round(transforms.opacity * 100)}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={[transforms.opacity ?? 1]}
                    onValueChange={(v: number[]) =>
                      handleTransformChange("opacity", v[0] ?? 1)
                    }
                  />
                </div>
              </div>
            </div>

            <Divider />
          </>
        )}

        {/* Audio Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Volume2 size={14} />
            Audio
          </h4>

          <div className="space-y-4">
            {/* Volume */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  Volume
                </span>
                <div className="flex items-center gap-2">
                  <span>
                    {isMuted ? "Muted" : `${Math.round(effects.volume * 100)}%`}
                  </span>
                  <Switch
                    checked={!isMuted}
                    onCheckedChange={(checked) =>
                      handleEffectChange("volume", checked ? 1 : 0)
                    }
                  />
                </div>
              </div>
              <Slider
                min={0}
                max={2}
                step={0.01}
                value={[effects.volume ?? 1]}
                onValueChange={(v: number[]) =>
                  handleEffectChange("volume", v[0] ?? 1)
                }
                disabled={isMuted}
              />
            </div>

            {/* Fade In */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fade In</span>
                <span>{effects.fadeIn}ms</span>
              </div>
              <Slider
                min={0}
                max={2000}
                step={100}
                value={[effects.fadeIn ?? 0]}
                onValueChange={(v: number[]) =>
                  handleEffectChange("fadeIn", v[0] ?? 0)
                }
              />
            </div>

            {/* Fade Out */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fade Out</span>
                <span>{effects.fadeOut}ms</span>
              </div>
              <Slider
                min={0}
                max={2000}
                step={100}
                value={[effects.fadeOut ?? 0]}
                onValueChange={(v: number[]) =>
                  handleEffectChange("fadeOut", v[0] ?? 0)
                }
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* Effects Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Palette size={14} />
            Effects
          </h4>

          <div className="space-y-4">
            {/* Speed */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Gauge size={12} />
                  Speed
                </span>
              </div>
              <Select
                value={effects.speed.toString()}
                onValueChange={(v) =>
                  handleEffectChange("speed", parseFloat(v))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPEED_PRESETS.map((preset) => (
                    <SelectItem
                      key={preset.value.toString()}
                      value={preset.value.toString()}
                    >
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter - VIDEO ONLY */}
            {selectedTrackType !== "AUDIO" && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Filter</span>
                </div>
                <Select
                  value={currentFilter}
                  onValueChange={(v) =>
                    handleEffectChange("filters", v === "none" ? [] : [v])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_PRESETS.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export filter presets for use in VideoPreview
export { FILTER_PRESETS };
