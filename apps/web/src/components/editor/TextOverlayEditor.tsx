import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Slider,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Divider,
  Badge,
} from "@/components/ui";
import {
  Type,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
} from "lucide-react";
import type { TextOverlay } from "@vibe-creator/shared";
import { useEditorStore } from "@/stores/editor-store";

// Font family options
const FONT_FAMILIES = [
  { id: "Inter", name: "Inter" },
  { id: "Roboto", name: "Roboto" },
  { id: "Poppins", name: "Poppins" },
  { id: "Montserrat", name: "Montserrat" },
  { id: "Open Sans", name: "Open Sans" },
  { id: "Oswald", name: "Oswald" },
  { id: "Playfair Display", name: "Playfair Display" },
  { id: "Bebas Neue", name: "Bebas Neue" },
];

// Animation presets
const ANIMATIONS = [
  { id: "none", name: "None" },
  { id: "fade", name: "Fade In" },
  { id: "slide-up", name: "Slide Up" },
  { id: "slide-down", name: "Slide Down" },
  { id: "typewriter", name: "Typewriter" },
];

// Position presets
const POSITION_PRESETS = [
  { id: "top-left", x: 10, y: 10, label: "Top Left" },
  { id: "top-center", x: 50, y: 10, label: "Top Center" },
  { id: "top-right", x: 90, y: 10, label: "Top Right" },
  { id: "center", x: 50, y: 50, label: "Center" },
  { id: "bottom-left", x: 10, y: 90, label: "Bottom Left" },
  { id: "bottom-center", x: 50, y: 90, label: "Bottom Center" },
  { id: "bottom-right", x: 90, y: 90, label: "Bottom Right" },
];

// Color presets
const COLOR_PRESETS = [
  "#FFFFFF",
  "#000000",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FF6B6B",
  "#4ECDC4",
];

interface TextOverlayEditorProps {
  isOpen: boolean;
  onClose: () => void;
  editingOverlay?: TextOverlay | null;
}

