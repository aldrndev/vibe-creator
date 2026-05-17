import { useCallback, useEffect, useRef } from 'react';
import { saveActiveModernEditorDraft } from '@/lib/modern-editor-drafts';
import { saveVideoStudioProjectSession } from '@/services/video-studio-project-api';
import { useModernEditorStore } from '@/stores/modern-editor-store';

const VIDEO_STUDIO_AUTOSAVE_DELAY_MS = 1200;

interface UseModernEditorAutosaveOptions {
  readonly enabled: boolean;
}

/**
 * Keeps autosave from creating backend sessions for untouched blank projects.
 */
export function shouldAutosaveModernEditorDraft(input: {
  readonly projectId: string;
  readonly isDirty: boolean;
}): boolean {
  return Boolean(input.projectId && input.isDirty);
}

/**
 * Persists the active Video Studio project locally so refreshes restore the editor state.
 */
export function useModernEditorAutosave({ enabled }: UseModernEditorAutosaveOptions) {
  const saveTimerRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (!saveTimerRef.current) {
      return;
    }

    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  }, []);

  const saveNow = useCallback(async () => {
    if (isSavingRef.current) {
      return;
    }

    const state = useModernEditorStore.getState();
    if (!shouldAutosaveModernEditorDraft(state)) {
      return;
    }

    isSavingRef.current = true;
    try {
      await saveActiveModernEditorDraft(state.getProject(), state.assets);
      const savedSession = await saveVideoStudioProjectSession(state.getProject(), state.assets);
      useModernEditorStore.getState().replaceAssets(savedSession.assets);

      if (savedSession.project.id !== state.projectId) {
        useModernEditorStore.getState().setProjectId(savedSession.project.id);
      }

      await saveActiveModernEditorDraft(
        useModernEditorStore.getState().getProject(),
        savedSession.assets,
      );

      useModernEditorStore.getState().markProjectSaved();
    } catch {
      // Active recovery is a convenience layer; editing should continue if storage is unavailable.
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (!enabled) {
      return;
    }

    clearTimer();
    saveTimerRef.current = window.setTimeout(() => {
      void saveNow();
    }, VIDEO_STUDIO_AUTOSAVE_DELAY_MS);
  }, [clearTimer, enabled, saveNow]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const store = useModernEditorStore;
    const unsubscribers = [
      store.subscribe((state) => state.projectTitle, scheduleSave),
      store.subscribe((state) => state.settings, scheduleSave),
      store.subscribe((state) => state.layersById, scheduleSave),
      store.subscribe((state) => state.layerOrder, scheduleSave),
      store.subscribe((state) => state.assets, scheduleSave),
    ];

    scheduleSave();

    return () => {
      clearTimer();
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, [clearTimer, enabled, scheduleSave]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const flushSave = () => {
      clearTimer();
      void saveNow();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSave();
      }
    };

    window.addEventListener('pagehide', flushSave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearTimer, enabled, saveNow]);

  return { saveNow };
}
