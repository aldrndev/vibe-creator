import { useEffect } from 'react';
import { isEditableInputTarget, TIMELINE_NUDGE_MS } from '@/lib/modern-timeline-utils';
import { useModernEditorStore } from '@/stores/modern-editor-store';

function handleEditorKeyCommand(
  event: KeyboardEvent,
  selectedLayerId: string | null,
  actions: {
    togglePlayback: () => void;
    undo: () => void;
    redo: () => void;
    duplicateSelectedLayers: () => void;
    deleteSelectedLayers: () => void;
    splitLayerAtPlayhead: () => void;
    moveLayerTiming: (id: string, ms: number) => void;
  },
) {
  if (isEditableInputTarget(event.target)) {
    return;
  }

  const key = event.key.toLowerCase();
  const isModifier = event.metaKey || event.ctrlKey;

  switch (key) {
    case ' ':
      event.preventDefault();
      actions.togglePlayback();
      break;
    case 'z':
      if (isModifier) {
        event.preventDefault();
        if (event.shiftKey) {
          actions.redo();
        } else {
          actions.undo();
        }
      }
      break;
    case 'd':
      if (isModifier) {
        event.preventDefault();
        actions.duplicateSelectedLayers();
      }
      break;
    case 'backspace':
    case 'delete':
      event.preventDefault();
      actions.deleteSelectedLayers();
      break;
    case 'b':
      if (selectedLayerId) {
        event.preventDefault();
        actions.splitLayerAtPlayhead();
      }
      break;
    case 'arrowleft':
    case 'arrowright':
      if (selectedLayerId) {
        event.preventDefault();
        actions.moveLayerTiming(
          selectedLayerId,
          key === 'arrowleft' ? -TIMELINE_NUDGE_MS : TIMELINE_NUDGE_MS,
        );
      }
      break;
  }
}

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
      handleEditorKeyCommand(event, selectedLayerId, {
        togglePlayback,
        undo,
        redo,
        duplicateSelectedLayers,
        deleteSelectedLayers,
        splitLayerAtPlayhead,
        moveLayerTiming,
      });
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
