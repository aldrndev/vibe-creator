/**
 * Properties Panel
 *
 * Context-aware property editor based on selected layer.
 */

import type { Layer } from '@vibe-creator/shared';
import { MousePointer2, Settings2 } from 'lucide-react';
import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useModernEditorStore } from '@/stores/modern-editor-store';
import { getLayerDisplayName } from './layer-panel-utils';
import { CanvasSettingsPanel } from './properties/canvas-settings-panel';
import {
  AdvancedLayerProperties,
  LayerAnimationProperties,
  LayerTypeProperties,
  PanelTab,
  SelectedLayerHeader,
  TimingProperties,
  TransformProperties,
} from './properties/layer-property-sections';

interface PropertiesPanelProps {
  readonly className?: string;
  readonly compactEmpty?: boolean;
  readonly showCanvasSettings?: boolean;
}

export function PropertiesPanel({
  className,
  compactEmpty = false,
  showCanvasSettings = true,
}: PropertiesPanelProps) {
  const {
    assets,
    duplicateLayer,
    getMaxEndMs,
    layersById,
    removeLayer,
    selectedLayerId,
    selectLayer,
    settings,
    updateLayer,
    updateSettings,
  } = useModernEditorStore();

  const selectedLayer = selectedLayerId ? layersById[selectedLayerId] : null;
  const selectedLayerName = useMemo(
    () => (selectedLayer ? getLayerDisplayName(selectedLayer, assets) : ''),
    [assets, selectedLayer],
  );

  const handleUpdate = (updates: Partial<Layer>) => {
    if (!selectedLayerId) {
      return;
    }

    updateLayer(selectedLayerId, updates);
  };

  if (!selectedLayer && showCanvasSettings) {
    return (
      <CanvasSettingsPanel
        className={className}
        compactEmpty={compactEmpty}
        settings={settings}
        onUpdateSettings={updateSettings}
      />
    );
  }

  if (!selectedLayer) {
    return <InspectorEmptyState className={className} />;
  }

  const maxDuration = Math.max(getMaxEndMs(), 60000);

  return (
    <div
      className={cn(
        'h-full space-y-3.5 overflow-y-auto pr-1 pb-20 scrollbar-hide md:pb-0',
        className,
      )}
    >
      <SelectedLayerHeader
        layer={selectedLayer}
        title={selectedLayerName}
        onDelete={() => {
          removeLayer(selectedLayer.id);
          selectLayer(null);
        }}
        onDuplicate={() => duplicateLayer(selectedLayer.id)}
        onToggleLock={() => handleUpdate({ locked: !selectedLayer.locked })}
        onToggleVisibility={() => handleUpdate({ visible: !selectedLayer.visible })}
      />

      <Tabs key={selectedLayer.id} defaultValue="style">
        <TabsList className="grid h-10 w-full grid-cols-4 rounded-xl border border-border/20 bg-muted/15 p-1">
          <PanelTab value="style">Style</PanelTab>
          <PanelTab value="animate">Animate</PanelTab>
          <PanelTab value="timing">Timing</PanelTab>
          <PanelTab value="advanced">Advanced</PanelTab>
        </TabsList>

        <TabsContent value="style" className="mt-3.5 space-y-3.5">
          <LayerTypeProperties
            layer={selectedLayer}
            onUpdate={handleUpdate}
            onUpdateSettings={updateSettings}
          />
        </TabsContent>

        <TabsContent value="animate" className="mt-3.5">
          <LayerAnimationProperties layer={selectedLayer} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent value="timing" className="mt-3.5">
          <TimingProperties
            layer={selectedLayer}
            maxDuration={maxDuration}
            onUpdate={handleUpdate}
          />
        </TabsContent>

        <TabsContent value="advanced" className="mt-3.5 space-y-3.5">
          <TransformProperties layer={selectedLayer} onUpdate={handleUpdate} />
          <AdvancedLayerProperties layer={selectedLayer} onUpdate={handleUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InspectorEmptyState({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-border/45 bg-card/35 p-4 text-center',
        className,
      )}
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
        <MousePointer2 size={18} />
      </div>
      <p className="mt-3 text-sm font-black text-foreground">Pilih layer untuk edit</p>
      <p className="mx-auto mt-1.5 max-w-52 text-xs font-semibold leading-relaxed text-muted-foreground">
        Detail text, video, audio, dan timing akan muncul di sini.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-border/25 bg-background/25 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
        <Settings2 size={14} className="text-primary" />
        Canvas format
      </div>
    </div>
  );
}
