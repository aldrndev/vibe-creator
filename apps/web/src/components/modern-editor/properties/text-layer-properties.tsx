import type { Layer, TextLayer } from '@vibe-creator/shared';
import {
  Badge,
  Card,
  CardBody,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { parseFiniteNumber } from './property-number';

interface TextLayerPropertiesProps {
  layer: TextLayer;
  onUpdate: (updates: Partial<Layer>) => void;
}

export function TextLayerProperties({ layer, onUpdate }: Readonly<TextLayerPropertiesProps>) {
  const updateData = (dataUpdates: Partial<TextLayer['data']>) => {
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
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Content
          </div>
          <textarea
            value={layer.data.text}
            placeholder="Ketik teks di sini..."
            className="w-full min-h-[100px] p-4 bg-background/40 border border-border/40 focus:border-primary/40 focus:ring-1 focus:ring-primary/40 rounded-2xl outline-none text-sm font-bold transition-all resize-none"
            onChange={(event) => updateData({ text: event.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Font Family
            </div>
            <Select
              value={layer.data.fontFamily}
              onValueChange={(value) => updateData({ fontFamily: value })}
            >
              <SelectTrigger className="bg-background/40 border-border/40 h-12 rounded-2xl font-bold text-xs uppercase tracking-widest focus:ring-1 focus:ring-primary/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Inter', 'Arial', 'Impact', 'Georgia', 'Courier New'].map((font) => (
                  <SelectItem key={font} value={font} className="text-xs font-bold">
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Font Style
            </div>
            <Select
              value={layer.data.fontStyle}
              onValueChange={(value) =>
                updateData({ fontStyle: value as TextLayer['data']['fontStyle'] })
              }
            >
              <SelectTrigger className="bg-background/40 border-border/40 h-12 rounded-2xl font-bold text-xs uppercase tracking-widest focus:ring-1 focus:ring-primary/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal" className="text-xs font-bold uppercase">
                  Normal
                </SelectItem>
                <SelectItem value="italic" className="text-xs font-bold uppercase">
                  Italic
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Font Size
            </div>
            <div className="flex items-center bg-background/40 border border-border/40 h-12 rounded-2xl overflow-hidden px-4 gap-2 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/40 transition-all">
              <input
                type="number"
                min={8}
                max={200}
                value={layer.data.fontSize}
                className="bg-transparent border-none focus:ring-0 p-0 h-full font-bold text-sm w-full outline-none"
                onChange={(event) =>
                  updateData({
                    fontSize: parseFiniteNumber(event.target.value, layer.data.fontSize),
                  })
                }
              />
              <span className="text-[10px] font-black text-muted-foreground/40">PX</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Weight
            </div>
            <Select
              value={layer.data.fontWeight}
              onValueChange={(value) => updateData({ fontWeight: value as 'normal' | 'bold' })}
            >
              <SelectTrigger className="bg-background/40 border-border/40 h-12 rounded-2xl font-bold text-xs uppercase tracking-widest focus:ring-1 focus:ring-primary/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal" className="text-xs font-bold uppercase">
                  Normal
                </SelectItem>
                <SelectItem value="bold" className="text-xs font-black uppercase">
                  Bold
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Color
            </div>
            <div className="flex items-center gap-3 bg-background/40 border border-border/40 h-12 rounded-2xl px-3 group transition-all focus-within:border-primary/40 focus-within:ring-1 focus:ring-primary/40">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-border/20 shrink-0">
                <input
                  type="color"
                  value={layer.data.color}
                  onChange={(event) => updateData({ color: event.target.value })}
                  className="absolute inset-[-10px] w-[200%] h-[200%] cursor-pointer"
                />
              </div>
              <span className="text-[10px] font-mono font-black text-muted-foreground/60 group-hover:text-primary transition-colors">
                {layer.data.color.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Animation
            </div>
            <Select
              value={layer.data.animation}
              onValueChange={(value) =>
                updateData({ animation: value as TextLayer['data']['animation'] })
              }
            >
              <SelectTrigger className="bg-background/40 border-border/40 h-12 rounded-2xl font-bold text-xs uppercase tracking-widest focus:ring-1 focus:ring-primary/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  { label: 'None', value: 'none' },
                  { label: 'Fade In', value: 'fade' },
                  { label: 'Slide Up', value: 'slide-up' },
                  { label: 'Slide Down', value: 'slide-down' },
                  { label: 'Typewriter', value: 'typewriter' },
                ].map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-xs font-bold uppercase"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Background
          </div>
          <div className="flex items-center gap-3 bg-background/40 border border-border/40 h-12 rounded-2xl px-3 group transition-all focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/40">
            <Input
              value={layer.data.backgroundColor ?? ''}
              placeholder="transparent, #000000, rgba(0,0,0,0.7)"
              className="bg-transparent border-none focus:ring-0 h-9 font-mono font-bold text-xs"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                updateData({ backgroundColor: event.target.value || undefined })
              }
            />
          </div>
        </div>

        <div className="space-y-6 pt-2 border-t border-border/10">
          <div className="space-y-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Position Presets
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Top', x: 50, y: 15, w: 90, h: 12 },
                { label: 'Center', x: 50, y: 50, w: 80, h: 20 },
                { label: 'Bottom', x: 50, y: 85, w: 90, h: 12 },
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
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Text Alignment
            </div>
            <div className="flex bg-muted/20 p-1.5 rounded-2xl gap-2 border border-border/10">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => updateData({ textAlign: align })}
                  className={cn(
                    'flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300',
                    layer.data.textAlign === align
                      ? 'bg-primary text-primary-foreground scale-[1.02]'
                      : 'text-muted-foreground/60 hover:bg-white/5 hover:text-muted-foreground',
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
