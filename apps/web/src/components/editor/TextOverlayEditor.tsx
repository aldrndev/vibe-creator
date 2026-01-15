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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
} from "@/components/ui";
import {
  Type,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Timer,
  Layout,
  Check,
} from "lucide-react";
import type { TextOverlay } from "@vibe-creator/shared";
import { useEditorStore } from "@/stores/editor-store";
import { cn } from "@/lib/utils";

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
  { id: "none", name: "No Animation" },
  { id: "fade", name: "Fade Reveal" },
  { id: "slide-up", name: "Slide Up" },
  { id: "slide-down", name: "Slide Down" },
  { id: "typewriter", name: "Typewriter" },
];

// Position presets
const POSITION_PRESETS = [
  { id: "top-left", x: 10, y: 10, label: "TL" },
  { id: "top-center", x: 50, y: 10, label: "TC" },
  { id: "top-right", x: 90, y: 10, label: "TR" },
  { id: "center", x: 50, y: 50, label: "CTR" },
  { id: "bottom-left", x: 10, y: 90, label: "BL" },
  { id: "bottom-center", x: 50, y: 90, label: "BC" },
  { id: "bottom-right", x: 90, y: 90, label: "BR" },
];

// Color presets
const COLOR_PRESETS = [
  "#FFFFFF",
  "#000000",
  "#FF3B30",
  "#4CD964",
  "#007AFF",
  "#FFCC00",
  "#FF9500",
  "#5856D6",
  "#FF2D55",
  "#AF52DE",
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

  const overlayKey = editingOverlay?.id ?? (isOpen ? "new" : "closed");
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

  const [lastOverlayKey, setLastOverlayKey] = useState(overlayKey);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-background/60 backdrop-blur-3xl border-white/10 p-0 overflow-hidden shadow-2xl overflow-y-auto scrollbar-hide">
        <DialogHeader className="p-8 pb-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                <Type size={24} />
              </div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">
                {editingOverlay ? "Edit Overlay" : "New Overlay"}
              </DialogTitle>
            </div>
            <Badge
              variant="outline"
              className="h-6 font-black border-primary/20 bg-primary/5 text-primary"
            >
              TEXT LAYER
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8">
          {/* Content Field */}
          <section className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
              <Type size={12} className="text-primary" />
              Overlay Text Content
            </label>
            <Textarea
              placeholder="Start typing your message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[120px] bg-background/40 border-border/40 rounded-2xl p-6 text-base font-bold resize-none focus:ring-primary/40 focus:border-primary/40 transition-all text-center"
            />
          </section>

          <div className="grid grid-cols-2 gap-8 pt-4">
            {/* Typography */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <Layout size={14} className="text-muted-foreground/40" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Style & Typo
                </h4>
              </div>

              <div className="space-y-4">
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="h-12 bg-background/40 border-border/40 rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background/90 backdrop-blur-xl">
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

                <div className="flex gap-2">
                  {["left", "center", "right"].map((align) => (
                    <Button
                      key={align}
                      size="icon"
                      variant={textAlign === align ? "default" : "outline"}
                      className="flex-1 h-12 rounded-xl"
                      onClick={() => setTextAlign(align as any)}
                    >
                      {align === "left" ? (
                        <AlignLeft size={16} />
                      ) : align === "center" ? (
                        <AlignCenter size={16} />
                      ) : (
                        <AlignRight size={16} />
                      )}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={fontWeight === "bold" ? "default" : "outline"}
                    className="h-12 rounded-xl font-bold"
                    onClick={() =>
                      setFontWeight(fontWeight === "bold" ? "normal" : "bold")
                    }
                  >
                    Bold
                  </Button>
                  <Button
                    variant={fontStyle === "italic" ? "default" : "outline"}
                    className="h-12 rounded-xl italic"
                    onClick={() =>
                      setFontStyle(fontStyle === "italic" ? "normal" : "italic")
                    }
                  >
                    Italic
                  </Button>
                </div>
              </div>
            </section>

            {/* Colors */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <Palette size={14} className="text-muted-foreground/40" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Color Palette
                </h4>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-background/20 rounded-2xl border border-white/5 space-y-4">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/40">
                    Text Color
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        className={cn(
                          "aspect-square rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center",
                          color === c
                            ? "border-primary shadow-lg shadow-primary/20"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                      >
                        {color === c && (
                          <Check
                            size={10}
                            className={cn(
                              c === "#FFFFFF" ? "text-black" : "text-white"
                            )}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-background/20 rounded-2xl border border-white/5 space-y-4">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/40">
                    Backdrop Shadow
                  </p>
                  <div className="flex gap-2">
                    {["", "#000000", "#00000080", "#FFFFFF80"].map((c) => (
                      <button
                        key={c}
                        className={cn(
                          "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center",
                          backgroundColor === c
                            ? "border-primary"
                            : "border-white/10"
                        )}
                        style={{ backgroundColor: c || "transparent" }}
                        onClick={() => setBackgroundColor(c)}
                      >
                        {!c && (
                          <div className="w-4 h-0.5 bg-destructive rotate-45" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-3 gap-8 pt-4">
            {/* Animation */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles size={14} className="text-primary/60" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Animation
                </h4>
              </div>
              <Select
                value={animation}
                onValueChange={(v) => setAnimation(v as any)}
              >
                <SelectTrigger className="h-12 bg-background/40 border-border/40 rounded-xl font-bold text-xs">
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
            </section>

            {/* Duration */}
            <section className="space-y-4 col-span-2">
              <div className="flex items-center gap-3">
                <Timer size={14} className="text-emerald-500/60" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Timing Control
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Input
                    type="number"
                    value={startMs}
                    onChange={(e) => setStartMs(parseInt(e.target.value) || 0)}
                    className="h-12 pl-14 font-black bg-background/40 border-border/40 rounded-xl"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/40">
                    START
                  </span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    value={endMs}
                    onChange={(e) => setEndMs(parseInt(e.target.value) || 0)}
                    className="h-12 pl-14 font-black bg-background/40 border-border/40 rounded-xl"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/40">
                    END
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Position Presets */}
          <section className="space-y-4 pt-4 border-t border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-center">
              Position Presets
            </h4>
            <div className="flex justify-center gap-2 flex-wrap">
              {POSITION_PRESETS.map((preset) => (
                <Badge
                  key={preset.id}
                  variant={
                    x === preset.x && y === preset.y ? "default" : "outline"
                  }
                  className="px-4 py-1.5 cursor-pointer rounded-full text-[10px] font-black transition-all hover:scale-105"
                  onClick={() => {
                    setX(preset.x);
                    setY(preset.y);
                  }}
                >
                  {preset.label}
                </Badge>
              ))}
            </div>
          </section>

          {/* Real-time Preview Area */}
          <div className="relative group/preview mt-4">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-3xl blur opacity-30 group-hover/preview:opacity-50 transition duration-1000"></div>
            <div className="relative bg-black rounded-2xl overflow-hidden border border-white/10 aspect-video flex items-center justify-center shadow-2xl">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
              <div
                className="p-4 transition-all duration-500"
                style={{
                  fontFamily,
                  fontSize: `${fontSize * 0.4}px`,
                  fontWeight,
                  fontStyle,
                  color,
                  backgroundColor: backgroundColor || "transparent",
                  padding: backgroundColor ? "12px 24px" : 0,
                  borderRadius: 12,
                  textAlign,
                  whiteSpace: "pre-wrap",
                  maxWidth: "80%",
                  boxShadow: backgroundColor
                    ? "0 10px 30px rgba(0,0,0,0.5)"
                    : "none",
                  textShadow: !backgroundColor
                    ? "0 4px 12px rgba(0,0,0,0.8)"
                    : "none",
                }}
              >
                {text || "Hello Visual Studio"}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 pt-4 bg-white/5 border-t border-white/5 flex gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px]"
          >
            Abandon
          </Button>
          <Button
            onClick={handleSave}
            disabled={!text.trim()}
            className="h-12 flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            {editingOverlay ? "Flush Changes" : "Deploy Text Layer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
