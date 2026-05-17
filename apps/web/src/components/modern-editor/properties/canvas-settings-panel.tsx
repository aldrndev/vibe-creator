import type { ModernProjectSettings } from '@vibe-creator/shared';
import { Image, Palette } from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';
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
  Slider,
} from '@/components/ui';
import { canvasBackgroundPresets, canvasFormatPresets } from '@/lib/modern-editor-preset-catalog';
import { cn } from '@/lib/utils';
import { resolveModernProjectSettings } from '@/stores/modern-editor-store-helpers';
import { AdvancedDisclosure } from './advanced-disclosure';
import { parseFiniteNumber } from './property-number';

interface CanvasSettingsPanelProps {
  readonly className?: string;
  readonly compactEmpty: boolean;
  readonly onUpdateSettings: (settings: Partial<ModernProjectSettings>) => void;
  readonly settings: ModernProjectSettings;
}

export function CanvasSettingsPanel({
  className,
  compactEmpty,
  onUpdateSettings,
  settings,
}: CanvasSettingsPanelProps) {
  const canvasSettings = resolveModernProjectSettings(settings);
  const selectedPreset = canvasFormatPresets.find(
    (option) => option.width === canvasSettings.width && option.height === canvasSettings.height,
  );

  return (
    <div className={cn('space-y-5', className)}>
      <Card className="overflow-hidden border-border/40 bg-card/70 backdrop-blur-xl">
        <CardBody className={cn('space-y-5', compactEmpty ? 'p-4' : 'p-5')}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black tracking-tight">Canvas</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {canvasSettings.width} x {canvasSettings.height}
              </p>
            </div>
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
              {selectedPreset?.helper ?? 'Custom'}
            </Badge>
          </div>

          <div className="space-y-2">
            <PanelLabel>Format</PanelLabel>
            <div className="grid grid-cols-2 gap-2">
              {canvasFormatPresets.map((preset) => {
                const isSelected =
                  preset.width === canvasSettings.width && preset.height === canvasSettings.height;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={cn(
                      'rounded-2xl border bg-background/25 p-2 text-left transition-all active:scale-[0.99]',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/35 text-muted-foreground hover:border-primary/45 hover:text-foreground',
                    )}
                    onClick={() => onUpdateSettings({ width: preset.width, height: preset.height })}
                  >
                    <div className="flex h-16 items-center justify-center rounded-xl border border-border/25 bg-card/45">
                      <span
                        className={cn(
                          'block max-h-12 w-8 rounded-md border border-current bg-current/20',
                          preset.previewClassName,
                        )}
                      />
                    </div>
                    <p className="mt-2 text-xs font-black text-foreground">{preset.label}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">{preset.helper}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <PanelLabel>Background</PanelLabel>
            <div className="grid grid-cols-2 gap-2">
              {canvasBackgroundPresets.map((preset) => {
                const isSelected =
                  preset.settings.backgroundMode === canvasSettings.backgroundMode &&
                  (preset.settings.backgroundMode === 'blur' ||
                    preset.settings.backgroundColor === canvasSettings.backgroundColor);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={cn(
                      'rounded-2xl border bg-background/25 p-2 text-left transition-all active:scale-[0.99]',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border/35 hover:border-primary/45 hover:bg-primary/5',
                    )}
                    onClick={() => onUpdateSettings(preset.settings)}
                  >
                    <div
                      className={cn(
                        'flex h-14 items-center justify-center rounded-xl border border-white/10',
                        preset.previewClassName,
                      )}
                    >
                      {preset.settings.backgroundMode === 'blur' ? (
                        <Image size={17} className="text-white drop-shadow" />
                      ) : (
                        <Palette size={17} className="text-white drop-shadow" />
                      )}
                    </div>
                    <p className="mt-2 text-xs font-black text-foreground">{preset.label}</p>
                    <p className="line-clamp-2 text-[10px] font-semibold leading-snug text-muted-foreground/75">
                      {preset.helper}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {canvasSettings.backgroundMode === 'blur' ? (
            <div className="space-y-3 rounded-2xl border border-border/30 bg-background/20 p-3">
              <SliderRow
                label="Blur"
                max={40}
                min={0}
                value={canvasSettings.backgroundBlurAmount ?? 18}
                onChange={(backgroundBlurAmount) => onUpdateSettings({ backgroundBlurAmount })}
              />
              <SliderRow
                label="Zoom"
                max={1.35}
                min={1}
                step={0.01}
                value={canvasSettings.backgroundBlurZoom ?? 1.08}
                valueLabel={`${Math.round((canvasSettings.backgroundBlurZoom ?? 1.08) * 100)}%`}
                onChange={(backgroundBlurZoom) => onUpdateSettings({ backgroundBlurZoom })}
              />
              <SliderRow
                label="Dim"
                max={0.5}
                min={0}
                step={0.01}
                value={canvasSettings.backgroundDim ?? 0.08}
                valueLabel={`${Math.round((canvasSettings.backgroundDim ?? 0.08) * 100)}%`}
                onChange={(backgroundDim) => onUpdateSettings({ backgroundDim })}
              />
              <SliderRow
                label="Saturation"
                max={1.8}
                min={0}
                step={0.05}
                value={canvasSettings.backgroundSaturation ?? 1.05}
                valueLabel={`${Math.round((canvasSettings.backgroundSaturation ?? 1.05) * 100)}%`}
                onChange={(backgroundSaturation) => onUpdateSettings({ backgroundSaturation })}
              />
            </div>
          ) : (
            <div className="flex h-11 items-center gap-2 rounded-xl border border-border/30 bg-background/30 px-2">
              <input
                aria-label="Custom background color"
                type="color"
                value={canvasSettings.backgroundColor}
                onChange={(event) => onUpdateSettings({ backgroundColor: event.target.value })}
                className="h-8 w-8 cursor-pointer rounded-lg border-none bg-transparent"
              />
              <Input
                value={canvasSettings.backgroundColor}
                className="h-8 border-none bg-transparent font-mono text-xs font-bold focus:ring-0"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  onUpdateSettings({ backgroundColor: event.target.value })
                }
              />
            </div>
          )}

          <AdvancedDisclosure title="Advanced Canvas">
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Width"
                value={canvasSettings.width}
                onChange={(width) => onUpdateSettings({ width })}
              />
              <NumberField
                label="Height"
                value={canvasSettings.height}
                onChange={(height) => onUpdateSettings({ height })}
              />
            </div>
            <div className="space-y-3">
              <PanelLabel>Frame Rate</PanelLabel>
              <Select
                value={canvasSettings.fps.toString()}
                onValueChange={(value) =>
                  onUpdateSettings({ fps: Number(value) as typeof canvasSettings.fps })
                }
              >
                <SelectTrigger className="h-11 rounded-xl border-border/40 bg-background/40 text-xs font-bold uppercase tracking-tight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[24, 30, 60].map((fps) => (
                    <SelectItem key={fps} value={fps.toString()} className="text-xs font-bold">
                      {fps} FPS
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AdvancedDisclosure>
        </CardBody>
      </Card>
    </div>
  );
}

function SliderRow({
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
  valueLabel,
}: Readonly<{
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
  valueLabel?: string;
}>) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <PanelLabel>{label}</PanelLabel>
        <span className="rounded-full bg-muted/20 px-2 py-1 font-mono text-[10px] font-black text-muted-foreground">
          {valueLabel ?? value.toFixed(0)}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(nextValue: number[]) => onChange(nextValue[0] ?? value)}
      />
    </div>
  );
}

function PanelLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
      {children}
    </div>
  );
}

function NumberField({
  label,
  onChange,
  value,
}: Readonly<{
  label: string;
  onChange: (value: number) => void;
  value: number;
}>) {
  return (
    <div className="space-y-3">
      <PanelLabel>{label}</PanelLabel>
      <Input
        type="number"
        value={value.toString()}
        className="h-11 rounded-xl border-border/40 bg-background/40 text-center text-xs font-bold uppercase tracking-tight"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(parseFiniteNumber(event.target.value, value))
        }
      />
    </div>
  );
}
