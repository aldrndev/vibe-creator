import { describe, expect, it } from 'vitest';
import { getPropertiesPanelTabGridClass, getPropertiesPanelTabs } from './properties-panel-tabs';

describe('properties panel tabs', () => {
  it('hides empty visual-only tabs for audio layers', () => {
    expect(getPropertiesPanelTabs('audio')).toEqual([
      { id: 'style', label: 'Audio' },
      { id: 'timing', label: 'Timing' },
    ]);
  });

  it('keeps full creator controls for visual and text layers', () => {
    expect(getPropertiesPanelTabs('text').map((tab) => tab.id)).toEqual([
      'style',
      'animate',
      'timing',
      'advanced',
    ]);
    expect(getPropertiesPanelTabs('video').map((tab) => tab.id)).toEqual([
      'style',
      'animate',
      'timing',
      'advanced',
    ]);
  });

  it('returns fixed Tailwind grid classes for the visible tab count', () => {
    expect(getPropertiesPanelTabGridClass(2)).toBe('grid-cols-2');
    expect(getPropertiesPanelTabGridClass(3)).toBe('grid-cols-3');
    expect(getPropertiesPanelTabGridClass(4)).toBe('grid-cols-4');
  });
});
