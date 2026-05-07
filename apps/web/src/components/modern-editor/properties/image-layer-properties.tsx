import type { ImageLayer, Layer } from '@vibe-creator/shared';
import {
  Card,
  CardBody,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

interface ImageLayerPropertiesProps {
  layer: ImageLayer;
  onUpdate: (updates: Partial<Layer>) => void;
}

export function ImageLayerProperties({ layer, onUpdate }: Readonly<ImageLayerPropertiesProps>) {
  const updateData = (dataUpdates: Partial<ImageLayer['data']>) => {
    onUpdate({ data: { ...layer.data, ...dataUpdates } } as Partial<Layer>);
  };

  return (
    <Card className="bg-card/70 backdrop-blur-xl border-border/40 overflow-hidden">
      <CardBody className="p-6 space-y-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Image Properties
        </h3>

        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Fit Mode
          </div>
          <Select
            value={layer.data.fit}
            onValueChange={(value) => updateData({ fit: value as ImageLayer['data']['fit'] })}
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
      </CardBody>
    </Card>
  );
}
