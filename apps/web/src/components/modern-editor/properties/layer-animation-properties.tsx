import type { Layer } from '@vibe-creator/shared';
import { Check, Music, Plus, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Card, CardBody } from '@/components/ui';
import {
  buildTextAnimationUpdate,
  buildVisualAnimationUpdate,
  type EditorAnimationPreset,
  editorAnimationCatalog,
  resolveTextAnimationIn,
} from '@/lib/modern-editor-animation-catalog';
import { cn } from '@/lib/utils';
import { AnimationPreview } from './animation-preview';
import { QuickPresetGrid } from './quick-preset-grid';

interface LayerAnimationPropertiesProps {
  readonly layer: Layer;
  readonly onUpdate: (updates: Partial<Layer>) => void;
}

export function LayerAnimationProperties({
  layer,
  onUpdate,
}: Readonly<LayerAnimationPropertiesProps>) {
  const presets = useMemo(() => {
    if (layer.type === 'text') {
      return editorAnimationCatalog.filter((preset) => preset.layerTypes.includes('text'));
    }

    if (layer.type === 'audio') {
      return [];
    }

    return editorAnimationCatalog.filter((preset) => preset.layerTypes.includes('visual'));
  }, [layer.type]);
  const grouped = useMemo(() => groupAnimationPresets(presets), [presets]);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  const previewPreset = (preset: EditorAnimationPreset) => {
    setActivePreviewId(preset.durationMs > 0 ? preset.id : null);
  };

  if (layer.type === 'audio') {
    return (
      <Card className="overflow-hidden rounded-2xl border-border/40 bg-card/70 backdrop-blur-xl">
        <CardBody className="space-y-2 p-3">
          <SectionTitle icon={<Music size={15} />}>Animate audio</SectionTitle>
          <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
            Audio tidak memakai animasi visual. Pakai tab Timing untuk fade, loop, dan trim.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border/40 bg-card/70 backdrop-blur-xl">
      <CardBody className="space-y-4 p-3">
        <SectionTitle icon={<Sparkles size={15} />}>
          {layer.type === 'text' ? 'Animate text' : 'Animate visual'}
        </SectionTitle>
        {grouped.map((group) => (
          <QuickPresetGrid key={group.category} label={group.category} columns="two">
            {group.presets.map((preset) => (
              <AnimationPresetCard
                key={preset.id}
                active={isAnimationPresetActive(layer, preset)}
                helper={`${(preset.durationMs / 1000).toFixed(1)}s`}
                label={preset.label}
                previewing={activePreviewId === preset.id}
                preset={preset}
                onPreview={() => previewPreset(preset)}
                onSelect={() => onUpdate(buildAnimationUpdate(layer, preset))}
              />
            ))}
          </QuickPresetGrid>
        ))}
      </CardBody>
    </Card>
  );
}

function AnimationPresetCard({
  active,
  helper,
  label,
  onPreview,
  onSelect,
  previewing,
  preset,
}: Readonly<{
  active: boolean;
  helper: string;
  label: string;
  onPreview: () => void;
  onSelect: () => void;
  previewing: boolean;
  preset: EditorAnimationPreset;
}>) {
  const canPreview = preset.durationMs > 0;

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-2xl border bg-background/25 p-2 text-left transition-all',
        active
          ? 'border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]'
          : 'border-border/35 hover:border-primary/45 hover:bg-primary/5',
      )}
    >
      <button
        type="button"
        aria-label={`Preview ${label}`}
        className={cn(
          'relative flex min-h-20 w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-muted/25 text-left transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          canPreview ? 'cursor-pointer hover:border-primary/45' : 'cursor-default opacity-65',
          previewing && 'border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]',
        )}
        disabled={!canPreview}
        onClick={onPreview}
        onFocus={onPreview}
        onPointerEnter={onPreview}
      >
        <AnimationPreview isPlaying={previewing} preset={preset} />
      </button>

      <button
        type="button"
        className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl px-1.5 text-left transition-all hover:bg-primary/5 active:scale-[0.99]"
        onClick={onSelect}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-foreground">{label}</p>
          <p className="mt-0.5 text-[10px] font-semibold leading-snug text-muted-foreground/75">
            {canPreview ? helper : 'No motion'}
          </p>
        </div>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all',
            active
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border/30 bg-muted/20 text-muted-foreground group-hover:border-primary/45 group-hover:text-primary',
          )}
        >
          {active ? <Check size={16} /> : <Plus size={16} />}
        </span>
      </button>
    </div>
  );
}

function buildAnimationUpdate(layer: Layer, preset: EditorAnimationPreset): Partial<Layer> {
  if (layer.type === 'text') {
    return buildTextAnimationUpdate(layer, preset);
  }

  if (layer.type === 'video' || layer.type === 'image') {
    return buildVisualAnimationUpdate(layer, preset, preset.slot as 'in' | 'out' | 'motion');
  }

  return {};
}

function isAnimationPresetActive(layer: Layer, preset: EditorAnimationPreset): boolean {
  if (layer.type === 'text') {
    const animationIn = resolveTextAnimationIn(layer);
    const animationOut = layer.data.animationOut ?? 'none';
    const animationLoop = layer.data.animationLoop ?? 'none';

    return (
      ('textIn' in preset.payload && preset.payload.textIn === animationIn) ||
      ('textOut' in preset.payload && preset.payload.textOut === animationOut) ||
      ('textLoop' in preset.payload && preset.payload.textLoop === animationLoop)
    );
  }

  if (layer.type === 'video' || layer.type === 'image') {
    const effects = layer.data.effects;

    return (
      ('visualTransition' in preset.payload &&
        ((preset.slot === 'out' && preset.payload.visualTransition === effects.transitionOut) ||
          (preset.slot !== 'out' && preset.payload.visualTransition === effects.transitionIn))) ||
      ('visualMotion' in preset.payload && preset.payload.visualMotion === effects.motion)
    );
  }

  return false;
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

function groupAnimationPresets(presets: readonly EditorAnimationPreset[]) {
  return presets.reduce<Array<{ category: string; presets: EditorAnimationPreset[] }>>(
    (groups, preset) => {
      const existingGroup = groups.find((group) => group.category === preset.category);
      if (existingGroup) {
        existingGroup.presets.push(preset);
        return groups;
      }

      groups.push({ category: preset.category, presets: [preset] });
      return groups;
    },
    [],
  );
}
