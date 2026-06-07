import { useEffect, useRef, useState } from 'react';
import {
  type MobileEditorTab,
  ModernEditorHeader,
  ModernEditorWorkspaceLayout,
} from '@/components/modern-editor';
import { resolveFocusPanelVisibility } from '@/components/modern-editor/focus-panel-utils';
import { TooltipProvider } from '@/components/ui';
import { ContinueWorkspaceDialog } from '@/components/workspace/ContinueWorkspaceDialog';
import { useModernEditorAutosave } from '@/hooks/use-modern-editor-autosave';
import { useModernEditorShortcuts } from '@/hooks/use-modern-editor-shortcuts';
import {
  loadActiveModernEditorDraft,
  type ModernEditorRestoredDraft,
} from '@/lib/modern-editor-drafts';
import { resolveHydratedModernEditorProject } from '@/lib/modern-editor-hydration';
import { useMutableSearchParams } from '@/lib/route-search';
import {
  isLocalVideoStudioSessionId,
  loadVideoStudioProjectSession,
} from '@/services/video-studio-project-api';
import { useModernEditorStore } from '@/stores/modern-editor-store';
import { DEFAULT_PROJECT_TITLE } from '@/stores/modern-editor-store-helpers';

const DEFAULT_VIDEO_STUDIO_SETTINGS = { width: 1920, height: 1080 } as const;

async function handleSessionHydrationError(
  sessionParam: string,
  localDraft: ModernEditorRestoredDraft | null,
  initProject: ReturnType<typeof useModernEditorStore.getState>['initProject'],
  loadProject: ReturnType<typeof useModernEditorStore.getState>['loadProject'],
  setHydrationError: (err: string | null) => void,
) {
  if (localDraft?.project.id === sessionParam) {
    loadProject(localDraft.project, localDraft.assets);
    setHydrationError('Backend belum bisa diakses, jadi draft lokal terakhir dipakai.');
    return;
  }

  setHydrationError('Session Video Studio tidak ditemukan. Project baru disiapkan.');
  initProject(`project-${Date.now()}`, DEFAULT_PROJECT_TITLE, DEFAULT_VIDEO_STUDIO_SETTINGS);
}

async function hydrateSessionFromBackend(
  sessionParam: string,
  localDraft: ModernEditorRestoredDraft | null,
  initProject: ReturnType<typeof useModernEditorStore.getState>['initProject'],
  loadProject: ReturnType<typeof useModernEditorStore.getState>['loadProject'],
  setHydrationError: (err: string | null) => void,
  isCancelled: () => boolean,
) {
  try {
    const session = await loadVideoStudioProjectSession(sessionParam);
    if (isCancelled()) return;

    const hydratedProject = resolveHydratedModernEditorProject(session, localDraft);
    loadProject(hydratedProject.project, hydratedProject.assets);
    setHydrationError(null);
  } catch {
    if (isCancelled()) return;
    await handleSessionHydrationError(
      sessionParam,
      localDraft,
      initProject,
      loadProject,
      setHydrationError,
    );
  }
}

async function hydrateEditorProject(
  sessionParam: string | null,
  localDraft: ModernEditorRestoredDraft | null,
  initProject: ReturnType<typeof useModernEditorStore.getState>['initProject'],
  loadProject: ReturnType<typeof useModernEditorStore.getState>['loadProject'],
  setHydrationError: (err: string | null) => void,
  isCancelled: () => boolean,
) {
  if (sessionParam && isLocalVideoStudioSessionId(sessionParam)) {
    if (localDraft?.project.id === sessionParam) {
      loadProject(localDraft.project, localDraft.assets);
    } else {
      initProject(sessionParam, DEFAULT_PROJECT_TITLE, DEFAULT_VIDEO_STUDIO_SETTINGS);
    }
    setHydrationError(null);
    return;
  }

  if (sessionParam) {
    await hydrateSessionFromBackend(
      sessionParam,
      localDraft,
      initProject,
      loadProject,
      setHydrationError,
      isCancelled,
    );
    return;
  }

  if (!isCancelled()) {
    initProject(`project-${Date.now()}`, DEFAULT_PROJECT_TITLE, DEFAULT_VIDEO_STUDIO_SETTINGS);
  }
}

