import { LoopHeader } from '@/components/tools/loop/LoopHeader';
import { LoopResultPanel } from '@/components/tools/loop/LoopResultPanel';
import { LoopSettingsPanel } from '@/components/tools/loop/LoopSettingsPanel';
import { LoopVideoPreview } from '@/components/tools/loop/LoopVideoPreview';
import { PageTransition } from '@/components/ui/PageTransition';
import { useLoopCreator } from '@/hooks/useLoopCreator';

export function LoopCreatorPage() {
  const {
    videoFile,
    videoUrl,
    videoRef,
    fileInputRef,
    loopMode,
    setLoopMode,
    loopCount,
    setLoopCount,
    aspectRatio,
    setAspectRatio,
    startMs,
    setStartMs,
    endMs,
    setEndMs,
    maxDuration,
    isProcessing,
    processingStatus,
    results,
    useDurationMode,
    setUseDurationMode,
    targetMinutes,
    setTargetMinutes,
    handleFileSelect,
    handleVideoLoaded,
    handleProcess,
  } = useLoopCreator();

  return (
    <PageTransition className="min-h-screen bg-background p-6">
      <div className="max-w-400 mx-auto">
        <LoopHeader />

        <div className="grid grid-cols-1 lg:grid-cols-[6fr_4fr] gap-6">
          {/* Left: Video Preview */}
          <div>
            <LoopVideoPreview
              videoUrl={videoUrl}
              videoRef={videoRef}
              fileInputRef={fileInputRef}
              onFileSelect={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              onVideoLoaded={handleVideoLoaded}
            />
          </div>

          {/* Right: Controls */}
          <div>
            <LoopSettingsPanel
              loopMode={loopMode}
              setLoopMode={setLoopMode}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              startMs={startMs}
              setStartMs={setStartMs}
              endMs={endMs}
              setEndMs={setEndMs}
              maxDuration={maxDuration}
              loopCount={loopCount}
              setLoopCount={setLoopCount}
              useDurationMode={useDurationMode}
              setUseDurationMode={setUseDurationMode}
              targetMinutes={targetMinutes}
              setTargetMinutes={setTargetMinutes}
              isProcessing={isProcessing}
              processingStatus={processingStatus}
              onProcess={handleProcess}
              resultUrl={results[loopMode]}
              hasVideo={!!videoFile}
            />
          </div>
        </div>

        {/* Result Preview */}
        <LoopResultPanel loopMode={loopMode} resultUrl={results[loopMode] || ''} />
      </div>
    </PageTransition>
  );
}
