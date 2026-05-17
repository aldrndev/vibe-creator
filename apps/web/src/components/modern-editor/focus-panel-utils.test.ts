import { describe, expect, it } from 'vitest';
import { resolveFocusPanelVisibility } from './focus-panel-utils';

describe('resolveFocusPanelVisibility', () => {
  it('uses pinned sidebar visibility outside focus mode', () => {
    expect(
      resolveFocusPanelVisibility({
        isFocusMode: false,
        isHoverOpen: false,
        isPanelVisible: true,
        isPinned: false,
      }),
    ).toBe(true);
  });

  it('uses hover or pin state inside focus mode', () => {
    expect(
      resolveFocusPanelVisibility({
        isFocusMode: true,
        isHoverOpen: true,
        isPanelVisible: false,
        isPinned: false,
      }),
    ).toBe(true);

    expect(
      resolveFocusPanelVisibility({
        isFocusMode: true,
        isHoverOpen: false,
        isPanelVisible: false,
        isPinned: true,
      }),
    ).toBe(true);
  });

  it('keeps focus-mode panel hidden when neither hovered nor pinned', () => {
    expect(
      resolveFocusPanelVisibility({
        isFocusMode: true,
        isHoverOpen: false,
        isPanelVisible: true,
        isPinned: false,
      }),
    ).toBe(false);
  });
});
