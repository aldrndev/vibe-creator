import {
  ChevronLeft,
  ChevronRight,
  Images,
  MonitorPlay,
  Pin,
  PinOff,
  SlidersHorizontal,
} from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { Badge, Button, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui';
import { cn } from '@/lib/utils';
import { AssetSidebar } from './AssetSidebar';
import { EditorCanvas } from './EditorCanvas';
import { LayerStack } from './LayerStack';
import { ModernTimeline } from './ModernTimeline';
import { PlaybackBar } from './PlaybackBar';
import { PropertiesPanel } from './PropertiesPanel';

export type MobileEditorTab = 'assets' | 'canvas' | 'properties';
type RightPanelMode = 'inspector' | 'canvas';

interface ModernEditorWorkspaceLayoutProps {
  readonly activeMobileTab: MobileEditorTab;
  readonly hasLayers: boolean;
  readonly isFocusMode: boolean;
  readonly isLeftPanelOpen: boolean;
  readonly isLeftPanelPinned: boolean;
  readonly isRightPanelOpen: boolean;
  readonly isRightPanelPinned: boolean;
  readonly layerCount: number;
  readonly rightPanelMode: RightPanelMode;
  readonly selectedLayerId: string | null;
  readonly onCloseLeftPanel: () => void;
  readonly onCloseRightPanel: () => void;
  readonly onFocusLeftPanelEnter: () => void;
  readonly onFocusLeftPanelLeave: () => void;
  readonly onFocusRightPanelEnter: () => void;
  readonly onFocusRightPanelLeave: () => void;
  readonly onRevealLeftPanel: () => void;
  readonly onRevealRightPanel: () => void;
  readonly onSetMobileTab: (tab: MobileEditorTab) => void;
  readonly onToggleLeftPanelPinned: () => void;
  readonly onToggleRightPanelPinned: () => void;
}

export function ModernEditorWorkspaceLayout({
  activeMobileTab,
  hasLayers,
  isFocusMode,
  isLeftPanelOpen,
  isLeftPanelPinned,
  isRightPanelOpen,
  isRightPanelPinned,
  layerCount,
  rightPanelMode,
  selectedLayerId,
  onCloseLeftPanel,
  onCloseRightPanel,
  onFocusLeftPanelEnter,
  onFocusLeftPanelLeave,
  onFocusRightPanelEnter,
  onFocusRightPanelLeave,
  onRevealLeftPanel,
  onRevealRightPanel,
  onSetMobileTab,
  onToggleLeftPanelPinned,
  onToggleRightPanelPinned,
}: ModernEditorWorkspaceLayoutProps) {
  return (
    <>
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <StudioKitPanel
          activeMobileTab={activeMobileTab}
          isFocusMode={isFocusMode}
          isOpen={isLeftPanelOpen}
          isPinned={isLeftPanelPinned}
          onClose={onCloseLeftPanel}
          onMouseEnter={onFocusLeftPanelEnter}
          onMouseLeave={onFocusLeftPanelLeave}
          onTogglePinned={onToggleLeftPanelPinned}
        />

        <main
          className={cn(
            activeMobileTab === 'canvas' ? 'flex' : 'hidden',
            'md:flex flex-1 flex-col overflow-hidden relative z-10 bg-background',
          )}
        >
          <FocusRevealRail
            direction="left"
            isFocusMode={isFocusMode}
            isOpen={isLeftPanelOpen}
            label={isFocusMode ? 'Studio Kit' : 'Show Menu'}
            onMouseEnter={onFocusLeftPanelEnter}
            onReveal={onRevealLeftPanel}
          />

          <FocusRevealRail
            direction="right"
            isFocusMode={isFocusMode}
            isOpen={isRightPanelOpen}
            label={isFocusMode ? 'Edit Panel' : 'Show Menu'}
            onMouseEnter={onFocusRightPanelEnter}
            onReveal={onRevealRightPanel}
          />

          <div className="relative flex min-h-0 flex-1">
            <EditorCanvas className="flex-1" isFocusMode={isFocusMode} />
          </div>
          <ModernTimeline isFocusMode={isFocusMode} />
          <PlaybackBar />
        </main>

        <EditPanel
          activeMobileTab={activeMobileTab}
          hasLayers={hasLayers}
          isFocusMode={isFocusMode}
          isOpen={isRightPanelOpen}
          isPinned={isRightPanelPinned}
          layerCount={layerCount}
          rightPanelMode={rightPanelMode}
          selectedLayerId={selectedLayerId}
          onClose={onCloseRightPanel}
          onMouseEnter={onFocusRightPanelEnter}
          onMouseLeave={onFocusRightPanelLeave}
          onTogglePinned={onToggleRightPanelPinned}
        />
      </div>

      <MobileEditorTabs activeMobileTab={activeMobileTab} onSetMobileTab={onSetMobileTab} />
    </>
  );
}

function StudioKitPanel({
  activeMobileTab,
  isFocusMode,
  isOpen,
  isPinned,
  onClose,
  onMouseEnter,
  onMouseLeave,
  onTogglePinned,
}: Readonly<{
  activeMobileTab: MobileEditorTab;
  isFocusMode: boolean;
  isOpen: boolean;
  isPinned: boolean;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onTogglePinned: () => void;
}>) {
  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        activeMobileTab === 'assets' ? 'flex w-full absolute inset-0 z-30 bg-background' : 'hidden',
        'flex-shrink-0 overflow-hidden flex-col transition-all duration-300',
        isFocusMode
          ? 'md:absolute md:left-2.5 md:top-2.5 md:bottom-2.5 md:z-50 md:w-[324px] md:rounded-2xl md:border md:border-border/70 md:bg-card/95 md:shadow-2xl md:backdrop-blur-xl'
          : 'md:w-[304px] md:relative md:z-20 md:border-r md:border-border/60 md:bg-card/70',
        isOpen ? 'md:flex' : 'md:hidden',
      )}
    >
      <div className="h-12 px-3 border-b border-border/40 flex justify-between items-center bg-card/20">
        <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 uppercase pl-2">
          <Images size={16} className="text-primary" />
          Studio Kit
        </h2>
        <PanelActions
          closeIcon={<ChevronLeft size={16} />}
          isFocusMode={isFocusMode}
          isPinned={isPinned}
          onClose={onClose}
          onTogglePinned={onTogglePinned}
          panelName="studio kit"
        />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <AssetSidebar className="h-full" />
      </div>
    </aside>
  );
}

