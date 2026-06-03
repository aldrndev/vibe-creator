import type { Layer, TextLayer } from '@vibe-creator/shared';
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Type } from 'lucide-react';
import type { ReactNode } from 'react';
import { EditorFontSelect } from '@/components/editor-font-select';
import { Badge, Button, Card, CardBody, Slider, Textarea } from '@/components/ui';
import {
  createTextBackgroundData,
  resolveTextBackground,
  TEXT_BACKGROUND_DEFAULT_OPACITY,
  TEXT_BACKGROUND_OPACITY_PRESETS,
} from '@/lib/modern-text-background';
import { cn } from '@/lib/utils';

interface TextLayerPropertiesProps {
  readonly layer: TextLayer;
  readonly onUpdate: (updates: Partial<Layer>) => void;
}

const textColors = ['#ffffff', '#111827', '#ff4b1f', '#facc15', '#22c55e', '#38bdf8'] as const;
const backgroundColors = [
  { label: 'None', value: undefined },
  { label: 'Dark', value: '#000000' },
  { label: 'Brand', value: '#ff4b1f' },
  { label: 'Teal', value: '#0f766e' },
] as const;

export function TextLayerProperties({ layer, onUpdate }: Readonly<TextLayerPropertiesProps>) {
  const updateData = (dataUpdates: Partial<TextLayer['data']>) => {
    onUpdate({ data: { ...layer.data, ...dataUpdates } } as Partial<Layer>);
  };
  const resolvedBackground = resolveTextBackground(layer.data);
  const hasBackground = Boolean(resolvedBackground.color);
  const backgroundOpacity = resolvedBackground.opacity ?? TEXT_BACKGROUND_DEFAULT_OPACITY;
  const updateBackgroundOpacity = (opacity: number) => {
    if (!resolvedBackground.color) {
      return;
    }

    updateData(createTextBackgroundData(resolvedBackground.color, opacity));
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-border/40 bg-card/70 backdrop-blur-xl">
      <CardBody className="space-y-4 p-3">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon={<Type size={16} />}>Style</SectionTitle>
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/5 text-[10px] font-black uppercase text-primary"
          >
            Text
          </Badge>
        </div>

        <div className="space-y-2">
          <PanelLabel>Isi teks</PanelLabel>
          <Textarea
            value={layer.data.text}
            placeholder="Ketik teks di sini..."
            className="min-h-16 resize-none rounded-xl border-border/40 bg-background/40 p-2.5 text-sm font-bold leading-relaxed focus-visible:ring-primary/40"
            onChange={(event) => updateData({ text: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <PanelLabel>Font</PanelLabel>
          <EditorFontSelect
            value={layer.data.fontFamily}
            onChange={(fontFamily) => updateData({ fontFamily })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <PanelLabel>Ukuran</PanelLabel>
            <span className="rounded-full bg-muted/20 px-2 py-1 font-mono text-[10px] font-black text-muted-foreground">
              {layer.data.fontSize}px
            </span>
          </div>
          <Slider
            min={16}
            max={140}
            value={[layer.data.fontSize]}
            onValueChange={(value: number[]) =>
              updateData({ fontSize: value[0] ?? layer.data.fontSize })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <ToggleButton
            active={layer.data.fontWeight === 'bold'}
            icon={<Bold size={16} />}
            label="Bold"
            onClick={() =>
              updateData({ fontWeight: layer.data.fontWeight === 'bold' ? 'normal' : 'bold' })
            }
          />
          <ToggleButton
            active={layer.data.fontStyle === 'italic'}
            icon={<Italic size={16} />}
            label="Italic"
            onClick={() =>
              updateData({ fontStyle: layer.data.fontStyle === 'italic' ? 'normal' : 'italic' })
            }
          />
        </div>

        <ColorSwatchRow
          label="Warna teks"
          selectedColor={layer.data.color}
          colors={textColors}
          onSelect={(color) => updateData({ color })}
        />

        <div className="space-y-2">
          <PanelLabel>Background teks</PanelLabel>
          <div className="grid grid-cols-2 gap-2">
            {backgroundColors.map((option) => (
              <Button
                key={option.label}
                type="button"
                variant="ghost"
                className={cn(
                  'h-9 rounded-lg border px-2 text-xs font-black',
                  resolvedBackground.color === option.value ||
                    (!layer.data.backgroundColor && !option.value)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/30 bg-background/25 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
                onClick={() => updateData(createTextBackgroundData(option.value))}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <ColorPickerButton
            label="Custom text background"
            value={resolvedBackground.color ?? '#000000'}
            onChange={(backgroundColor) =>
              updateData(createTextBackgroundData(backgroundColor, backgroundOpacity))
            }
          />
        </div>

        {hasBackground && (
          <div className="space-y-2 rounded-xl border border-border/25 bg-background/15 p-2.5">
            <div className="flex items-center justify-between gap-3">
              <PanelLabel>Opacity</PanelLabel>
              <span className="font-mono text-[10px] font-black text-muted-foreground">
                {Math.round(backgroundOpacity * 100)}%
              </span>
            </div>
            <div className="space-y-4">
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[backgroundOpacity]}
                onValueChange={(value: number[]) =>
                  updateBackgroundOpacity(value[0] ?? backgroundOpacity)
                }
              />
              <div className="flex gap-1.5">
                {TEXT_BACKGROUND_OPACITY_PRESETS.map((preset) => {
                  const isActive = Math.abs(backgroundOpacity - preset.value) < 0.01;

                  return (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={isActive}
                      className={cn(
                        'h-8 flex-1 rounded-lg border px-1.5 text-[9px] font-black transition-all active:scale-95',
                        isActive
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/30 bg-background/25 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                      onClick={(event) => {
                        event.preventDefault();
                        updateBackgroundOpacity(preset.value);
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <PanelLabel>Rata teks</PanelLabel>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: <AlignLeft size={16} />, label: 'Left', value: 'left' },
              { icon: <AlignCenter size={16} />, label: 'Center', value: 'center' },
              { icon: <AlignRight size={16} />, label: 'Right', value: 'right' },
            ].map((option) => (
              <ToggleButton
                key={option.value}
                active={layer.data.textAlign === option.value}
                icon={option.icon}
                label={option.label}
                onClick={() =>
                  updateData({ textAlign: option.value as TextLayer['data']['textAlign'] })
                }
              />
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function ColorSwatchRow({
  colors,
  label,
  onSelect,
  selectedColor,
}: Readonly<{
  colors: readonly string[];
  label: string;
  onSelect: (color: string) => void;
  selectedColor: string;
}>) {
  return (
    <div className="space-y-2">
      <PanelLabel>{label}</PanelLabel>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${label} ${color}`}
            className={cn(
              'h-8 w-8 rounded-lg border transition-all active:scale-95',
              getColorClassName(color),
              selectedColor.toLowerCase() === color
                ? 'border-primary ring-2 ring-primary/25'
                : 'border-border/40 hover:border-primary/50',
            )}
            onClick={() => onSelect(color)}
          />
        ))}
        <ColorPickerButton label={label} value={selectedColor} onChange={onSelect} compact />
      </div>
    </div>
  );
}

function ColorPickerButton({
  compact = false,
  label,
  onChange,
  value,
}: Readonly<{
  compact?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}>) {
  return (
    <label
      className={cn(
        'relative flex cursor-pointer items-center overflow-hidden rounded-lg border border-border/40 bg-background/40 transition-all hover:border-primary/50',
        compact ? 'h-8 w-8 justify-center' : 'h-10 w-full gap-2 px-3',
      )}
    >
      <span className="h-5 w-5 shrink-0 rounded-md bg-gradient-to-br from-primary via-yellow-400 to-sky-400" />
      {!compact && <span className="text-xs font-black text-muted-foreground">Pick color</span>}
      <input
        aria-label={label}
        type="color"
        value={getColorInputValue(value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ToggleButton({
  active,
  icon,
  label,
  onClick,
}: Readonly<{
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}>) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        'h-9 rounded-lg border px-2 text-[10px] font-black transition-all',
        active
          ? 'border-primary bg-primary/10 text-primary hover:bg-primary/15'
          : 'border-border/30 bg-background/25 text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
      onClick={onClick}
    >
      <span className="mr-1.5 shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Button>
  );
}

function PanelLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
      {children}
    </div>
  );
}

function SectionTitle({ children, icon }: Readonly<{ children: ReactNode; icon: ReactNode }>) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
      <span className="text-primary">{icon}</span>
      {children}
    </h3>
  );
}

function getColorInputValue(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
}

function getColorClassName(color: string): string {
  const classes: Record<string, string> = {
    '#ffffff': 'bg-white',
    '#111827': 'bg-slate-900',
    '#ff4b1f': 'bg-primary',
    '#facc15': 'bg-yellow-400',
    '#22c55e': 'bg-green-500',
    '#38bdf8': 'bg-sky-400',
  };

  return classes[color] ?? 'bg-muted';
}
