import { useEffect } from 'react';
import { isEditableInputTarget, TIMELINE_NUDGE_MS } from '@/lib/modern-timeline-utils';
import { useModernEditorStore } from '@/stores/modern-editor-store';

/**
 * Registers the Video Studio keyboard shortcuts against the editor store.
 */
export function useModernEditorShortcuts(): void {
  const {
    selectedLayerId,
    undo,
    redo,
    deleteSelectedLayers,
    duplicateSelectedLayers,
    splitLayerAtPlayhead,
    moveLayerTiming,
    togglePlayback,
  } = useModernEditorStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableInputTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const isModifier = event.metaKey || event.ctrlKey;

      if (key === ' ') {
        event.preventDefault();
        togglePlayback();
        return;
      }

      if (isModifier && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (isModifier && key === 'd') {
        event.preventDefault();
        duplicateSelectedLayers();
        return;
      }

      if (key === 'backspace' || key === 'delete') {
        event.preventDefault();
        deleteSelectedLayers();
        return;
      }

      if (selectedLayerId && key === 'b') {
        event.preventDefault();
        splitLayerAtPlayhead();
        return;
      }

      if (selectedLayerId && (key === 'arrowleft' || key === 'arrowright')) {
        event.preventDefault();
        moveLayerTiming(
          selectedLayerId,
          key === 'arrowleft' ? -TIMELINE_NUDGE_MS : TIMELINE_NUDGE_MS,
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    deleteSelectedLayers,
    duplicateSelectedLayers,
    moveLayerTiming,
    redo,
    selectedLayerId,
    splitLayerAtPlayhead,
    togglePlayback,
    undo,
  ]);
}