function syncEditorUrlParams(
  projectId: string | null,
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams, options: { replace: boolean }) => void,
) {
  const nextSearchParams = new URLSearchParams(searchParams);
  const urlProjectParam = nextSearchParams.get('project');
  const urlSessionParam = nextSearchParams.get('session');

  if (projectId && isLocalVideoStudioSessionId(projectId)) {
    if (!urlProjectParam) return;
    if (urlProjectParam !== projectId || urlSessionParam) {
      nextSearchParams.set('project', projectId);
      nextSearchParams.delete('session');
      setSearchParams(nextSearchParams, { replace: true });
    }
    return;
  }

  if (projectId && (urlSessionParam !== projectId || urlProjectParam)) {
    nextSearchParams.set('session', projectId);
    nextSearchParams.delete('project');
    setSearchParams(nextSearchParams, { replace: true });
    return;
  }

  if (!projectId && (urlSessionParam || urlProjectParam)) {
    nextSearchParams.delete('session');
    nextSearchParams.delete('project');
    setSearchParams(nextSearchParams, { replace: true });
  }
}

export function ModernEditorPage() {
  const [searchParams, setSearchParams] = useMutableSearchParams();
  const { initProject, isPlaying, layerOrder, loadProject, selectedLayerId } =
    useModernEditorStore();
  const projectId = useModernEditorStore((state) => state.projectId);

  const [activeMobileTab, setActiveMobileTab] = useState<MobileEditorTab>('canvas');

  const [isHydratingDraft, setIsHydratingDraft] = useState(true);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const pendingSessionHydrationRef = useRef<string | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isLeftPanelPinned, setIsLeftPanelPinned] = useState(false);
  const [isRightPanelPinned, setIsRightPanelPinned] = useState(false);
  const [focusLeftPanelOpen, setFocusLeftPanelOpen] = useState(false);
  const [focusRightPanelOpen, setFocusRightPanelOpen] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<'inspector' | 'canvas'>('inspector');
  const hasLayers = layerOrder.length > 0;
  const sessionParam = searchParams.get('session') ?? searchParams.get('project');
  const [openedWithoutSession] = useState(!sessionParam);
  const [showContinuePrompt, setShowContinuePrompt] = useState(openedWithoutSession);
  const isWorkspaceChoicePending = showContinuePrompt && !sessionParam;
  const isLeftPanelOpen = resolveFocusPanelVisibility({
    isFocusMode,
    isHoverOpen: focusLeftPanelOpen,
    isPanelVisible: showLeftPanel,
    isPinned: isLeftPanelPinned,
  });
  const isRightPanelOpen = resolveFocusPanelVisibility({
    isFocusMode,
    isHoverOpen: focusRightPanelOpen,
    isPanelVisible: showRightPanel,
    isPinned: isRightPanelPinned,
  });

  const toggleFocusMode = () => {
    const nextFocusMode = !isFocusMode;

    setFocusLeftPanelOpen(false);
    setFocusRightPanelOpen(false);
    setIsLeftPanelPinned(false);
    setIsRightPanelPinned(false);

    if (!nextFocusMode) {
      setShowLeftPanel(true);
      setShowRightPanel(true);
    }

    setIsFocusMode(nextFocusMode);
  };

  const resetEditorLayout = () => {
    setActiveMobileTab('canvas');
    setFocusLeftPanelOpen(false);
    setFocusRightPanelOpen(false);
    setIsFocusMode(false);
    setIsLeftPanelPinned(false);
    setIsRightPanelPinned(false);
    setRightPanelMode('inspector');
    setShowLeftPanel(true);
    setShowRightPanel(true);
  };

  const closeLeftPanel = () => {
    if (isFocusMode) {
      setFocusLeftPanelOpen(false);
      setIsLeftPanelPinned(false);
      return;
    }

    setShowLeftPanel(false);
  };

  const closeRightPanel = () => {
    if (isFocusMode) {
      setFocusRightPanelOpen(false);
      setIsRightPanelPinned(false);
      return;
    }

    setShowRightPanel(false);
  };

  const openLeftPanel = () => {
    if (isFocusMode) {
      setFocusLeftPanelOpen(true);
      return;
    }

    setShowLeftPanel(true);
  };

  const openRightPanel = () => {
    if (isFocusMode) {
      setFocusRightPanelOpen(true);
      return;
    }

    setShowRightPanel(true);
  };

  const handleFocusLeftPanelEnter = () => {
    if (isFocusMode) {
      setFocusLeftPanelOpen(true);
    }
  };

  const handleFocusLeftPanelLeave = () => {
    if (isFocusMode && !isLeftPanelPinned) {
      setFocusLeftPanelOpen(false);
    }
  };

  const handleFocusRightPanelEnter = () => {
    if (isFocusMode) {
      setFocusRightPanelOpen(true);
    }
  };

  const handleFocusRightPanelLeave = () => {
    if (isFocusMode && !isRightPanelPinned) {
      setFocusRightPanelOpen(false);
    }
  };

  useEffect(() => {
    if (sessionParam && !isLocalVideoStudioSessionId(sessionParam)) {
      setShowContinuePrompt(false);
    }
  }, [sessionParam]);

  useEffect(() => {
    if (sessionParam && useModernEditorStore.getState().projectId === sessionParam) {
      pendingSessionHydrationRef.current = null;
      setIsHydratingDraft(false);
      return undefined;
    }

    let isCancelled = false;
    pendingSessionHydrationRef.current = sessionParam;
    setIsHydratingDraft(true);

    const performHydration = async () => {
      let localDraft: ModernEditorRestoredDraft | null = null;
      try {
        localDraft = await loadActiveModernEditorDraft();
      } catch {
        localDraft = null;
      }

      if (isCancelled) return;

      await hydrateEditorProject(
        sessionParam,
        localDraft,
        initProject,
        loadProject,
        setHydrationError,
        () => isCancelled,
      );
    };

    void performHydration().finally(() => {
      if (!isCancelled) {
        pendingSessionHydrationRef.current = null;
        setIsHydratingDraft(false);
      }
    });

    return () => {
      isCancelled = true;
      pendingSessionHydrationRef.current = null;
    };
  }, [initProject, loadProject, sessionParam]);

  useEffect(() => {
    if (isHydratingDraft || pendingSessionHydrationRef.current || isWorkspaceChoicePending) {
      return;
    }

    syncEditorUrlParams(projectId, searchParams, setSearchParams);
  }, [isHydratingDraft, isWorkspaceChoicePending, projectId, searchParams, setSearchParams]);

  useEffect(() => {
    if (selectedLayerId) {
      setRightPanelMode('inspector');
      if (!isFocusMode) {
        setShowRightPanel(true);
      }
    }
  }, [isFocusMode, selectedLayerId]);

  usePlaybackLoop(isPlaying);
  useModernEditorShortcuts();
  useModernEditorAutosave({ enabled: !isHydratingDraft && !isWorkspaceChoicePending });

  if (isHydratingDraft) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-sm font-bold text-muted-foreground">
        Memulihkan draft Video Studio...
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background overflow-hidden relative">
        <ModernEditorHeader
          isFocusMode={isFocusMode}
          onOpenSettingsPanel={() => {
            setRightPanelMode('canvas');
            openRightPanel();
          }}
          onResetEditorLayout={resetEditorLayout}
          onToggleFocusMode={toggleFocusMode}
        />

        {hydrationError && (
          <div className="border-b border-border/50 bg-amber-500/10 px-6 py-3 text-xs font-bold text-amber-200">
            {hydrationError}
          </div>
        )}

        {showContinuePrompt && (
          <ContinueWorkspaceDialog
            tool="video-studio"
            onStartNew={() => {
              const nextSearchParams = new URLSearchParams(searchParams);
              nextSearchParams.delete('session');
              nextSearchParams.delete('project');
              setSearchParams(nextSearchParams, { replace: true });
              setShowContinuePrompt(false);
              initProject(
                `project-${Date.now()}`,
                DEFAULT_PROJECT_TITLE,
                DEFAULT_VIDEO_STUDIO_SETTINGS,
              );
            }}
            onUnavailable={() => {
              setShowContinuePrompt(false);
            }}
          />
        )}

        <ModernEditorWorkspaceLayout
          activeMobileTab={activeMobileTab}
          hasLayers={hasLayers}
          isFocusMode={isFocusMode}
          isLeftPanelOpen={isLeftPanelOpen}
          isLeftPanelPinned={isLeftPanelPinned}
          isRightPanelOpen={isRightPanelOpen}
          isRightPanelPinned={isRightPanelPinned}
          layerCount={layerOrder.length}
          rightPanelMode={rightPanelMode}
          selectedLayerId={selectedLayerId}
          onCloseLeftPanel={closeLeftPanel}
          onCloseRightPanel={closeRightPanel}
          onFocusLeftPanelEnter={handleFocusLeftPanelEnter}
          onFocusLeftPanelLeave={handleFocusLeftPanelLeave}
          onFocusRightPanelEnter={handleFocusRightPanelEnter}
          onFocusRightPanelLeave={handleFocusRightPanelLeave}
          onRevealLeftPanel={openLeftPanel}
          onRevealRightPanel={openRightPanel}
          onSetMobileTab={setActiveMobileTab}
          onToggleLeftPanelPinned={() => setIsLeftPanelPinned((current) => !current)}
          onToggleRightPanelPinned={() => setIsRightPanelPinned((current) => !current)}
        />
      </div>
    </TooltipProvider>
  );
}

function usePlaybackLoop(isPlaying: boolean) {
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current === undefined) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
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
