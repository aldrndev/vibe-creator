/**
 * Modern Video Editor Page (Video Studio)
 *
 * Canvas-based editor with layers, drag-drop, and modern UX.
 * Three-column layout: Assets | Canvas | Properties
 */

import { useEffect, useRef, useState } from "react";
import { Button, Tooltip } from "@heroui/react";
import {
  Undo2,
  Redo2,
  Download,
  Settings,
  Wand2,
  Images,
  MonitorPlay,
  SlidersHorizontal,
} from "lucide-react";
import { useModernEditorStore } from "@/stores/modern-editor-store";
// Hook for modern export logic
import { useModernExport } from "@/hooks/use-modern-export";
import {
  EditorCanvas,
  AssetSidebar,
  PropertiesPanel,
  LayerStack,
  PlaybackBar,
} from "@/components/modern-editor";

export function ModernEditorPage() {
  const {
    initProject,
    projectTitle,
    isDirty,
    getProject,
    isPlaying,
    selectLayer,
  } = useModernEditorStore();

  const { exportProject, isExporting } = useModernExport();

  const [activeMobileTab, setActiveMobileTab] = useState<
    "assets" | "canvas" | "properties"
  >("canvas");

  // Initialize project on mount
  useEffect(() => {
    initProject(`project-${Date.now()}`, "Untitled Project", {
      width: 1920,
      height: 1080,
    });
  }, [initProject]);

  // Activate playback loop
  usePlaybackLoop(isPlaying);

  const handleExportAction = async () => {
    const project = getProject();
    await exportProject(project);
  };

  const handleUndo = () => {
    // TODO: Implement undo - UI feedback will be the visual state change
  };

  const handleRedo = () => {
    // TODO: Implement redo - UI feedback will be the visual state change
  };

  const handleSettings = () => {
    selectLayer(null); // Clear selection to show project settings in PropertiesPanel
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      {/* Header */}
      <header className="h-14 border-b border-divider flex items-center justify-between px-4 bg-content1/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Wand2 size={20} className="text-primary" />
            <div>
              <h1 className="text-sm font-semibold leading-tight">
                {projectTitle}
                {isDirty && <span className="text-warning ml-1">•</span>}
              </h1>
              <p className="text-xs text-foreground/50">Video Studio</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Undo">
            <Button isIconOnly variant="light" size="sm" onPress={handleUndo}>
              <Undo2 size={16} />
            </Button>
          </Tooltip>
          <Tooltip content="Redo">
            <Button isIconOnly variant="light" size="sm" onPress={handleRedo}>
              <Redo2 size={16} />
            </Button>
          </Tooltip>

          <div className="w-px h-6 bg-divider mx-2" />

          <Tooltip content="Settings">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={handleSettings}
            >
              <Settings size={16} />
            </Button>
          </Tooltip>

          <Button
            color="primary"
            size="sm"
            startContent={!isExporting && <Download size={16} />}
            onPress={handleExportAction}
            isLoading={isExporting}
          >
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Sidebar - Assets */}
        <aside
          className={`
            ${
              activeMobileTab === "assets"
                ? "flex w-full absolute inset-0 z-20 bg-background"
                : "hidden"
            } 
            md:flex md:w-72 md:relative md:z-0 md:border-r md:border-divider md:bg-content1/30 flex-shrink-0 overflow-hidden flex-col
          `}
        >
          <div className="p-3 border-b border-divider flex justify-between items-center">
            <h2 className="text-sm font-semibold">Assets</h2>
            {/* Mobile close/back button could go here, but tab switching deals with it */}
          </div>
          <div className="flex-1 flex flex-col overflow-hidden p-3">
            <AssetSidebar className="h-full" />
          </div>
        </aside>

        {/* Center - Canvas */}
        <main
          className={`
            ${activeMobileTab === "canvas" ? "flex" : "hidden"} 
            md:flex flex-1 flex-col overflow-hidden relative z-10 bg-background/50
          `}
        >
          <EditorCanvas className="flex-1" />
          <PlaybackBar />
        </main>

        {/* Right Sidebar - Properties & Layers */}
        <aside
          className={`
            ${
              activeMobileTab === "properties"
                ? "flex w-full absolute inset-0 z-20 bg-background"
                : "hidden"
            } 
            md:flex md:w-80 md:relative md:z-0 md:border-l md:border-divider md:bg-content1/30 flex-shrink-0 overflow-hidden flex-col
          `}
        >
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Layers */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Layers</h3>
              <LayerStack />
            </div>

            {/* Properties */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Properties</h3>
              <PropertiesPanel />
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden h-16 bg-content1 border-t border-divider flex items-center justify-around px-2 flex-shrink-0 z-50">
        <Button
          variant="light"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            activeMobileTab === "assets" ? "text-primary" : "text-foreground/50"
          }`}
          onPress={() => setActiveMobileTab("assets")}
        >
          <Images size={20} />
          <span className="text-[10px]">Assets</span>
        </Button>
        <Button
          variant="light"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            activeMobileTab === "canvas" ? "text-primary" : "text-foreground/50"
          }`}
          onPress={() => setActiveMobileTab("canvas")}
        >
          <MonitorPlay size={20} />
          <span className="text-[10px]">Studio</span>
        </Button>
        <Button
          variant="light"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            activeMobileTab === "properties"
              ? "text-primary"
              : "text-foreground/50"
          }`}
          onPress={() => setActiveMobileTab("properties")}
        >
          <SlidersHorizontal size={20} />
          <span className="text-[10px]">Edit</span>
        </Button>
      </div>
    </div>
  );
}

// Helper hook for playback loop to avoid stale closures
function usePlaybackLoop(isPlaying: boolean) {
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number | undefined>(undefined);

  // We use a ref for the animate function to avoid dependency cycles,
  // but the animate function needs to read fresh state.
  // Ideally we just define it inside useEffect but we need access to the refs.

  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;

        // Read fresh state directly from store to avoid closure staleness
        const state = useModernEditorStore.getState();
        const current = state.currentTimeMs;
        const max = Math.max(state.getMaxEndMs(), 5000); // Min 5s

        let next = current + deltaTime;

        if (next >= max) {
          next = max;
          state.pause(); // Stop loop via store action
          // Don't request next frame if we paused
        } else {
          requestRef.current = requestAnimationFrame(animate);
        }

        state.setCurrentTime(next);
      } else {
        requestRef.current = requestAnimationFrame(animate);
      }
      previousTimeRef.current = time;
    };

    if (isPlaying) {
      previousTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      previousTimeRef.current = undefined; // Reset time ref so next play starts fresh delta
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);
}
