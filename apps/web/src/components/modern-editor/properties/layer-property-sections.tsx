import type { AudioLayer, Layer, ModernProjectSettings, VideoLayer } from '@vibe-creator/shared';
import {
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Move,
  Music,
  SlidersHorizontal,
  Timer,
  Trash2,
  Type,
  Unlock,
  Video,
} from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';
import { Badge, Button, Card, CardBody, Input, Slider, TabsTrigger } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatLayerDuration, formatLayerTime, getLayerTypeLabel } from '../layer-panel-utils';
import { AudioLayerProperties } from './audio-layer-properties';
import { ImageLayerProperties } from './image-layer-properties';
import {
  formatPropertyNumber,
  formatPropertyPercent,
  parseFiniteNumber,
  roundPropertyNumber,
} from './property-number';
import { TextLayerProperties } from './text-layer-properties';
import { VideoLayerProperties } from './video-layer-properties';

export type PropertiesTab = 'style' | 'animate' | 'timing' | 'advanced';

interface LayerUpdateProps {
  readonly layer: Layer;
  readonly onUpdate: (updates: Partial<Layer>) => void;
  readonly settings?: ModernProjectSettings;
  readonly onUpdateSettings?: (updates: Partial<ModernProjectSettings>) => void;
}

export function SelectedLayerHeader({
  layer,
  onDelete,
  onDuplicate,
  onToggleLock,
  onToggleVisibility,
  title,
}: Readonly<{
  layer: Layer;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onToggleVisibility: () => void;
  title: string;
}>) {
  return (
    <Card className="overflow-hidden rounded-2xl border-primary/15 bg-primary/5">
      <CardBody className="space-y-2.5 p-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            {getLayerIcon(layer.type)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-black">{title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="border-border/40 bg-background/30 text-[10px]">
                {getLayerTypeLabel(layer.type)}
              </Badge>
              <Badge variant="outline" className="border-border/40 bg-background/30 text-[10px]">
                {formatLayerDuration(layer)}
              </Badge>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <PanelActionButton
              label={layer.visible ? 'Hide layer' : 'Show layer'}
              onClick={onToggleVisibility}
            >
              {layer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
            </PanelActionButton>
            <PanelActionButton
              label={layer.locked ? 'Unlock layer' : 'Lock layer'}
              onClick={onToggleLock}
            >
              {layer.locked ? <Lock size={15} /> : <Unlock size={15} />}
            </PanelActionButton>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-primary/10 pt-2.5">
          <Button
            variant="ghost"
            className="h-8 flex-1 rounded-lg bg-background/25 text-xs font-black hover:bg-primary/15 hover:text-primary"
            onClick={onDuplicate}
          >
            <Copy size={14} className="mr-2" />
            Duplicate
          </Button>
          <PanelActionButton
            label="Delete layer"
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 size={16} />
          </PanelActionButton>
        </div>
      </CardBody>
    </Card>
  );
}

export function LayerTypeProperties({
  layer,
  onUpdate,
  onUpdateSettings,
  settings,
}: LayerUpdateProps) {
  if (layer.type === 'text') {
    return <TextLayerProperties layer={layer} onUpdate={onUpdate} />;
  }

  if (layer.type === 'image') {
    return (
      <ImageLayerProperties layer={layer} onUpdate={onUpdate} onUpdateSettings={onUpdateSettings} />
    );
  }

  if (layer.type === 'video') {
    return (
      <VideoLayerProperties
        layer={layer}
        settings={settings}
        onUpdate={onUpdate}
        onUpdateSettings={onUpdateSettings}
      />
    );
  }

  return <AudioLayerProperties layer={layer} onUpdate={onUpdate} />;
}

export function TransformProperties({ layer, onUpdate }: LayerUpdateProps) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/40 bg-card/70 backdrop-blur-xl">
      <CardBody className="space-y-3 p-3">
        <SectionTitle icon={<Move size={15} />}>Posisi & ukuran</SectionTitle>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Atas', x: 50, y: 16, width: 82, height: 18 },
            { label: 'Tengah', x: 50, y: 50, width: 78, height: 24 },
            { label: 'Bawah', x: 50, y: 84, width: 86, height: 16 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="h-9 rounded-lg border border-border/30 bg-background/25 text-[10px] font-black uppercase tracking-widest transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-95"
              onClick={() => onUpdate(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <SliderRow
          label={`Geser kanan ${formatPropertyNumber(layer.x)}%`}
          value={layer.x}
          onChange={(x) => onUpdate({ x })}
        />
        <SliderRow
          label={`Geser bawah ${formatPropertyNumber(layer.y)}%`}
          value={layer.y}
          onChange={(y) => onUpdate({ y })}
        />

        <div className="grid grid-cols-2 gap-2.5">
          <SliderRow
            label={`Lebar ${formatPropertyNumber(layer.width)}%`}
            min={1}
            max={200}
            value={layer.width}
            onChange={(width) => onUpdate({ width })}
          />
          <SliderRow
            label={`Tinggi ${formatPropertyNumber(layer.height)}%`}
            min={1}
            max={200}
            value={layer.height}
            onChange={(height) => onUpdate({ height })}
          />
        </div>

        <SliderRow
          label={`Rotasi ${formatPropertyNumber(layer.rotation)}°`}
          min={-180}
          max={180}
          value={layer.rotation}
          onChange={(rotation) => onUpdate({ rotation })}
        />
        <SliderRow
          label={`Opacity ${formatPropertyPercent(layer.opacity)}`}
          min={0}
          max={1}
          step={0.05}
          value={layer.opacity}
          onChange={(opacity) => onUpdate({ opacity })}
        />
      </CardBody>
    </Card>
  );
}

export function TimingProperties({
  layer,
  maxDuration,
  onUpdate,
}: Readonly<
  LayerUpdateProps & {
    maxDuration: number;
  }
>) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/40 bg-card/70 backdrop-blur-xl">
      <CardBody className="space-y-3 p-3">
        <SectionTitle icon={<Timer size={15} />}>Waktu layer</SectionTitle>

        <div className="grid grid-cols-2 gap-2">
          <SecondsField
            label="Mulai"
            valueMs={layer.startMs}
            onChange={(startMs) => onUpdate({ startMs })}
          />
          <SecondsField
            label="Selesai"
            valueMs={layer.endMs}
            onChange={(endMs) => onUpdate({ endMs })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <PanelLabel>Rentang tampil</PanelLabel>
            <span className="rounded-full bg-muted/20 px-2 py-1 font-mono text-[10px] font-black text-muted-foreground">
              {formatLayerTime(layer.startMs)} - {formatLayerTime(layer.endMs)}
            </span>
          </div>
          <Slider
            min={0}
            max={maxDuration}
            value={[layer.startMs, layer.endMs]}
            onValueChange={(value: number[]) => {
              if (value.length === 2) {
                onUpdate({ startMs: value[0], endMs: value[1] });
              }
            }}
          />
        </div>

        {(layer.type === 'video' || layer.type === 'audio') && (
          <MediaTrimControls layer={layer} onUpdate={onUpdate} />
        )}
      </CardBody>
    </Card>
  );
}

export function AdvancedLayerProperties({ layer, onUpdate }: LayerUpdateProps) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/40 bg-card/70 backdrop-blur-xl">
      <CardBody className="space-y-3 p-3">
        <SectionTitle icon={<SlidersHorizontal size={15} />}>Kontrol presisi</SectionTitle>

        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={layer.x} onChange={(x) => onUpdate({ x })} />
          <NumberField label="Y" value={layer.y} onChange={(y) => onUpdate({ y })} />
          <NumberField
            label="Width"
            value={layer.width}
            onChange={(width) => onUpdate({ width })}
          />
          <NumberField
            label="Height"
            value={layer.height}
            onChange={(height) => onUpdate({ height })}
          />
          <NumberField
            label="Rotation"
            value={layer.rotation}
            onChange={(rotation) => onUpdate({ rotation })}
          />
          <NumberField
            label="Opacity"
            value={layer.opacity * 100}
            onChange={(opacity) => onUpdate({ opacity: roundPropertyNumber(opacity / 100) })}
          />
        </div>
      </CardBody>
    </Card>
  );
}

