import type { Layer, VideoLayer } from '@vibe-creator/shared';
import {
  Card,
  CardBody,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
} from '@/components/ui';
import { parseFiniteNumber } from './property-number';

interface VideoLayerPropertiesProps {
  layer: VideoLayer;
  onUpdate: (updates: Partial<Layer>) => void;
}

export function VideoLayerProperties({ layer, onUpdate }: Readonly<VideoLayerPropertiesProps>) {
  const updateData = (dataUpdates: Partial<VideoLayer['data']>) => {
    onUpdate({ data: { ...layer.data, ...dataUpdates } } as Partial<Layer>);
  };

  return (
    <Card className="bg-card/70 backdrop-blur-xl border-border/40 overflow-hidden">
      <CardBody className="p-6 space-y-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Video Properties
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
            aria-label="Loop video layer"
          />
        </div>

        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Fit Mode
          </div>
          <Select
            value={layer.data.fit}
            onValueChange={(value) => updateData({ fit: value as VideoLayer['data']['fit'] })}
          >
            <SelectTrigger className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contain" className="text-xs font-bold uppercase">
                Contain
              </SelectItem>
              <SelectItem value="cover" className="text-xs font-bold uppercase">
                Cover
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <TrimInput
            label="Trim Start (s)"
            valueMs={layer.data.trimStartMs}
            onChange={(trimStartMs) => updateData({ trimStartMs })}
          />
          <TrimInput
            label="Trim End (s)"
            valueMs={layer.data.trimEndMs}
            onChange={(trimEndMs) => updateData({ trimEndMs })}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function TrimInput({
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
