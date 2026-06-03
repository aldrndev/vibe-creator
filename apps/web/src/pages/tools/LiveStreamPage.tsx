import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LiveStreamHeader } from '@/components/tools/livestream/LiveStreamHeader';
import { LiveStreamPlatformSelector } from '@/components/tools/livestream/LiveStreamPlatformSelector';
import { LiveStreamPreview } from '@/components/tools/livestream/LiveStreamPreview';
import { LiveStreamSettings } from '@/components/tools/livestream/LiveStreamSettings';
import { TopupModal } from '@/components/tools/TopupModal';
import { PageTransition } from '@/components/ui/PageTransition';
import { ContinueWorkspaceDialog } from '@/components/workspace/ContinueWorkspaceDialog';
import { useLiveStream } from '@/hooks/useLiveStream';
import { cn } from '@/lib/utils';

function LiveStreamStepGuide({
  hasSourceVideo,
  hasStreamKey,
}: {
  readonly hasSourceVideo: boolean;
  readonly hasStreamKey: boolean;
}) {
  const activeStep = hasSourceVideo && hasStreamKey ? 3 : hasSourceVideo ? 2 : 1;
  const steps = [
    { id: 1, shortTitle: 'Source', title: 'Source Video' },
    { id: 2, shortTitle: 'Tujuan', title: 'Destination' },
    { id: 3, shortTitle: 'Live', title: 'Go Live' },
  ] as const;

  return (
    <div className="mx-auto grid w-full max-w-2xl grid-cols-3 gap-2 rounded-2xl border border-border/45 bg-muted/10 p-2 sm:flex sm:items-center sm:px-4 sm:py-3">
      {steps.map((step, index) => {
        const isActive = step.id === activeStep;
        const isDone = step.id < activeStep;
        return (
          <div className="contents" key={step.id}>
            <div
              className={cn(
                'flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2 sm:shrink-0 sm:justify-start sm:p-0',
                isActive ? 'text-foreground' : 'text-muted-foreground',
                isActive && 'bg-primary/10 sm:bg-transparent',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black',
                  isDone || isActive ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {isDone ? <Check size={14} /> : step.id}
              </span>
              <span className="min-w-0 truncate text-xs font-black sm:text-sm">
                <span className="sm:hidden">{step.shortTitle}</span>
                <span className="hidden sm:inline">{step.title}</span>
              </span>
            </div>
            {index < steps.length - 1 ? (
              <span className="mx-4 hidden h-px min-w-6 flex-1 bg-border/60 sm:block" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function LiveStreamPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const [showContinueDialog, setShowContinueDialog] = useState(!sessionId);
  const {
    // State
    videoUrl,
    sourceMetadata,
    hasSourceVideo,
    platform,
    setPlatform,
    streamKey,
    setStreamKey,
    isStreamKeyVisible,
    setIsStreamKeyVisible,
    customRtmpUrl,
    setCustomRtmpUrl,
    isStreaming,
    streamStatus,
    quality,
    setQuality,
    bitrate,
    setBitrate,
    duration,
    setDuration,
    quotaRemaining,
    quota,
    showTopup,
    setShowTopup,
    errorMessage,

    // Actions
    handleFileSelect,
    handleStartStream,
    handleStopStream,
  } = useLiveStream({ sessionId });

  useEffect(() => {
    if (sessionId) {
      setShowContinueDialog(false);
    }
  }, [sessionId]);

  return (
    <PageTransition className="min-h-screen bg-background pb-20 lg:pb-10 pt-6 px-4 md:px-8">
      <div className="max-w-[1400px] mx-auto space-y-6 lg:space-y-8">
        <LiveStreamHeader isStreaming={isStreaming} />

        <LiveStreamStepGuide hasSourceVideo={hasSourceVideo} hasStreamKey={Boolean(streamKey)} />

        <div className="grid grid-cols-12 gap-4 lg:gap-10">
          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-6 lg:space-y-8">
            <LiveStreamPlatformSelector
              platform={platform}
              setPlatform={setPlatform}
              isStreaming={isStreaming}
            />

            <LiveStreamPreview
              videoUrl={videoUrl}
              isStreaming={isStreaming}
              onFileSelect={handleFileSelect}
              sourceMetadata={sourceMetadata}
              quality={quality}
              bitrate={bitrate}
            />
          </div>

          {/* Settings Sidebar */}
          <div className="col-span-12 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 h-fit">
            <LiveStreamSettings
              platform={platform}
              streamKey={streamKey}
              setStreamKey={setStreamKey}
              isStreamKeyVisible={isStreamKeyVisible}
              setIsStreamKeyVisible={setIsStreamKeyVisible}
              customRtmpUrl={customRtmpUrl}
              setCustomRtmpUrl={setCustomRtmpUrl}
              isStreaming={isStreaming}
              streamStatus={streamStatus}
              quality={quality}
              setQuality={setQuality}
              bitrate={bitrate}
              setBitrate={setBitrate}
              duration={duration}
              setDuration={setDuration}
              quotaRemaining={quotaRemaining}
              quota={quota}
              setShowTopup={setShowTopup}
              onStartStream={handleStartStream}
              onStopStream={handleStopStream}
              hasVideoFile={hasSourceVideo}
              errorMessage={errorMessage}
            />
          </div>
        </div>

        <TopupModal isOpen={showTopup} onClose={() => setShowTopup(false)} />
      </div>
      {showContinueDialog && (
        <ContinueWorkspaceDialog
          tool="live-stream"
          onStartNew={() => setShowContinueDialog(false)}
          onUnavailable={() => setShowContinueDialog(false)}
        />
      )}
    </PageTransition>
  );
}
