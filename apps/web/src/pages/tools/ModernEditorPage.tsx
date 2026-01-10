/**
 * Modern Video Editor Page (Video Studio)
 *
 * Canvas-based editor with layers, drag-drop, and modern UX.
 * Three-column layout: Assets | Canvas | Properties
 */

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui";
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

  useEffect(() => {
    initProject(`project-${Date.now()}`, "Untitled Project", {
      width: 1920,
      height: 1080,
    });
  }, [initProject]);

  usePlaybackLoop(isPlaying);

  const handleExportAction = async () => {
    const project = getProject();
    await exportProject(project);
  };

  const handleUndo = () => {
    // TODO: Implement undo
  };

  const handleRedo = () => {
    // TODO: Implement redo
  };

  const handleSettings = () => {
    selectLayer(null);
  };

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background overflow-hidden relative">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Wand2 size={20} className="text-primary" />
              <div>
                <h1 className="text-sm font-semibold leading-tight">
                  {projectTitle}
                  {isDirty && <span className="text-yellow-500 ml-1">•</span>}
                </h1>
                <p className="text-xs text-muted-foreground">Video Studio</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={handleUndo}>
                  <Undo2 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={handleRedo}>
                  <Redo2 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-border mx-2" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={handleSettings}>
                  <Settings size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>

            <Button
              size="sm"
              onClick={handleExportAction}
              isLoading={isExporting}
            >
              {!isExporting && <Download size={16} />}
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
            md:flex md:w-72 md:relative md:z-0 md:border-r md:border-border md:bg-card/30 flex-shrink-0 overflow-hidden flex-col
          `}
          >
            <div className="p-3 border-b border-border flex justify-between items-center">
              <h2 className="text-sm font-semibold">Assets</h2>
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
            md:flex md:w-80 md:relative md:z-0 md:border-l md:border-border md:bg-card/30 flex-shrink-0 overflow-hidden flex-col
          `}
          >
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Layers</h3>
                <LayerStack />
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Properties</h3>
                <PropertiesPanel />
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden h-16 bg-card border-t border-border flex items-center justify-around px-2 flex-shrink-0 z-50">
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 ${
              activeMobileTab === "assets"
                ? "text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveMobileTab("assets")}
          >
            <Images size={20} />
            <span className="text-[10px]">Assets</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 ${
              activeMobileTab === "canvas"
                ? "text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveMobileTab("canvas")}
          >
            <MonitorPlay size={20} />
            <span className="text-[10px]">Studio</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 ${
              activeMobileTab === "properties"
                ? "text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveMobileTab("properties")}
          >
            <SlidersHorizontal size={20} />
            <span className="text-[10px]">Edit</span>
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

function usePlaybackLoop(isPlaying: boolean) {
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;

        const state = useModernEditorStore.getState();
        const current = state.currentTimeMs;
        const max = Math.max(state.getMaxEndMs(), 5000);

        let next = current + deltaTime;

        if (next >= max) {
          next = max;
          state.pause();
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
      previousTimeRef.current = undefined;
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);
}
