import type {
  ImageLayer,
  Layer,
  VideoLayer,
  VisualLayerEffects as VisualLayerEffectsData,
} from '@vibe-creator/shared';
import { createDefaultVisualLayerEffects } from '@vibe-creator/shared';
import { ArrowLeft, ArrowRight, Circle, Sparkles, ZoomIn } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardBody, Slider } from '@/components/ui';
import { cn } from '@/lib/utils';

type VisualLayer = ImageLayer | VideoLayer;

interface VisualLayerEffectsProps {
  readonly layer: VisualLayer;
  readonly onUpdate: (updates: Partial<Layer>) => void;
}

const filterOptions: ReadonlyArray<{
  className: string;
  label: string;
  value: VisualLayerEffectsData['filter'];
}> = [
  { label: 'Normal', value: 'none', className: 'from-zinc-700 to-zinc-950' },
  { label: 'B&W', value: 'grayscale', className: 'from-zinc-300 to-zinc-900' },
  { label: 'Warm', value: 'warm', className: 'from-orange-400 to-rose-950' },
  { label: 'Cold', value: 'cold', className: 'from-sky-300 to-blue-950' },
  { label: 'Vivid', value: 'vivid', className: 'from-fuchsia-500 to-emerald-500' },
];

const transitionOptions: ReadonlyArray<{
  icon: ReactNode;
  label: string;
  value: VisualLayerEffectsData['transitionIn'];
}> = [
  { label: 'None', value: 'none', icon: <Circle size={15} /> },
  { label: 'Fade', value: 'fade', icon: <Sparkles size={15} /> },
  { label: 'Left', value: 'slide-left', icon: <ArrowLeft size={15} /> },
  { label: 'Right', value: 'slide-right', icon: <ArrowRight size={15} /> },
  { label: 'Zoom', value: 'zoom', icon: <ZoomIn size={15} /> },
];

const motionOptions: ReadonlyArray<{
  icon: ReactNode;
  label: string;
  value: VisualLayerEffectsData['motion'];
}> = [
  { label: 'Still', value: 'none', icon: <Circle size={15} /> },
  { label: 'In', value: 'zoom-in', icon: <ZoomIn size={15} /> },
  { label: 'Out', value: 'zoom-out', icon: <ZoomIn size={15} /> },
];

export function VisualLayerEffects({ layer, onUpdate }: VisualLayerEffectsProps) {
  const effects = layer.data.effects ?? createDefaultVisualLayerEffects();
  const updateEffects = (updates: Partial<VisualLayerEffectsData>) => {
    onUpdate({
      data: {
        ...layer.data,
        effects: {
          ...effects,
          ...updates,
        },
      },
    } as Partial<Layer>);
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-border/40 bg-card/70 backdrop-blur-xl">
      <CardBody className="space-y-3 p-3">
        <SectionTitle icon={<Sparkles size={15} />}>Efek cepat</SectionTitle>

        <div className="space-y-1.5">
          <PanelLabel>Filter</PanelLabel>
          <div className="grid grid-cols-3 gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'rounded-xl border p-1.5 text-center transition-all active:scale-95',
                  effects.filter === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border/25 bg-background/20 hover:border-primary/40',
                )}
                onClick={() => updateEffects({ filter: option.value })}
              >
                <span className={cn('block h-6 rounded-md bg-gradient-to-br', option.className)} />
                <span className="mt-1 block truncate text-[8px] font-black uppercase tracking-tight text-muted-foreground">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <OptionGrid
          label="Gerak"
          options={motionOptions}
          value={effects.motion}
          onChange={(motion) => updateEffects({ motion })}
        />

        <OptionGrid
          label="Masuk"
          options={transitionOptions}
          value={effects.transitionIn}
          onChange={(transitionIn) => updateEffects({ transitionIn })}
        />

        <OptionGrid
          label="Keluar"
          options={transitionOptions}
          value={effects.transitionOut}
          onChange={(transitionOut) => updateEffects({ transitionOut })}
        />

        <div className="space-y-3">
          <FadeSlider
            label="Fade in"
            valueMs={effects.fadeInMs}
            onChange={(fadeInMs) => updateEffects({ fadeInMs })}
          />
          <FadeSlider
            label="Fade out"
            valueMs={effects.fadeOutMs}
            onChange={(fadeOutMs) => updateEffects({ fadeOutMs })}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function OptionGrid<TValue extends string>({
  label,
  onChange,
  options,
  value,
}: Readonly<{
  label: string;
  onChange: (value: TValue) => void;
  options: ReadonlyArray<{ icon: ReactNode; label: string; value: TValue }>;
  value: TValue;
}>) {
  return (
    <div className="space-y-1.5">
      <PanelLabel>{label}</PanelLabel>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              'flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg border px-2 text-[9px] font-black uppercase tracking-tight transition-all active:scale-95',
              value === option.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border/30 bg-background/25 text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FadeSlider({
  label,
  valueMs,
  onChange,
}: Readonly<{
  label: string;
  valueMs: number;
  onChange: (valueMs: number) => void;
}>) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <PanelLabel>{label}</PanelLabel>
        <span className="font-mono text-[10px] font-black text-muted-foreground">
          {(valueMs / 1000).toFixed(1)}s
        </span>
      </div>
      <Slider
        min={0}
        max={3000}
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
