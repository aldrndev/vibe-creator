import { useCallback, useRef, useEffect, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";

// Performance constants
const MAX_HISTORY_SIZE_MB = 10;
const MAX_HISTORY_STATES = 50;
const MEMORY_CHECK_INTERVAL = 5000;

interface HistoryCommand {
  type:
    | "ADD_CLIP"
    | "REMOVE_CLIP"
    | "MOVE_CLIP"
    | "ADD_TEXT"
    | "REMOVE_TEXT"
    | "ADD_TRACK"
    | "REMOVE_TRACK";
  payload: unknown;
  undo: () => void;
  redo: () => void;
  timestamp: number;
}

interface EditorSnapshot {
  timeline: ReturnType<typeof useEditorStore.getState>["timeline"];
  textOverlays: ReturnType<typeof useEditorStore.getState>["textOverlays"];
  assets: ReturnType<typeof useEditorStore.getState>["assets"];
  timestamp: number;
  sizeBytes: number;
}

interface UseHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  pushCommand: (command: Omit<HistoryCommand, "timestamp">) => void;
  saveSnapshot: () => void;
  clearHistory: () => void;
  historySize: number;
  memorySizeMB: number;
}

/**
 * Hybrid undo/redo hook
 * - Command-based for structural changes (add/remove clips)
 * - Snapshot-based for param changes (via debounced save)
 * - Memory-capped to MAX_HISTORY_SIZE_MB
 */
export function useHistory(): UseHistoryReturn {
  // Command history stack (for structural changes)
  const commandHistory = useRef<HistoryCommand[]>([]);
  const commandFuture = useRef<HistoryCommand[]>([]);

  // Snapshot history (for param changes)
  const snapshotHistory = useRef<EditorSnapshot[]>([]);
  const snapshotFuture = useRef<EditorSnapshot[]>([]);

  const [, setVersion] = useState(0);
  const totalMemoryBytes = useRef(0);

  // Estimate object size in bytes
  const estimateSize = useCallback((obj: unknown): number => {
    const str = JSON.stringify(obj);
    return str ? str.length * 2 : 0; // UTF-16 ≈ 2 bytes per char
  }, []);

  // Trim history to stay within memory limit
  const trimHistoryToMemoryLimit = useCallback(() => {
    const maxBytes = MAX_HISTORY_SIZE_MB * 1024 * 1024;

    while (
      totalMemoryBytes.current > maxBytes &&
      snapshotHistory.current.length > 1
    ) {
      const removed = snapshotHistory.current.shift();
      if (removed) {
        totalMemoryBytes.current -= removed.sizeBytes;
      }
    }
  }, [totalMemoryBytes]);

  // Save current state as snapshot
  const saveSnapshot = useCallback(() => {
    const state = useEditorStore.getState();
    const snapshot: EditorSnapshot = {
      timeline: JSON.parse(JSON.stringify(state.timeline)),
      textOverlays: JSON.parse(JSON.stringify(state.textOverlays)),
      assets: state.assets.map((a) => ({ ...a, file: undefined })), // exclude File objects
      timestamp: Date.now(),
      sizeBytes: 0,
    };

    snapshot.sizeBytes = estimateSize(snapshot);
    totalMemoryBytes.current += snapshot.sizeBytes;

    snapshotHistory.current.push(snapshot);
    snapshotFuture.current = []; // Clear redo stack

    // Trim if over limits
    if (snapshotHistory.current.length > MAX_HISTORY_STATES) {
      const removed = snapshotHistory.current.shift();
      if (removed) {
        totalMemoryBytes.current -= removed.sizeBytes;
      }
    }

    trimHistoryToMemoryLimit();
    setVersion((v) => v + 1);
  }, [estimateSize, trimHistoryToMemoryLimit]);

  // Push a command for structural changes
  const pushCommand = useCallback(
    (cmd: Omit<HistoryCommand, "timestamp">) => {
      const command: HistoryCommand = {
        ...cmd,
        timestamp: Date.now(),
      };

      commandHistory.current.push(command);
      commandFuture.current = []; // Clear redo stack

      // Also save snapshot for safety
      saveSnapshot();
    },
    [saveSnapshot]
  );

  // Undo last action
  const undo = useCallback(() => {
    // First try command undo
    if (commandHistory.current.length > 0) {
      const cmd = commandHistory.current.pop();
      if (cmd) {
        cmd.undo();
        commandFuture.current.push(cmd);
        setVersion((v) => v + 1);
        return;
      }
    }

    // Fall back to snapshot restore
    if (snapshotHistory.current.length > 1) {
      const current = snapshotHistory.current.pop();
      if (current) {
        snapshotFuture.current.push(current);
        totalMemoryBytes.current -= current.sizeBytes;
      }

      const previous =
        snapshotHistory.current[snapshotHistory.current.length - 1];
      if (previous) {
        // Restore state - this is a partial restore
        useEditorStore.setState({
          timeline: JSON.parse(JSON.stringify(previous.timeline)),
          textOverlays: JSON.parse(JSON.stringify(previous.textOverlays)),
        });
      }
      setVersion((v) => v + 1);
    }
  }, []);

  // Redo last undone action
  const redo = useCallback(() => {
    // First try command redo
    if (commandFuture.current.length > 0) {
      const cmd = commandFuture.current.pop();
      if (cmd) {
        cmd.redo();
        commandHistory.current.push(cmd);
        setVersion((v) => v + 1);
        return;
      }
    }

    // Fall back to snapshot restore
    if (snapshotFuture.current.length > 0) {
      const next = snapshotFuture.current.pop();
      if (next) {
        snapshotHistory.current.push(next);
        totalMemoryBytes.current += next.sizeBytes;

        useEditorStore.setState({
          timeline: JSON.parse(JSON.stringify(next.timeline)),
          textOverlays: JSON.parse(JSON.stringify(next.textOverlays)),
        });
      }
      setVersion((v) => v + 1);
    }
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    commandHistory.current = [];
    commandFuture.current = [];
    snapshotHistory.current = [];
    snapshotFuture.current = [];
    totalMemoryBytes.current = 0;
    setVersion((v) => v + 1);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Cmd/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Cmd/Ctrl + Shift + Z = Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }

      // Cmd/Ctrl + Y = Redo (Windows style)
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Periodic memory check
  useEffect(() => {
    const interval = setInterval(() => {
      trimHistoryToMemoryLimit();
    }, MEMORY_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [trimHistoryToMemoryLimit]);

  return {
    canUndo:
      commandHistory.current.length > 0 || snapshotHistory.current.length > 1,
    canRedo:
      commandFuture.current.length > 0 || snapshotFuture.current.length > 0,
    undo,
    redo,
    pushCommand,
    saveSnapshot,
    clearHistory,
    historySize: commandHistory.current.length + snapshotHistory.current.length,
    memorySizeMB: totalMemoryBytes.current / (1024 * 1024),
  };
}