function EditPanel({
  activeMobileTab,
  hasLayers,
  isFocusMode,
  isOpen,
  isPinned,
  layerCount,
  rightPanelMode,
  selectedLayerId,
  onClose,
  onMouseEnter,
  onMouseLeave,
  onTogglePinned,
}: Readonly<{
  activeMobileTab: MobileEditorTab;
  hasLayers: boolean;
  isFocusMode: boolean;
  isOpen: boolean;
  isPinned: boolean;
  layerCount: number;
  rightPanelMode: RightPanelMode;
  selectedLayerId: string | null;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onTogglePinned: () => void;
}>) {
  const isPointerInsideRef = useRef(false);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  const handleMouseEnter = () => {
    isPointerInsideRef.current = true;
    onMouseEnter();
  };

  const handleMouseLeave = () => {
    isPointerInsideRef.current = false;
    if (!isLayerMenuOpen) {
      onMouseLeave();
    }
  };

  const handleLayerMenuOpenChange = (open: boolean) => {
    setIsLayerMenuOpen(open);

    if (open) {
      onMouseEnter();
      return;
    }

    if (isFocusMode && !isPinned && !isPointerInsideRef.current) {
      onMouseLeave();
    }
  };

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        activeMobileTab === 'properties'
          ? 'flex w-full absolute inset-0 z-30 bg-background'
          : 'hidden',
        'flex-shrink-0 overflow-hidden flex-col transition-all duration-300',
        isFocusMode
          ? 'md:absolute md:right-2.5 md:top-2.5 md:bottom-2.5 md:z-50 md:w-[348px] md:rounded-2xl md:border md:border-border/70 md:bg-card/95 md:shadow-2xl md:backdrop-blur-xl'
          : 'md:w-[336px] md:relative md:z-20 md:border-l md:border-border/60 md:bg-card/70',
        isOpen ? 'md:flex' : 'md:hidden',
      )}
    >
      <div className="h-12 px-3 border-b border-border/40 flex justify-between items-center bg-card/20">
        <PanelActions
          closeIcon={<ChevronRight size={16} />}
          isFocusMode={isFocusMode}
          isPinned={isPinned}
          onClose={onClose}
          onTogglePinned={onTogglePinned}
          panelName="edit panel"
        />
        <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 uppercase pr-2">
          Edit Panel
          <SlidersHorizontal size={16} className="text-primary" />
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-4 p-3.5">
          {hasLayers && (
            <div>
              <h3 className="mb-2.5 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Layers
                <Badge variant="outline" className="text-[10px]">
                  {layerCount} {layerCount === 1 ? 'Layer' : 'Layers'}
                </Badge>
              </h3>
              <LayerStack onMenuOpenChange={handleLayerMenuOpenChange} />
            </div>
          )}

          <div className={cn(hasLayers && 'border-t border-border/30 pt-4')}>
            <h3 className="mb-2.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              {rightPanelMode === 'canvas' && !selectedLayerId ? 'Canvas' : 'Inspector'}
            </h3>
            <PropertiesPanel
              compactEmpty={!hasLayers}
              showCanvasSettings={rightPanelMode === 'canvas'}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

