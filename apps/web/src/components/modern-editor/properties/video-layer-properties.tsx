import type { Layer, ModernProjectSettings, VideoLayer } from '@vibe-creator/shared';
import { Film, Repeat2, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, Card, CardBody, Slider } from '@/components/ui';
import {
  buildVisualStylePresetUpdate,
  isVisualStylePresetActive,
  type VisualStylePreset,
  visualFramePresets,
  visualLookPresets,
  visualMotionPresets,
} from '@/lib/modern-editor-preset-catalog';
import { cn } from '@/lib/utils';
import { PresetPreviewCard } from './preset-preview-card';
import { QuickPresetGrid } from './quick-preset-grid';

interface VideoLayerPropertiesProps {
  readonly layer: VideoLayer;
  readonly onUpdate: (updates: Partial<Layer>) => void;
  readonly settings?: ModernProjectSettings;
  readonly onUpdateSettings?: (updates: Partial<ModernProjectSettings>) => void;
}

export function VideoLayerProperties({
  layer,
  onUpdate,
  settings,
  onUpdateSettings,
}: Readonly<VideoLayerPropertiesProps>) {
  const updateData = (dataUpdates: Partial<VideoLayer['data']>) => {
    onUpdate({ data: { ...layer.data, ...dataUpdates } } as Partial<Layer>);
  };

  const applyPreset = (preset: VisualStylePreset) => {
    onUpdate(buildVisualStylePresetUpdate(layer, preset));
    if (preset.canvasSettings) {
      onUpdateSettings?.(preset.canvasSettings);
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-border/40 bg-card/70 backdrop-blur-xl">
      <CardBody className="space-y-4 p-3">
        <SectionTitle icon={<Film size={15} />}>Video style</SectionTitle>

        <VisualPresetSection
          label="Frame"
          layer={layer}
          presets={visualFramePresets}
          settings={settings}
          onSelect={applyPreset}
        />
        <VisualPresetSection
          label="Look"
          layer={layer}
          presets={visualLookPresets}
          settings={settings}
          onSelect={applyPreset}
        />
        <VisualPresetSection
          label="Motion"
          layer={layer}
          presets={visualMotionPresets}
          settings={settings}
          onSelect={applyPreset}
        />

        <div className="space-y-3 rounded-2xl border border-border/30 bg-background/20 p-3">
          <SectionTitle icon={<Volume2 size={15} />}>Sound</SectionTitle>
          <div className="flex items-center justify-between gap-3">
            <PanelLabel>Volume</PanelLabel>
            <span className="rounded-full bg-muted/20 px-2 py-1 font-mono text-[10px] font-black text-muted-foreground">
              {Math.round(layer.data.volume * 100)}%
            </span>
          </div>
          <Slider
            min={0}
            max={2}
            step={0.1}
            value={[layer.data.volume]}
            onValueChange={(value: number[]) => updateData({ volume: value[0] ?? 1 })}
          />

          <div className="grid grid-cols-2 gap-2">
            <ToggleCard
              active={layer.data.volume === 0}
              icon={layer.data.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              label="Mute"
              onClick={() => updateData({ volume: layer.data.volume === 0 ? 1 : 0 })}
            />
            <ToggleCard
              active={layer.data.loop}
              icon={<Repeat2 size={16} />}
              label="Loop"
              onClick={() => updateData({ loop: !layer.data.loop })}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function VisualPresetSection({
  label,
  layer,
  onSelect,
  presets,
  settings,
}: Readonly<{
  label: string;
  layer: VideoLayer;
  onSelect: (preset: VisualStylePreset) => void;
  presets: readonly VisualStylePreset[];
  settings?: ModernProjectSettings;
}>) {
  return (
    <QuickPresetGrid label={label} columns="two">
      {presets.map((preset) => (
        <PresetPreviewCard
          key={preset.id}
          active={isVisualStylePresetActive(layer, preset, settings)}
          helper={preset.helper}
          label={preset.label}
          previewClassName={preset.previewClassName}
          onClick={() => onSelect(preset)}
        />
      ))}
    </QuickPresetGrid>
  );
}

function ToggleCard({
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
        'h-10 justify-between rounded-xl border px-3 text-xs font-black',
        active
          ? 'border-primary bg-primary/10 text-primary hover:bg-primary/15'
          : 'border-border/30 bg-background/25 text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
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
