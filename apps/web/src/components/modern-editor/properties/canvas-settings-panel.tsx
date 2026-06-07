import type { CanvasBackgroundMode, ModernProjectSettings } from '@vibe-creator/shared';
import type { ChangeEvent, ReactNode } from 'react';
import { useState } from 'react';
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
import { getImageBackgroundActivation } from '@/lib/modern-editor-asset-library';
import {
  type CanvasBackgroundPreset,
  canvasBackgroundPresets,
  canvasFormatPresets,
} from '@/lib/modern-editor-preset-catalog';
import { cn } from '@/lib/utils';
import type { EditorAsset } from '@/stores/editor-store';
import { resolveModernProjectSettings } from '@/stores/modern-editor-store-helpers';
import { AdvancedDisclosure } from './advanced-disclosure';
import { BackgroundImagePickerDialog } from './background-image-picker-dialog';
import { BackgroundModeControl } from './background-mode-control';
import { CanvasBackgroundImageControls } from './canvas-background-image-controls';
import { parseFiniteNumber } from './property-number';

interface CanvasSettingsPanelProps {
  readonly className?: string;
  readonly compactEmpty: boolean;
  readonly assets: readonly EditorAsset[];
  readonly onRemoveAsset: (assetId: string) => void;
  readonly onUpdateSettings: (settings: Partial<ModernProjectSettings>) => void;
  readonly settings: ModernProjectSettings;
}