function PanelActions({
  closeIcon,
  isFocusMode,
  isPinned,
  onClose,
  onTogglePinned,
  panelName,
}: Readonly<{
  closeIcon: ReactNode;
  isFocusMode: boolean;
  isPinned: boolean;
  onClose: () => void;
  onTogglePinned: () => void;
  panelName: string;
}>) {
  return (
    <div className="flex items-center gap-2">
      {isFocusMode && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={isPinned ? 'secondary' : 'ghost'}
              aria-label={isPinned ? `Unpin ${panelName}` : `Pin ${panelName}`}
              className="hidden h-8 w-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground md:flex"
              onClick={onTogglePinned}
            >
              {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isPinned ? 'Unpin' : 'Pin'}</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Hide ${panelName}`}
            className="hidden h-8 w-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground md:flex"
            onClick={onClose}
          >
            {closeIcon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Hide Menu</TooltipContent>
      </Tooltip>
    </div>
  );
}

function FocusRevealRail({
  direction,
  isFocusMode,
  isOpen,
  label,
  onMouseEnter,
  onReveal,
}: Readonly<{
  direction: 'left' | 'right';
  isFocusMode: boolean;
  isOpen: boolean;
  label: string;
  onMouseEnter: () => void;
  onReveal: () => void;
}>) {
  const isLeft = direction === 'left';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onReveal}
          onMouseEnter={() => {
            if (isFocusMode) {
              onMouseEnter();
            }
          }}
          className={cn(
            isFocusMode
              ? 'absolute top-0 bottom-0 z-50 hidden w-5 items-center md:flex'
              : 'absolute top-1/2 -translate-y-1/2 z-50 hidden md:flex',
            isLeft ? 'left-0 justify-start' : 'right-0 justify-end',
            isOpen ? 'pointer-events-none opacity-0' : 'opacity-100',
          )}
        >
          <span
            className={cn(
              'inline-flex w-5 items-center justify-center border-border/60 bg-muted/70 text-muted-foreground backdrop-blur-md shadow-md transition-all hover:bg-secondary/80 hover:text-foreground',
              isFocusMode ? 'h-9' : 'h-9',
              isLeft
                ? 'rounded-r-lg rounded-l-none border-y border-r'
                : 'rounded-l-lg rounded-r-none border-y border-l',
            )}
          >
            {isLeft ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side={isLeft ? 'right' : 'left'}>{label}</TooltipContent>
    </Tooltip>
  );
}

function MobileEditorTabs({
  activeMobileTab,
  onSetMobileTab,
}: Readonly<{
  activeMobileTab: MobileEditorTab;
  onSetMobileTab: (tab: MobileEditorTab) => void;
}>) {
  return (
    <div className="md:hidden h-20 bg-card/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-around px-2 flex-shrink-0 z-50 safe-area-bottom">
      <MobileTabButton
        active={activeMobileTab === 'assets'}
        icon={<Images size={20} />}
        label="Assets"
        onClick={() => onSetMobileTab('assets')}
      />
      <MobileTabButton
        active={activeMobileTab === 'canvas'}
        icon={<MonitorPlay size={22} />}
        label="Studio"
        onClick={() => onSetMobileTab('canvas')}
      />
      <MobileTabButton
        active={activeMobileTab === 'properties'}
        icon={<SlidersHorizontal size={20} />}
        label="Edit"
        onClick={() => onSetMobileTab('properties')}
      />
    </div>
  );
}

function MobileTabButton({
  active,
  icon,
  label,
  onClick,
}: Readonly<{
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      className={cn(
        'flex-1 flex flex-col items-center justify-center gap-1.5 h-full transition-all active:scale-95',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
      onClick={onClick}
    >
      <div className={cn('p-2 rounded-xl transition-all', active && 'bg-primary/10')}>{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
    </button>
  );
}
