import type { AudioLayer, Layer } from '@vibe-creator/shared';
import { Card, CardBody, Input, Slider, Switch } from '@/components/ui';
import { parseFiniteNumber } from './property-number';

interface AudioLayerPropertiesProps {
  layer: AudioLayer;
  onUpdate: (updates: Partial<Layer>) => void;
}

export function AudioLayerProperties({ layer, onUpdate }: Readonly<AudioLayerPropertiesProps>) {
  const updateData = (dataUpdates: Partial<AudioLayer['data']>) => {
    onUpdate({ data: { ...layer.data, ...dataUpdates } } as Partial<Layer>);
  };

  return (
    <Card className="bg-card/70 backdrop-blur-xl border-border/40 overflow-hidden">
      <CardBody className="p-6 space-y-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Audio Properties
        </h3>

        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block">
            Volume ({Math.round(layer.data.volume * 100)}%)
          </div>
          <Slider
            min={0}
            max={2}
            step={0.1}
            value={[layer.data.volume]}
            onValueChange={(value: number[]) => updateData({ volume: value[0] })}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl bg-background/30 border border-border/30 px-4 py-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Loop Playback
          </div>
          <Switch
            checked={layer.data.loop}
            onCheckedChange={(checked) => updateData({ loop: checked })}
            aria-label="Loop audio layer"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <SecondsInput
            label="Fade In (s)"
            valueMs={layer.data.fadeIn}
            onChange={(fadeIn) => updateData({ fadeIn })}
          />
          <SecondsInput
            label="Fade Out (s)"
            valueMs={layer.data.fadeOut}
            onChange={(fadeOut) => updateData({ fadeOut })}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <SecondsInput
            label="Trim Start (s)"
            valueMs={layer.data.trimStartMs}
            onChange={(trimStartMs) => updateData({ trimStartMs })}
          />
          <SecondsInput
            label="Trim End (s)"
            valueMs={layer.data.trimEndMs}
            onChange={(trimEndMs) => updateData({ trimEndMs })}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function SecondsInput({
  label,
  valueMs,
  onChange,
}: Readonly<{
  label: string;
  valueMs: number;
  onChange: (valueMs: number) => void;
}>) {
  return (
    <div className="space-y-4">
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block">
        {label}
      </div>
      <Input
        type="number"
        min={0}
        step={0.1}
        value={(valueMs / 1000).toFixed(1)}
        className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight text-center"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onChange(parseFiniteNumber(event.target.value, valueMs / 1000) * 1000)
        }
      />
    </div>
  );
}
