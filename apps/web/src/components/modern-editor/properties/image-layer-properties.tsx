import type { ImageLayer, Layer, ModernProjectSettings } from '@vibe-creator/shared';
import { Image as ImageIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardBody } from '@/components/ui';
import {
  buildVisualStylePresetUpdate,
  visualStylePresets,
} from '@/lib/modern-editor-preset-catalog';
import { PresetPreviewCard } from './preset-preview-card';
import { QuickPresetGrid } from './quick-preset-grid';

interface ImageLayerPropertiesProps {
  readonly layer: ImageLayer;
  readonly onUpdate: (updates: Partial<Layer>) => void;
  readonly onUpdateSettings?: (updates: Partial<ModernProjectSettings>) => void;
}

export function ImageLayerProperties({
  layer,
  onUpdate,
  onUpdateSettings,
}: Readonly<ImageLayerPropertiesProps>) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/40 bg-card/70 backdrop-blur-xl">
      <CardBody className="space-y-4 p-3">
        <SectionTitle icon={<ImageIcon size={15} />}>Image style</SectionTitle>

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
      </CardBody>
    </Card>
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
