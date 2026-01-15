import { PageTransition } from "@/components/ui/PageTransition";
import { ReactionHeader } from "@/components/tools/reaction/ReactionHeader";
import { ReactionUploadPanel } from "@/components/tools/reaction/ReactionUploadPanel";
import { ReactionControlsPanel } from "@/components/tools/reaction/ReactionControlsPanel";
import { ReactionResultPanel } from "@/components/tools/reaction/ReactionResultPanel";
import { useReactionCreator } from "@/hooks/useReactionCreator";

export function ReactionCreatorPage() {
  const { state, actions } = useReactionCreator();

  // Destructure for cleaner prop passing
  const {
    mainVideoUrl,
    reactionVideoUrl,
    results,
    layoutMode,
    aspectRatio,
    pipScale,
    circular,
    sideBySideLayout,
    splitRatio,
    smoothBorder,
    overlayMode,
    mainVolume,
    reactionVolume,
    isProcessing,
    processingStatus,
    mainVideoFile,
    reactionVideoFile,
  } = state;

  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <ReactionHeader />

        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-8 items-start">
          {/* Left: Preview & Editor (Takes 7/12 on large screens) */}
          <div>
            <ReactionUploadPanel
              mainVideoUrl={mainVideoUrl}
              reactionVideoUrl={reactionVideoUrl}
              layoutMode={layoutMode}
              aspectRatio={aspectRatio}
              pipScale={pipScale}
              circular={circular}
              sideBySideLayout={sideBySideLayout}
              splitRatio={splitRatio}
              smoothBorder={smoothBorder}
              overlayMode={overlayMode}
              setCustomPosition={actions.setCustomPosition}
              onMainVideoSelect={actions.handleMainVideoSelect}
              onReactionVideoSelect={actions.handleReactionVideoSelect}
            />
          </div>

          {/* Right: Controls (Takes 5/12 on large screens) */}
          <div className="lg:sticky lg:top-24">
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

        {/* Results Panel - Full width below */}
        <div className="w-full">
          <ReactionResultPanel
            layoutMode={layoutMode}
            resultUrl={results[layoutMode] || ""}
          />
        </div>
      </div>
    </PageTransition>
  );
}
