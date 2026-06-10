import type { Layer } from '@vibe-creator/shared';
import {
  Download,
  FilePlus2,
  FolderOpen,
  Keyboard,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Redo2,
  RotateCcw,
  Save,
  Settings,
  Undo2,
  Wand2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui';
import { useModernExport } from '@/hooks/use-modern-export';
import {
  clearActiveModernEditorDraft,
  getModernEditorDrafts,
  type ModernEditorDraft,
  saveModernEditorDraft,
} from '@/lib/modern-editor-drafts';
import { cn } from '@/lib/utils';
import { useModernEditorStore } from '@/stores/modern-editor-store';
import { DEFAULT_PROJECT_TITLE } from '@/stores/modern-editor-store-helpers';
import { ExportPresetControl } from './ExportPresetControl';
import { ModernExportDialog } from './ModernExportDialog';

const DEFAULT_PROJECT_SETTINGS = {
  width: 1920,
  height: 1080,
} as const;

function createProjectId(): string {
  return `project-${Date.now()}`;
}

function hasExportableVisualLayer(layers: Record<string, Layer>): boolean {
  return Object.values(layers).some(
    (layer) => layer.visible && (layer.type === 'video' || layer.type === 'image'),
  );
}

interface ModernEditorHeaderProps {
  readonly isFocusMode?: boolean;
  readonly onOpenSettingsPanel?: () => void;
  readonly onResetEditorLayout?: () => void;
  readonly onToggleFocusMode?: () => void;
}

/**
 * Top command bar for Video Studio project workflow, export, and history controls.
 */
export function ModernEditorHeader({
  isFocusMode = false,
  onOpenSettingsPanel,
  onResetEditorLayout,
  onToggleFocusMode,
}: ModernEditorHeaderProps) {
  const {
    assets,
    canRedo,
    canUndo,
    getProject,
    initProject,
    isDirty,
    layersById,
    loadProject,
    markProjectSaved,
    projectTitle,
    redo,
    selectLayer,
    setProjectTitle,
    undo,
  } = useModernEditorStore();
  const {
    downloadExportResult,
    exportError,
    exportNotice,
    exportPhase,
    exportProgress,
    exportProject,
    exportResult,
    isExporting,
    resetExportState,
  } = useModernExport();

  const [titleValue, setTitleValue] = useState(projectTitle);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const [recentDrafts, setRecentDrafts] = useState<ModernEditorDraft[]>(() =>
    getModernEditorDrafts(),
  );
  const canExport = useMemo(() => hasExportableVisualLayer(layersById), [layersById]);
  const draftCount = recentDrafts.length;

  useEffect(() => {
    setTitleValue(projectTitle);
  }, [projectTitle]);

  useEffect(() => {
    if (!draftStatus) {
      return;
    }

    const timeoutId = window.setTimeout(() => setDraftStatus(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [draftStatus]);

  const commitTitle = () => {
    if (titleValue !== projectTitle) {
      setProjectTitle(titleValue);
    }
  };

  const createNewProject = () => {
    void clearActiveModernEditorDraft();
    initProject(createProjectId(), DEFAULT_PROJECT_TITLE, DEFAULT_PROJECT_SETTINGS);
    setDraftStatus(null);
    setIsResetOpen(false);
  };

  const handleNewProject = () => {
    if (isDirty || assets.length > 0 || Object.keys(layersById).length > 0) {
      setIsResetOpen(true);
      return;
    }

    createNewProject();
  };

  const handleSaveDraft = () => {
    try {
      const project = getProject();
      const draft = saveModernEditorDraft(project, assets);
      markProjectSaved();
      setRecentDrafts(getModernEditorDrafts());
      setDraftStatus(`Draft "${draft.title}" tersimpan.`);
    } catch (error) {
      setDraftStatus(
        error instanceof Error ? error.message : 'Draft gagal disimpan. Coba lagi sebentar.',
      );
    }
  };

  const openDraftsDialog = () => {
    const drafts = getModernEditorDrafts();
    setRecentDrafts(drafts);
    if (drafts.length === 0) {
      setDraftStatus('Belum ada draft lokal yang bisa dibuka.');
      return;
    }

    setIsDraftsOpen(true);
  };

  const handleLoadDraft = (draft: ModernEditorDraft) => {
    loadProject(draft.project, [...draft.assets]);
    setIsDraftsOpen(false);
    setDraftStatus(`Draft "${draft.title}" dibuka.`);
  };

  const handleExport = async () => {
    if (!canExport) {
      setDraftStatus('Tambahkan minimal satu video atau gambar sebelum export.');
      return;
    }

    setIsExportDialogOpen(true);
    await exportProject(getProject());
  };

  const handleExportDialogOpenChange = (open: boolean) => {
    if (isExporting) {
      return;
    }

    setIsExportDialogOpen(open);
    if (!open && !exportResult) {
      resetExportState();
    }
  };

  const handleEditBackFromExport = () => {
    setIsExportDialogOpen(false);
  };

  const handleRetryExport = () => {
    void handleExport();
  };

  const handleSettings = () => {
    selectLayer(null);
    onOpenSettingsPanel?.();
  };

  const handleResetEditorLayout = () => {
    onResetEditorLayout?.();
    setDraftStatus('Layout editor dikembalikan ke default.');
  };

  const statusMessage = draftStatus;

  return (
    <>
      <header
        className={cn(
          'h-16 border-b border-border/60 flex items-center justify-between px-4 md:px-6 bg-card/80 backdrop-blur-xl shrink-0 z-30 transition-all duration-300',
          'group-data-[sidebar-collapsed=true]/layout:lg:pl-12',
        )}
      >
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Wand2 size={22} className="text-primary" />
          </div>
          <div className="min-w-0">
            <input
              aria-label="Project title"
              className="h-7 w-44 rounded-lg bg-transparent px-1 text-sm font-black tracking-tight outline-none transition-colors focus:bg-muted/40 md:w-64 md:text-base"
              value={titleValue}
              onChange={(event) => setTitleValue(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }
              }}
            />
            <p className="px-1 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Video Studio {isDirty ? '• Unsaved' : '• Auto-saved'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Project actions"
                    className="h-10 w-10 rounded-xl"
                  >
                    <MoreHorizontal size={18} />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Project</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Project
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={handleNewProject}>
                <FilePlus2 size={16} />
                New Project
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleSaveDraft}>
                <Save size={16} />
                Save Draft
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={openDraftsDialog} disabled={draftCount === 0}>
                <FolderOpen size={16} />
                Load Drafts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden sm:flex items-center gap-1">
            <HeaderIconButton label="Undo" onClick={undo} disabled={!canUndo}>
              <Undo2 size={18} />
            </HeaderIconButton>
            <HeaderIconButton label="Redo" onClick={redo} disabled={!canRedo}>
              <Redo2 size={18} />
            </HeaderIconButton>
          </div>

          <div className="hidden sm:block w-px h-6 bg-border/60 mx-1" />

          <ExportPresetControl />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={isFocusMode ? 'secondary' : 'ghost'}
                aria-label={isFocusMode ? 'Exit focus mode' : 'Focus mode'}
                className="hidden h-10 w-10 rounded-xl md:inline-flex"
                onClick={onToggleFocusMode}
              >
                {isFocusMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isFocusMode ? 'Exit Focus Mode' : 'Focus Mode'}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editor settings"
                    className="h-10 w-10 rounded-xl"
                  >
                    <Settings size={18} />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Editor Settings</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Editor Settings
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={handleSettings}>
                <Settings size={16} />
                Canvas & Background
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleResetEditorLayout}>
                <RotateCcw size={16} />
                Reset Layout
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsShortcutsOpen(true)}>
                <Keyboard size={16} />
                Keyboard Shortcuts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  className="rounded-xl font-bold h-10 px-4 md:px-6 bg-primary text-primary-foreground transition-all active:scale-95"
                  onClick={handleExport}
                  isLoading={isExporting}
                  disabled={!canExport || isExporting}
                >
                  {!isExporting && <Download size={18} className="mr-1 md:mr-2" />}
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </span>
            </TooltipTrigger>
            {!canExport && <TooltipContent>Tambahkan video atau gambar dulu</TooltipContent>}
          </Tooltip>
        </div>
      </header>

      {statusMessage && (
        <div className="border-b border-border/50 bg-card/70 px-6 py-3 text-xs font-bold">
          <p className="text-muted-foreground">{statusMessage}</p>
        </div>
      )}

      <ModernExportDialog
        error={exportError}
        isExporting={isExporting}
        notice={exportNotice}
        onDownload={downloadExportResult}
        onEditBack={handleEditBackFromExport}
        onOpenChange={handleExportDialogOpenChange}
        onRetry={handleRetryExport}
        open={isExportDialogOpen}
        phase={exportPhase}
        progress={exportProgress}
        result={exportResult}
      />

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="rounded-2xl border-border/50 bg-card/95 p-0 backdrop-blur-2xl sm:max-w-md">
          <DialogHeader className="border-b border-border/40 p-6">
            <DialogTitle>Mulai project baru?</DialogTitle>
            <DialogDescription>
              Project aktif akan dikosongkan dari canvas, timeline, assets, dan history editing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 border-t border-border/40 p-6 sm:flex-row">
            <Button variant="outline" onClick={() => setIsResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={createNewProject}>
              New Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDraftsOpen} onOpenChange={setIsDraftsOpen}>
        <DialogContent className="rounded-2xl border-border/50 bg-card/95 p-0 backdrop-blur-2xl sm:max-w-lg">
          <DialogHeader className="border-b border-border/40 p-6">
            <DialogTitle>Recent Drafts</DialogTitle>
            <DialogDescription>Pilih draft lokal terakhir untuk lanjut editing.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-3 overflow-y-auto p-6">
            {recentDrafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                className="flex w-full items-center justify-between gap-4 rounded-xl border border-border/40 bg-background/40 p-4 text-left transition-all hover:border-primary/40 hover:bg-muted/30"
                onClick={() => handleLoadDraft(draft)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{draft.title}</span>
                  <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {formatDraftTimestamp(draft.savedAt)}
                  </span>
                </span>
                <FolderOpen size={18} className="shrink-0 text-primary" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen}>
        <DialogContent className="rounded-2xl border-border/50 bg-card/95 p-0 backdrop-blur-2xl sm:max-w-md">
          <DialogHeader className="border-b border-border/40 p-6">
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>Shortcut utama untuk editing lebih cepat.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 p-6">
            <ShortcutRow command="Space" label="Play / pause preview" />
            <ShortcutRow command="Delete" label="Hapus layer terpilih" />
            <ShortcutRow command="B" label="Split di playhead" />
            <ShortcutRow command="Cmd/Ctrl + D" label="Duplicate layer" />
            <ShortcutRow command="Cmd/Ctrl + Z" label="Undo" />
            <ShortcutRow command="Cmd/Ctrl + Shift + Z" label="Redo" />
            <ShortcutRow command="← / →" label="Geser layer terpilih" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ShortcutRow({ command, label }: Readonly<{ command: string; label: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-background/35 px-3 py-2.5">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <kbd className="shrink-0 rounded-lg border border-border/50 bg-muted/40 px-2 py-1 text-[11px] font-black text-foreground">
        {command}
      </kbd>
    </div>
  );
}

function formatDraftTimestamp(savedAt: string): string {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) {
    return 'Waktu tersimpan tidak tersedia';
  }

  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function HeaderIconButton({
  children,
  disabled,
  label,
  onClick,
}: Readonly<{
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={label}
          className="rounded-xl w-10 h-10"
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