export function TextOverlayEditor({
  isOpen,
  onClose,
  editingOverlay,
}: TextOverlayEditorProps) {
  const { timeline, addTextOverlay, updateTextOverlay } = useEditorStore();

  // Create a key for resetting form state when switching between editing modes
  const overlayKey = editingOverlay?.id ?? (isOpen ? "new" : "closed");

  // Form state - initialized from editingOverlay or defaults
  const [text, setText] = useState(() => editingOverlay?.text ?? "");
  const [fontFamily, setFontFamily] = useState(
    () => editingOverlay?.fontFamily ?? "Inter"
  );
  const [fontSize, setFontSize] = useState(
    () => editingOverlay?.fontSize ?? 48
  );
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">(
    () => editingOverlay?.fontWeight ?? "bold"
  );
  const [fontStyle, setFontStyle] = useState<"normal" | "italic">(
    () => editingOverlay?.fontStyle ?? "normal"
  );
  const [color, setColor] = useState(() => editingOverlay?.color ?? "#FFFFFF");
  const [backgroundColor, setBackgroundColor] = useState(
    () => editingOverlay?.backgroundColor ?? ""
  );
  const [x, setX] = useState(() => editingOverlay?.x ?? 50);
  const [y, setY] = useState(() => editingOverlay?.y ?? 50);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(
    () => editingOverlay?.textAlign ?? "center"
  );
  const [animation, setAnimation] = useState<
    "none" | "fade" | "slide-up" | "slide-down" | "typewriter"
  >(() => editingOverlay?.animation ?? "fade");
  const [startMs, setStartMs] = useState(() => editingOverlay?.startMs ?? 0);
  const [endMs, setEndMs] = useState(
    () => editingOverlay?.endMs ?? Math.min(5000, timeline.durationMs || 5000)
  );

  // Track last overlay key to detect changes and reset form
  const [lastOverlayKey, setLastOverlayKey] = useState(overlayKey);

  // Reset form when switching between editing modes (without useEffect cascading)
  if (overlayKey !== lastOverlayKey) {
    setLastOverlayKey(overlayKey);
    if (editingOverlay) {
      setText(editingOverlay.text);
      setFontFamily(editingOverlay.fontFamily);
      setFontSize(editingOverlay.fontSize);
      setFontWeight(editingOverlay.fontWeight);
      setFontStyle(editingOverlay.fontStyle);
      setColor(editingOverlay.color);
      setBackgroundColor(editingOverlay.backgroundColor || "");
      setX(editingOverlay.x);
      setY(editingOverlay.y);
      setTextAlign(editingOverlay.textAlign);
      setAnimation(editingOverlay.animation);
      setStartMs(editingOverlay.startMs);
      setEndMs(editingOverlay.endMs);
    } else {
      setText("");
      setFontFamily("Inter");
      setFontSize(48);
      setFontWeight("bold");
      setFontStyle("normal");
      setColor("#FFFFFF");
      setBackgroundColor("");
      setX(50);
      setY(50);
      setTextAlign("center");
      setAnimation("fade");
      setStartMs(0);
      setEndMs(Math.min(5000, timeline.durationMs || 5000));
    }
  }

  const handleSave = () => {
    if (!text.trim()) return;

    const overlayData = {
      text,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      color,
      backgroundColor: backgroundColor || undefined,
      x,
      y,
      rotation: 0,
      textAlign,
      startMs,
      endMs,
      animation,
    };

    if (editingOverlay) {
      updateTextOverlay(editingOverlay.id, overlayData);
    } else {
      addTextOverlay(overlayData);
    }

    onClose();
  };

  const applyPositionPreset = (preset: (typeof POSITION_PRESETS)[0]) => {
    setX(preset.x);
    setY(preset.y);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type size={20} />
            {editingOverlay ? "Edit Text Overlay" : "Add Text Overlay"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Text Input */}
          <Textarea
            placeholder="Enter your text..."
            value={text}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setText(e.target.value)
            }
            rows={3}
          />

          <Divider />

          {/* Font Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Font Family
              </label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem
                      key={font.id}
                      value={font.id}
                      style={{ fontFamily: font.id }}
                    >
                      {font.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Font Size</span>
                <span>{fontSize}px</span>
              </div>
              <Slider
                min={12}
                max={120}
                step={2}
                value={[fontSize]}
                onValueChange={(v: number[]) => setFontSize(v[0] ?? 24)}
              />
            </div>
          </div>

          {/* Font Style Toggles */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={fontWeight === "bold" ? "default" : "outline"}
              onClick={() =>
                setFontWeight(fontWeight === "bold" ? "normal" : "bold")
              }
            >
              B
            </Button>
            <Button
              size="sm"
              variant={fontStyle === "italic" ? "default" : "outline"}
              className="italic"
              onClick={() =>
                setFontStyle(fontStyle === "italic" ? "normal" : "italic")
              }
            >
              I
            </Button>
          </div>

          <Divider />

          {/* Colors */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette size={16} />
              <span className="text-sm font-medium">Colors</span>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Text Color</p>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      color === c
                        ? "border-primary scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
                <label className="w-8 h-8 rounded-lg border-2 border-border overflow-hidden cursor-pointer hover:border-primary transition-all relative">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-full h-full"
                    style={{
                      background:
                        "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground mb-2">
                  Background Color (optional)
                </p>
                {backgroundColor && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setBackgroundColor("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  "#000000",
                  "#FFFFFF",
                  "#FF0000",
                  "#00000080",
                  "#FFFFFF80",
                ].map((c) => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      backgroundColor === c
                        ? "border-primary scale-110"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setBackgroundColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>

          <Divider />

          {/* Position */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Position</p>

            <div className="flex gap-2 flex-wrap">
              {POSITION_PRESETS.map((preset) => (
                <Badge
                  key={preset.id}
                  variant={
                    x === preset.x && y === preset.y ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => applyPositionPreset(preset)}
                >
                  {preset.label}
                </Badge>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>X Position</span>
                  <span>{x}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[x]}
                  onValueChange={(v: number[]) => setX(v[0] ?? 50)}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Y Position</span>
                  <span>{y}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[y]}
                  onValueChange={(v: number[]) => setY(v[0] ?? 50)}
                />
              </div>
            </div>
          </div>

          {/* Alignment */}
          <div className="flex gap-2">
            <Button
              size="icon"
              variant={textAlign === "left" ? "default" : "outline"}
              onClick={() => setTextAlign("left")}
            >
              <AlignLeft size={16} />
            </Button>
            <Button
              size="icon"
              variant={textAlign === "center" ? "default" : "outline"}
              onClick={() => setTextAlign("center")}
            >
              <AlignCenter size={16} />
            </Button>
            <Button
              size="icon"
              variant={textAlign === "right" ? "default" : "outline"}
              onClick={() => setTextAlign("right")}
            >
              <AlignRight size={16} />
            </Button>
          </div>

          <Divider />

          {/* Animation */}
          <div className="flex items-center gap-2">
            <Sparkles size={16} />
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Animation</label>
              <Select
                value={animation}
                onValueChange={(v) => setAnimation(v as typeof animation)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIMATIONS.map((anim) => (
                    <SelectItem key={anim.id} value={anim.id}>
                      {anim.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Divider />

          {/* Timing */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Start Time (ms)"
              value={startMs.toString()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setStartMs(parseInt(e.target.value) || 0)
              }
            />
            <Input
              type="number"
              label="End Time (ms)"
              value={endMs.toString()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEndMs(parseInt(e.target.value) || 5000)
              }
            />
          </div>

          {/* Preview */}
          <div
            className="relative bg-black rounded-lg overflow-hidden"
            style={{ aspectRatio: "16/9", minHeight: 200 }}
          >
            <div
              className="absolute transition-all"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
                fontFamily,
                fontSize: `${fontSize * 0.4}px`,
                fontWeight,
                fontStyle,
                color,
                backgroundColor: backgroundColor || "transparent",
                padding: backgroundColor ? "4px 8px" : 0,
                borderRadius: 4,
                textAlign,
                whiteSpace: "pre-wrap",
                maxWidth: "90%",
              }}
            >
              {text || "Preview text..."}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!text.trim()}>
            {editingOverlay ? "Save Changes" : "Add Text"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