export function PanelTab({
  children,
  value,
}: Readonly<{ children: ReactNode; value: PropertiesTab }>) {
  return (
    <TabsTrigger
      value={value}
      className="rounded-lg text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
    >
      {children}
    </TabsTrigger>
  );
}

function PanelActionButton({
  children,
  className,
  label,
  onClick,
}: Readonly<{
  children: ReactNode;
  className?: string;
  label: string;
  onClick: () => void;
}>) {
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={label}
      className={cn(
        'h-8 w-8 rounded-lg bg-background/25 hover:bg-primary/15 hover:text-primary',
        className,
      )}
      onClick={onClick}
    >
      {children}
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
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {children}
      </h3>
    </div>
  );
}

function SliderRow({
  label,
  max = 100,
  min = 0,
  onChange,
  step = 1,
  value,
}: Readonly<{
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}>) {
  return (
    <div className="space-y-1.5">
      <PanelLabel>{label}</PanelLabel>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(nextValue: number[]) =>
          onChange(roundPropertyNumber(nextValue[0] ?? value, value))
        }
      />
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
    <div className="space-y-1.5">
      <PanelLabel>{label}</PanelLabel>
      <Input
        type="number"
        value={formatPropertyNumber(value)}
        className="h-9 rounded-lg border-border/40 bg-background/40 text-center text-xs font-bold uppercase tracking-tight"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(roundPropertyNumber(parseFiniteNumber(event.target.value, value), value))
        }
      />
    </div>
  );
}