export function CanvasSettingsPanel({
  className,
  compactEmpty,
  assets,
  onRemoveAsset,
  onUpdateSettings,
  settings,
}: CanvasSettingsPanelProps) {
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [backgroundNotice, setBackgroundNotice] = useState<string | null>(null);
  const canvasSettings = resolveModernProjectSettings(settings);
  const selectedPreset = canvasFormatPresets.find(
    (option) => option.width === canvasSettings.width && option.height === canvasSettings.height,
  );
  const activeBackgroundAsset = assets.find(
    (asset) => asset.id === canvasSettings.backgroundImageAssetId && asset.type === 'IMAGE',
  );
  const colorPresets = canvasBackgroundPresets.filter(
    (preset) => preset.settings.backgroundMode === 'solid',
  );
  const gradientPresets = canvasBackgroundPresets.filter(
    (preset) => preset.settings.backgroundMode === 'gradient',
  );

  const changeBackgroundMode = (mode: CanvasBackgroundMode) => {
    setBackgroundNotice(null);
    if (mode !== 'image') {
      onUpdateSettings({ backgroundMode: mode });
      return;
    }

    const activation = getImageBackgroundActivation(activeBackgroundAsset);
    if (activation) {
      onUpdateSettings(activation);
      return;
    }

    setIsImagePickerOpen(true);
  };

  const useBackgroundImage = (asset: EditorAsset) => {
    onUpdateSettings({ backgroundMode: 'image', backgroundImageAssetId: asset.id });
    setBackgroundNotice(null);
    setIsImagePickerOpen(false);
  };

  const removeActiveBackground = () => {
    onUpdateSettings({
      backgroundMode: 'solid',
      backgroundColor: '#000000',
      backgroundImageAssetId: null,
    });
    setBackgroundNotice('Background dilepas. Gambar tetap tersimpan untuk dipakai kembali.');
  };

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
                    aria-pressed={isSelected}
                    className={cn(
                      'relative rounded-xl border bg-background/20 p-2.5 text-left transition-all active:scale-[0.99]',
                      isSelected
                        ? 'border-primary/80 bg-primary/[0.07]'
                        : 'border-border/35 text-muted-foreground hover:border-primary/45 hover:text-foreground',
                    )}
                    onClick={() => onUpdateSettings({ width: preset.width, height: preset.height })}
                  >
                    <div className="flex h-11 items-center justify-center rounded-lg bg-card/45">
                      <span
                        className={cn(
                          'block max-h-9 w-7 rounded border border-muted-foreground/70 bg-muted-foreground/15',
                          preset.previewClassName,
                        )}
                      />
                    </div>
                    <div className="mt-2 pr-2">
                      <p className="whitespace-nowrap text-xs font-black text-foreground">
                        {preset.label}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold text-muted-foreground">
                        {preset.helper}
                      </p>
                    </div>
                    {isSelected && (
                      <span
                        aria-hidden="true"
                        className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-primary"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <PanelLabel>Background</PanelLabel>
            <BackgroundModeControl
              value={canvasSettings.backgroundMode}
              onChange={changeBackgroundMode}
            />
            {backgroundNotice && (
              <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                {backgroundNotice}
              </p>
            )}
          </div>

          <BackgroundModeSettings
            canvasSettings={canvasSettings}
            activeBackgroundAsset={activeBackgroundAsset}
            setIsImagePickerOpen={setIsImagePickerOpen}
            removeActiveBackground={removeActiveBackground}
            onUpdateSettings={onUpdateSettings}
            gradientPresets={gradientPresets}
            colorPresets={colorPresets}
          />

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
            {canvasSettings.backgroundMode === 'gradient' && (
              <div className="space-y-3">
                <PanelLabel>Custom Gradient</PanelLabel>
                <div className="grid grid-cols-2 gap-3">
                  <ColorField
                    label="Gradient from"
                    value={canvasSettings.backgroundGradientFrom ?? '#111827'}
                    onChange={(backgroundGradientFrom) =>
                      onUpdateSettings({ backgroundGradientFrom })
                    }
                  />
                  <ColorField
                    label="Gradient to"
                    value={canvasSettings.backgroundGradientTo ?? '#ff4b1f'}
                    onChange={(backgroundGradientTo) => onUpdateSettings({ backgroundGradientTo })}
                  />
                </div>
                <SliderRow
                  label="Angle"
                  max={360}
                  min={0}
                  value={canvasSettings.backgroundGradientAngle ?? 135}
                  valueLabel={`${Math.round(canvasSettings.backgroundGradientAngle ?? 135)}°`}
                  onChange={(backgroundGradientAngle) =>
                    onUpdateSettings({ backgroundGradientAngle })
                  }
                />
              </div>
            )}
            {canvasSettings.backgroundMode === 'image' && (
              <div className="space-y-3">
                <PanelLabel>Image Background</PanelLabel>
                <ColorField
                  label="Fallback background color"
                  value={canvasSettings.backgroundColor}
                  onChange={(backgroundColor) => onUpdateSettings({ backgroundColor })}
                />
                <SliderRow
                  label="Position X"
                  max={100}
                  min={0}
                  value={canvasSettings.backgroundImagePositionX ?? 50}
                  valueLabel={`${Math.round(canvasSettings.backgroundImagePositionX ?? 50)}%`}
                  onChange={(backgroundImagePositionX) =>
                    onUpdateSettings({ backgroundImagePositionX })
                  }
                />
                <SliderRow
                  label="Position Y"
                  max={100}
                  min={0}
                  value={canvasSettings.backgroundImagePositionY ?? 50}
                  valueLabel={`${Math.round(canvasSettings.backgroundImagePositionY ?? 50)}%`}
                  onChange={(backgroundImagePositionY) =>
                    onUpdateSettings({ backgroundImagePositionY })
                  }
                />
                <SliderRow
                  label="Scale"
                  max={2}
                  min={1}
                  step={0.01}
                  value={canvasSettings.backgroundImageScale ?? 1}
                  valueLabel={`${Math.round((canvasSettings.backgroundImageScale ?? 1) * 100)}%`}
                  onChange={(backgroundImageScale) => onUpdateSettings({ backgroundImageScale })}
                />
              </div>
            )}
          </AdvancedDisclosure>
        </CardBody>
      </Card>
      <BackgroundImagePickerDialog
        activeAssetId={canvasSettings.backgroundImageAssetId}
        assets={assets}
        open={isImagePickerOpen}
        onOpenChange={setIsImagePickerOpen}
        onUseAsset={useBackgroundImage}
        onRemoveAsset={onRemoveAsset}
        onActiveAssetDeleted={() => {
          setBackgroundNotice('Background dilepas karena gambar yang dipakai telah dihapus.');
        }}
      />
    </div>
  );
}

function BackgroundBlurSettings({
  canvasSettings,
  onUpdateSettings,
}: {
  canvasSettings: ModernProjectSettings;
  onUpdateSettings: (settings: Partial<ModernProjectSettings>) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/30 bg-background/20 p-3">
      <SliderRow
        label="Opacity"
        max={1}
        min={0}
        step={0.01}
        value={canvasSettings.backgroundOpacity ?? 1}
        valueLabel={`${Math.round((canvasSettings.backgroundOpacity ?? 1) * 100)}%`}
        onChange={(backgroundOpacity) => onUpdateSettings({ backgroundOpacity })}
      />
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
  );
}

function BackgroundGradientSettings({
  canvasSettings,
  gradientPresets,
  onUpdateSettings,
}: {
  canvasSettings: ModernProjectSettings;
  gradientPresets: readonly CanvasBackgroundPreset[];
  onUpdateSettings: (settings: Partial<ModernProjectSettings>) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/30 bg-background/20 p-3">
      <BackgroundPresetGrid
        presets={gradientPresets}
        settings={canvasSettings}
        onSelect={onUpdateSettings}
      />
      <SliderRow
        label="Opacity"
        max={1}
        min={0}
        step={0.01}
        value={canvasSettings.backgroundOpacity ?? 1}
        valueLabel={`${Math.round((canvasSettings.backgroundOpacity ?? 1) * 100)}%`}
        onChange={(backgroundOpacity) => onUpdateSettings({ backgroundOpacity })}
      />
    </div>
  );
}

function BackgroundSolidSettings({
  canvasSettings,
  colorPresets,
  onUpdateSettings,
}: {
  canvasSettings: ModernProjectSettings;
  colorPresets: readonly CanvasBackgroundPreset[];
  onUpdateSettings: (settings: Partial<ModernProjectSettings>) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/30 bg-background/20 p-3">
      <BackgroundPresetGrid
        presets={colorPresets}
        settings={canvasSettings}
        onSelect={onUpdateSettings}
      />
      <ColorField
        label="Custom background color"
        value={canvasSettings.backgroundColor}
        onChange={(backgroundColor) => onUpdateSettings({ backgroundColor })}
      />
      <SliderRow
        label="Opacity"
        max={1}
        min={0}
        step={0.01}
        value={canvasSettings.backgroundOpacity ?? 1}
        valueLabel={`${Math.round((canvasSettings.backgroundOpacity ?? 1) * 100)}%`}
        onChange={(backgroundOpacity) => onUpdateSettings({ backgroundOpacity })}
      />
    </div>
  );
}

function BackgroundModeSettings({
  canvasSettings,
  activeBackgroundAsset,
  setIsImagePickerOpen,
  removeActiveBackground,
  onUpdateSettings,
  gradientPresets,
  colorPresets,
}: {
  canvasSettings: ModernProjectSettings;
  activeBackgroundAsset?: EditorAsset;
  setIsImagePickerOpen: (open: boolean) => void;
  removeActiveBackground: () => void;
  onUpdateSettings: (settings: Partial<ModernProjectSettings>) => void;
  gradientPresets: readonly CanvasBackgroundPreset[];
  colorPresets: readonly CanvasBackgroundPreset[];
}) {
  if (canvasSettings.backgroundMode === 'image') {
    return (
      <CanvasBackgroundImageControls
        activeAsset={activeBackgroundAsset}
        settings={canvasSettings}
        onOpenPicker={() => setIsImagePickerOpen(true)}
        onRemove={removeActiveBackground}
        onUpdateSettings={onUpdateSettings}
      />
    );
  }
  if (canvasSettings.backgroundMode === 'blur') {
    return (
      <BackgroundBlurSettings canvasSettings={canvasSettings} onUpdateSettings={onUpdateSettings} />
    );
  }
  if (canvasSettings.backgroundMode === 'gradient') {
    return (
      <BackgroundGradientSettings
        canvasSettings={canvasSettings}
        gradientPresets={gradientPresets}
        onUpdateSettings={onUpdateSettings}
      />
    );
  }
  return (
    <BackgroundSolidSettings
      canvasSettings={canvasSettings}
      colorPresets={colorPresets}
      onUpdateSettings={onUpdateSettings}
    />
  );
}

function BackgroundPresetGrid({
  onSelect,
  presets,
  settings,
}: Readonly<{
  onSelect: (settings: Partial<ModernProjectSettings>) => void;
  presets: readonly CanvasBackgroundPreset[];
  settings: ModernProjectSettings;
}>) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={cn(
            'rounded-xl border p-1.5 text-left transition-colors',
            isBackgroundPresetSelected(preset, settings)
              ? 'border-primary bg-primary/10'
              : 'border-border/35 hover:border-primary/45 hover:bg-primary/5',
          )}
          onClick={() => onSelect(preset.settings)}
        >
          <span
            className={cn('block h-9 rounded-lg border border-white/10', preset.previewClassName)}
          />
          <span className="mt-1.5 block truncate px-1 text-[11px] font-bold text-foreground">
            {preset.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function isBackgroundPresetSelected(
  preset: CanvasBackgroundPreset,
  settings: ModernProjectSettings,
): boolean {
  if (preset.settings.backgroundMode !== settings.backgroundMode) {
    return false;
  }

  if (preset.settings.backgroundMode === 'solid') {
    return preset.settings.backgroundColor === settings.backgroundColor;
  }

  if (preset.settings.backgroundMode === 'gradient') {
    return (
      preset.settings.backgroundGradientFrom === settings.backgroundGradientFrom &&
      preset.settings.backgroundGradientTo === settings.backgroundGradientTo &&
      preset.settings.backgroundGradientAngle === settings.backgroundGradientAngle
    );
  }

  return true;
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

function ColorField({
  label,
  onChange,
  value,
}: Readonly<{
  label: string;
  onChange: (value: string) => void;
  value: string;
}>) {
  return (
    <div className="flex h-11 items-center gap-2 rounded-xl border border-border/30 bg-background/30 px-2">
      <input
        aria-label={label}
        type="color"
        value={getColorInputValue(value)}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-8 cursor-pointer rounded-lg border-none bg-transparent"
      />
      <Input
        value={value}
        className="h-8 border-none bg-transparent font-mono text-xs font-bold focus:ring-0"
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
    </div>
  );
}

function getColorInputValue(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
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
