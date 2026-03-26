/**
 * Modern Video Editor Page (Video Studio)
 *
 * Canvas-based editor with layers, drag-drop, and modern UX.
 * Three-column layout: Assets | Canvas | Properties
 */

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Images,
  MonitorPlay,
  Redo2,
  Settings,
  SlidersHorizontal,
  Undo2,
  Wand2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  AssetSidebar,
  EditorCanvas,
  LayerStack,
  PlaybackBar,
  PropertiesPanel,
} from '@/components/modern-editor';
import {
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';
import { useModernExport } from '@/hooks/use-modern-export';
import { cn } from '@/lib/utils';
import { useModernEditorStore } from '@/stores/modern-editor-store';

export function ModernEditorPage() {
  const { initProject, projectTitle, isDirty, getProject, isPlaying, selectLayer } =
    useModernEditorStore();

  const { exportProject, isExporting } = useModernExport();

  const [activeMobileTab, setActiveMobileTab] = useState<'assets' | 'canvas' | 'properties'>(
    'canvas',
  );

  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  useEffect(() => {
    initProject(`project-${Date.now()}`, 'Untitled Project', {
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
        <header className="h-16 border-b border-border/60 flex items-center justify-between px-6 bg-card/80 backdrop-blur-xl flex-shrink-0 z-30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wand2 size={22} className="text-primary" />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-black tracking-tight leading-tight">
                  {projectTitle}
                  {isDirty && <span className="text-primary ml-1.5">•</span>}
                </h1>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Video Studio
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-xl w-10 h-10"
                    onClick={handleUndo}
                  >
                    <Undo2 size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-xl w-10 h-10"
                    onClick={handleRedo}
                  >
                    <Redo2 size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo</TooltipContent>
              </Tooltip>
            </div>

            <div className="hidden sm:block w-px h-6 bg-border/60 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-xl w-10 h-10"
                  onClick={handleSettings}
                >
                  <Settings size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>

            <Button
              size="sm"
              className="rounded-xl font-bold h-10 px-6 bg-primary text-primary-foreground transition-all active:scale-95"
              onClick={handleExportAction}
              isLoading={isExporting}
            >
              {!isExporting && <Download size={18} className="mr-2" />}
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Left Sidebar - Assets */}
          <aside
            className={cn(
              activeMobileTab === 'assets'
                ? 'flex w-full absolute inset-0 z-30 bg-background'
                : 'hidden',
              'md:w-[320px] md:relative md:z-20 md:border-r md:border-border/60 md:bg-card/70 flex-shrink-0 overflow-hidden flex-col transition-all duration-300',
              showLeftPanel ? 'md:flex' : 'md:hidden',
            )}
          >
            <div className="h-14 px-4 border-b border-border/40 flex justify-between items-center bg-card/20">
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 uppercase pl-2">
                <Images size={16} className="text-primary" />
                Media Assets
              </h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hidden md:flex"
                    onClick={() => setShowLeftPanel(false)}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Hide Menu</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <AssetSidebar className="h-full" />
            </div>
          </aside>

          {/* Center - Canvas */}
          <main
            className={cn(
              activeMobileTab === 'canvas' ? 'flex' : 'hidden',
              'md:flex flex-1 flex-col overflow-hidden relative z-10 bg-background',
            )}
          >
            {/* Left Expand Handle */}
            <div
              className={cn(
                'absolute left-0 top-1/2 -translate-y-1/2 z-50 hidden md:flex',
                showLeftPanel ? 'pointer-events-none opacity-0' : 'opacity-100',
              )}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-12 w-8 rounded-r-xl rounded-l-none border-y border-r border-border/60 bg-muted/80 backdrop-blur-md shadow-md transition-all"
                    onClick={() => setShowLeftPanel(true)}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Show Menu</TooltipContent>
              </Tooltip>
            </div>

            {/* Right Expand Handle */}
            <div
              className={cn(
                'absolute right-0 top-1/2 -translate-y-1/2 z-50 hidden md:flex',
                showRightPanel ? 'pointer-events-none opacity-0' : 'opacity-100',
              )}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-12 w-8 rounded-l-xl rounded-r-none border-y border-l border-border/60 bg-muted/80 backdrop-blur-md shadow-md transition-all"
                    onClick={() => setShowRightPanel(true)}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Show Menu</TooltipContent>
              </Tooltip>
            </div>

            <EditorCanvas className="flex-1" />
            <PlaybackBar />
          </main>

          {/* Right Sidebar - Properties & Layers */}
          <aside
            className={cn(
              activeMobileTab === 'properties'
                ? 'flex w-full absolute inset-0 z-30 bg-background'
                : 'hidden',
              'md:w-[360px] md:relative md:z-20 md:border-l md:border-border/60 md:bg-card/70 flex-shrink-0 overflow-hidden flex-col transition-all duration-300',
              showRightPanel ? 'md:flex' : 'md:hidden',
            )}
          >
            <div className="h-14 px-4 border-b border-border/40 flex justify-between items-center bg-card/20">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hidden md:flex"
                    onClick={() => setShowRightPanel(false)}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Hide Menu</TooltipContent>
              </Tooltip>
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 uppercase pr-2">
                Settings & Layers
                <SlidersHorizontal size={16} className="text-primary" />
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="p-6 space-y-8">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center justify-between">
                    Layers Stack
                    <Badge variant="outline" className="text-[10px]">
                      Auto-saved
                    </Badge>
                  </h3>
                  <LayerStack />
                </div>

                <div className="pt-6 border-t border-border/30">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                    Element Properties
                  </h3>
                  <PropertiesPanel />
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden h-20 bg-card/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-around px-2 flex-shrink-0 z-50 safe-area-bottom">
          <button
            type="button"
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-full transition-all active:scale-95 ${
              activeMobileTab === 'assets' ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveMobileTab('assets')}
          >
            <div
              className={cn(
                'p-2 rounded-xl transition-all',
                activeMobileTab === 'assets' && 'bg-primary/10',
              )}
            >
              <Images size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tight">Assets</span>
          </button>

          <button
            type="button"
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-full transition-all active:scale-95 ${
              activeMobileTab === 'canvas' ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveMobileTab('canvas')}
          >
            <div
              className={cn(
                'p-2 rounded-xl transition-all',
                activeMobileTab === 'canvas' && 'bg-primary/10',
              )}
            >
              <MonitorPlay size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tight">Studio</span>
          </button>

          <button
            type="button"
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-full transition-all active:scale-95 ${
              activeMobileTab === 'properties' ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveMobileTab('properties')}
          >
            <div
              className={cn(
                'p-2 rounded-xl transition-all',
                activeMobileTab === 'properties' && 'bg-primary/10',
              )}
            >
              <SlidersHorizontal size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tight">Edit</span>
          </button>
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