function SecondsField({
  label,
  onChange,
  valueMs,
}: Readonly<{
  label: string;
  onChange: (valueMs: number) => void;
  valueMs: number;
}>) {
  return (
    <div className="space-y-1.5">
      <PanelLabel>{label}</PanelLabel>
      <Input
        type="number"
        min={0}
        step={0.1}
        value={(valueMs / 1000).toFixed(1)}
        className="h-9 rounded-lg border-border/40 bg-background/40 text-center text-xs font-bold uppercase tracking-tight"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(parseFiniteNumber(event.target.value, valueMs / 1000) * 1000)
        }
      />
    </div>
  );
}

function MediaTrimControls({
  layer,
  onUpdate,
}: Readonly<{
  layer: AudioLayer | VideoLayer;
  onUpdate: (updates: Partial<Layer>) => void;
}>) {
  const layerDurationMs = Math.max(100, layer.endMs - layer.startMs);
  const trimMaxMs = Math.max(layerDurationMs, layer.data.trimEndMs, layer.data.trimStartMs, 1000);
  const updateData = (dataUpdates: Partial<AudioLayer['data'] | VideoLayer['data']>) => {
    onUpdate({ data: { ...layer.data, ...dataUpdates } } as Partial<Layer>);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/30 bg-background/20 p-3">
      <SectionTitle icon={<Timer size={15} />}>Trim sumber</SectionTitle>
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
  );
}

function TrimSlider({
  label,
  maxMs,
  onChange,
  valueMs,
}: Readonly<{
  label: string;
  maxMs: number;
  onChange: (valueMs: number) => void;
  valueMs: number;
}>) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
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

function getLayerIcon(type: Layer['type']): ReactNode {
  if (type === 'video') {
    return <Video size={20} />;
  }

  if (type === 'image') {
    return <ImageIcon size={20} />;
  }

  if (type === 'audio') {
    return <Music size={20} />;
  }

  return <Type size={20} />;
}
