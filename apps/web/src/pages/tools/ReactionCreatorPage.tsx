import { PageTransition } from "@/components/ui/PageTransition";
import { ReactionHeader } from "@/components/tools/reaction/ReactionHeader";
import { ReactionUploadPanel } from "@/components/tools/reaction/ReactionUploadPanel";
import { ReactionControlsPanel } from "@/components/tools/reaction/ReactionControlsPanel";
import { useReactionCreator } from "@/hooks/useReactionCreator";

export function ReactionCreatorPage() {
  const { state, actions } = useReactionCreator();

  // Destructure for cleaner prop passing
  const {
    mainVideoUrl,
    reactionVideoUrl,
    mainVideoError,
    reactionVideoError,
    results,
    layoutMode,
    aspectRatio,
    pipScale,
    circular,
    sideBySideLayout,
    splitRatio,
    smoothBorder,
    overlayMode,
    customPosition,
    mainVolume,
    reactionVolume,
    isProcessing,
    processingStatus,
    mainVideoFile,
    reactionVideoFile,
  } = state;

  return (
    <PageTransition className="min-h-screen bg-background p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-7xl mx-auto">
        <ReactionHeader />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <ReactionUploadPanel
            mainVideoUrl={mainVideoUrl}
            reactionVideoUrl={reactionVideoUrl}
            mainVideoError={mainVideoError}
            reactionVideoError={reactionVideoError}
            resultUrl={results[layoutMode]}
            layoutMode={layoutMode}
            aspectRatio={aspectRatio}
            pipScale={pipScale}
            circular={circular}
            sideBySideLayout={sideBySideLayout}
            splitRatio={splitRatio}
            smoothBorder={smoothBorder}
            overlayMode={overlayMode}
            customPosition={customPosition}
            setCustomPosition={actions.setCustomPosition}
            onMainVideoSelect={actions.handleMainVideoSelect}
            onReactionVideoSelect={actions.handleReactionVideoSelect}
          />

          <ReactionControlsPanel
            layoutMode={layoutMode}
            setLayoutMode={actions.setLayoutMode}
            aspectRatio={aspectRatio}
            setAspectRatio={actions.setAspectRatio}
            circular={circular}
            setCircular={actions.setCircular}
            pipScale={pipScale}
            setPipScale={actions.setPipScale}
            sideBySideLayout={sideBySideLayout}
            setSideBySideLayout={actions.setSideBySideLayout}
            splitRatio={splitRatio}
            setSplitRatio={actions.setSplitRatio}
            smoothBorder={smoothBorder}
            setSmoothBorder={actions.setSmoothBorder}
            overlayMode={overlayMode}
            setOverlayMode={actions.setOverlayMode}
            mainVolume={mainVolume}
            setMainVolume={actions.setMainVolume}
            reactionVolume={reactionVolume}
            setReactionVolume={actions.setReactionVolume}
            isProcessing={isProcessing}
            processingStatus={processingStatus}
            hasFiles={!!(mainVideoFile && reactionVideoFile)}
            onProcess={actions.handleProcess}
          />
        </div>
      </div>
    </PageTransition>
  );
}
