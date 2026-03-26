import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import { useEditorStore } from '@/stores/editor-store';

// Autosave configuration
const AUTOSAVE_INTERVAL_MS = 30000; // 30 seconds
const IDLE_SAVE_DELAY_MS = 5000; // Save after 5s of inactivity
const INDEXEDDB_NAME = 'vibe-editor';
const INDEXEDDB_STORE = 'autosave';
const CRASH_FLAG_KEY = 'vibe-editor-crash-flag';

interface AutosaveData {
  projectId: string;
  projectTitle: string;
  timeline: ReturnType<typeof useEditorStore.getState>['timeline'];
  textOverlays: ReturnType<typeof useEditorStore.getState>['textOverlays'];
  assets: Array<Omit<ReturnType<typeof useEditorStore.getState>['assets'][0], 'file'>>;
  savedAt: number;
}

/**
 * Open IndexedDB connection
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXEDDB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(INDEXEDDB_STORE)) {
        db.createObjectStore(INDEXEDDB_STORE, { keyPath: 'projectId' });
      }
    };
  });
}

/**
 * Save data to IndexedDB
 */
async function saveToIndexedDB(data: AutosaveData): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(INDEXEDDB_STORE, 'readwrite');
    const store = transaction.objectStore(INDEXEDDB_STORE);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Load data from IndexedDB
 */
async function loadFromIndexedDB(projectId: string): Promise<AutosaveData | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(INDEXEDDB_STORE, 'readonly');
    const store = transaction.objectStore(INDEXEDDB_STORE);
    const request = store.get(projectId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete autosave from IndexedDB
 */
async function deleteFromIndexedDB(projectId: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(INDEXEDDB_STORE, 'readwrite');
    const store = transaction.objectStore(INDEXEDDB_STORE);
    const request = store.delete(projectId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

interface UseAutosaveOptions {
  onRecoveryAvailable?: (savedAt: Date) => void;
  onRecoveryRestored?: () => void;
}

/**
 * Autosave hook for crash recovery
 * - Saves to IndexedDB every 30s or on idle
 * - Detects crash via beforeunload flag
 * - Offers recovery on next session
 */
export function useAutosave(options: UseAutosaveOptions = {}) {
  const { onRecoveryAvailable, onRecoveryRestored } = options;

  const lastSaveTime = useRef(0);
  const idleTimer = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save current state
  const save = useCallback(async () => {
    const state = useEditorStore.getState();
    if (!state.projectId) return;

    const data: AutosaveData = {
      projectId: state.projectId,
      projectTitle: state.projectTitle,
      timeline: JSON.parse(JSON.stringify(state.timeline)),
      textOverlays: JSON.parse(JSON.stringify(state.textOverlays)),
      assets: state.assets.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        url: a.url,
        durationMs: a.durationMs,
        width: a.width,
        height: a.height,
        thumbnailUrl: a.thumbnailUrl,
        thumbnails: a.thumbnails,
      })),
      savedAt: Date.now(),
    };

    try {
      await saveToIndexedDB(data);
      lastSaveTime.current = Date.now();
    } catch (error) {
      logger.error('Autosave failed', error);
    }
  }, []);

  // Restore from autosave
  const restore = useCallback(async (): Promise<boolean> => {
    const state = useEditorStore.getState();
    if (!state.projectId) return false;

    try {
      const data = await loadFromIndexedDB(state.projectId);
      if (!data) return false;

      useEditorStore.setState({
        timeline: data.timeline,
        textOverlays: data.textOverlays,
        // Note: assets with File objects cannot be restored
        // User needs to re-import media files
      });

      onRecoveryRestored?.();
      return true;
    } catch (error) {
      logger.error('Recovery failed', error);
      return false;
    }
  }, [onRecoveryRestored]);

  // Clear autosave (on successful manual save)
  const clear = useCallback(async () => {
    const state = useEditorStore.getState();
    if (!state.projectId) return;

    try {
      await deleteFromIndexedDB(state.projectId);
    } catch (error) {
      logger.error('Clear autosave failed', error);
    }
  }, []);

  // Check for recovery on mount
  useEffect(() => {
    const checkRecovery = async () => {
      const state = useEditorStore.getState();
      if (!state.projectId) return;

      // Check if there was a crash
      const crashFlag = sessionStorage.getItem(CRASH_FLAG_KEY);
      if (!crashFlag) return;

      // Clear crash flag
      sessionStorage.removeItem(CRASH_FLAG_KEY);

      // Check for autosave
      const data = await loadFromIndexedDB(state.projectId);
      if (data && Date.now() - data.savedAt < 24 * 60 * 60 * 1000) {
        // Within 24 hours
        onRecoveryAvailable?.(new Date(data.savedAt));
      }
    };

    checkRecovery();
  }, [onRecoveryAvailable]);

  // Set crash flag on page load
  useEffect(() => {
    sessionStorage.setItem(CRASH_FLAG_KEY, 'true');

    // Clear on clean exit
    const handleBeforeUnload = () => {
      sessionStorage.removeItem(CRASH_FLAG_KEY);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sessionStorage.removeItem(CRASH_FLAG_KEY);
    };
  }, []);

  // Setup interval autosave
  useEffect(() => {
    intervalRef.current = setInterval(save, AUTOSAVE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [save]);

  // Setup idle save (on state changes)
  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      // Only trigger on actual changes
      if (state.isDirty && state.timeline !== prevState.timeline) {
        if (idleTimer.current) {
          clearTimeout(idleTimer.current);
        }

        idleTimer.current = setTimeout(save, IDLE_SAVE_DELAY_MS);
      }
    });

    return () => {
      unsubscribe();
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
    };
  }, [save]);

  return {
    saveNow: save,
    restore,
    clear,
    get lastSaveTime() {
      return lastSaveTime.current;
    },
  };
}
