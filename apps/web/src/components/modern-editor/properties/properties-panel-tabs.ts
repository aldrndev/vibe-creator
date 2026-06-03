import type { LayerType } from '@vibe-creator/shared';

export type PropertiesPanelTabId = 'style' | 'animate' | 'timing' | 'advanced';

export interface PropertiesPanelTabDefinition {
  readonly id: PropertiesPanelTabId;
  readonly label: string;
}

const creativeLayerTabs = [
  { id: 'style', label: 'Style' },
  { id: 'animate', label: 'Animate' },
  { id: 'timing', label: 'Timing' },
  { id: 'advanced', label: 'Advanced' },
] as const satisfies readonly PropertiesPanelTabDefinition[];

const audioLayerTabs = [
  { id: 'style', label: 'Audio' },
  { id: 'timing', label: 'Timing' },
] as const satisfies readonly PropertiesPanelTabDefinition[];

export function getPropertiesPanelTabs(
  layerType: LayerType,
): readonly PropertiesPanelTabDefinition[] {
  if (layerType === 'audio') {
    return audioLayerTabs;
  }

  return creativeLayerTabs;
}

export function getPropertiesPanelTabGridClass(tabCount: number): string {
  if (tabCount <= 2) {
    return 'grid-cols-2';
  }

  if (tabCount === 3) {
    return 'grid-cols-3';
  }

  return 'grid-cols-4';
}
