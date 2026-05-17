import type { Layer, ModernProjectSettings, VideoLayer } from '@vibe-creator/shared';
import { Repeat2, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, Card, CardBody, Slider } from '@/components/ui';
import {
  buildVisualStylePresetUpdate,
  visualStylePresets,
} from '@/lib/modern-editor-preset-catalog';
import { cn } from '@/lib/utils';
import { PresetPreviewCard } from './preset-preview-card';
import { QuickPresetGrid } from './quick-preset-grid';

interface VideoLayerPropertiesProps {
  readonly layer: VideoLayer;
  readonly onUpdate: (updates: Partial<Layer>) => void;
  readonly onUpdateSettings?: (updates: Partial<ModernProjectSettings>) => void;
}

export function VideoLayerProperties({
  layer,
  onUpdate,
  onUpdateSettings,
}: Readonly<VideoLayerPropertiesProps>) {
  const updateData = (dataUpdates: Partial<VideoLayer['data']>) => {
    onUpdate({ data: { ...layer.data, ...dataUpdates } } as Partial<Layer>);
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-border/40 bg-card/70 backdrop-blur-xl">
      <CardBody className="space-y-4 p-3">
        <SectionTitle icon={<Volume2 size={15} />}>Video style</SectionTitle>

        <QuickPresetGrid label="Action cepat" columns="two">
          {visualStylePresets.map((preset) => (
            <PresetPreviewCard
              key={preset.id}
              helper={preset.helper}
              label={preset.label}
              previewClassName={preset.previewClassName}
              onClick={() => {
                onUpdate(buildVisualStylePresetUpdate(layer, preset));
                if (preset.canvasSettings) {
                  onUpdateSettings?.(preset.canvasSettings);
                }
              }}
            />
          ))}
        </QuickPresetGrid>

        <div className="space-y-2">
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
        </div>

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
      </CardBody>
    </Card>
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
