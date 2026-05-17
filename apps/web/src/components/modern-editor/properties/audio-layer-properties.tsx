import type { AudioLayer, Layer } from '@vibe-creator/shared';
import { Music, Repeat2, Scissors, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardBody, Slider } from '@/components/ui';
import { cn } from '@/lib/utils';

interface AudioLayerPropertiesProps {
  layer: AudioLayer;
  onUpdate: (updates: Partial<Layer>) => void;
}

const fadePresets = [
  { label: 'Off', valueMs: 0 },
  { label: '0.5s', valueMs: 500 },
  { label: '1s', valueMs: 1000 },
  { label: '2s', valueMs: 2000 },
] as const;

export function AudioLayerProperties({ layer, onUpdate }: Readonly<AudioLayerPropertiesProps>) {
  const layerDurationMs = Math.max(100, layer.endMs - layer.startMs);
  const trimMaxMs = Math.max(layerDurationMs, layer.data.trimEndMs, layer.data.trimStartMs, 1000);
  const updateData = (dataUpdates: Partial<AudioLayer['data']>) => {
    onUpdate({ data: { ...layer.data, ...dataUpdates } } as Partial<Layer>);
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-border/40 bg-card/70 backdrop-blur-xl">
      <CardBody className="space-y-3 p-3">
        <SectionTitle icon={<Music size={15} />}>Audio</SectionTitle>

        <div className="space-y-1.5">
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

        <div className="space-y-1.5">
          <PanelLabel>Fade in</PanelLabel>
          <FadePresetGrid
            selectedMs={layer.data.fadeIn}
            onSelect={(fadeIn) => updateData({ fadeIn })}
          />
        </div>

        <div className="space-y-1.5">
          <PanelLabel>Fade out</PanelLabel>
          <FadePresetGrid
            selectedMs={layer.data.fadeOut}
            onSelect={(fadeOut) => updateData({ fadeOut })}
          />
        </div>

        <div className="space-y-1.5">
          <SectionTitle icon={<Scissors size={15} />}>Trim</SectionTitle>
          <div className="space-y-3">
            <TrimSlider
              label="Start"
              valueMs={layer.data.trimStartMs}
              maxMs={trimMaxMs}
              onChange={(trimStartMs) => updateData({ trimStartMs })}
            />
            <TrimSlider
              label="End"
              valueMs={layer.data.trimEndMs}
              maxMs={trimMaxMs}
              onChange={(trimEndMs) => updateData({ trimEndMs })}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function FadePresetGrid({
  onSelect,
  selectedMs,
}: Readonly<{
  onSelect: (valueMs: number) => void;
  selectedMs: number;
}>) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {fadePresets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          className={cn(
            'h-8 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95',
            selectedMs === preset.valueMs
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border/30 bg-background/25 text-muted-foreground hover:border-primary/40 hover:text-foreground',
          )}
          onClick={() => onSelect(preset.valueMs)}
        >
          {preset.label}
        </button>
      ))}
    </div>
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
    <button
      type="button"
      className={cn(
        'flex h-9 items-center justify-between rounded-lg border px-2.5 text-xs font-black transition-all active:scale-95',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border/30 bg-background/25 text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          'h-5 w-9 rounded-full border p-0.5 transition-colors',
          active ? 'border-primary bg-primary/30' : 'border-border/40 bg-muted/20',
        )}
      >
        <span
          className={cn(
            'block h-3.5 w-3.5 rounded-full bg-current transition-transform',
            active && 'translate-x-4',
          )}
        />
      </span>
    </button>
  );
}

function TrimSlider({
  label,
  maxMs,
  valueMs,
  onChange,
}: Readonly<{
  label: string;
  maxMs: number;
  valueMs: number;
  onChange: (valueMs: number) => void;
}>) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <PanelLabel>{label}</PanelLabel>
        <span className="rounded-full bg-muted/20 px-2 py-1 font-mono text-[10px] font-black text-muted-foreground">
          {(valueMs / 1000).toFixed(1)}s
        </span>
      </div>
      <Slider
        min={0}
        max={maxMs}
        step={100}
        value={[valueMs]}
        onValueChange={(value: number[]) => onChange(value[0] ?? valueMs)}
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

function SectionTitle({ children, icon }: Readonly<{ children: ReactNode; icon: ReactNode }>) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
      <span className="text-primary">{icon}</span>
      {children}
    </h3>
  );
}
