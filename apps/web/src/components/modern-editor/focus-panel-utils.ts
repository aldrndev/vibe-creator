interface FocusPanelVisibilityInput {
  readonly isFocusMode: boolean;
  readonly isHoverOpen: boolean;
  readonly isPanelVisible: boolean;
  readonly isPinned: boolean;
}

/**
 * Resolves desktop panel visibility for normal layout and focus-mode overlays.
 */
export function resolveFocusPanelVisibility({
  isFocusMode,
  isHoverOpen,
  isPanelVisible,
  isPinned,
}: FocusPanelVisibilityInput): boolean {
  if (!isFocusMode) {
    return isPanelVisible;
  }

  return isHoverOpen || isPinned;
}
