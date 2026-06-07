import { useEffect, useState } from 'react';
import { LiveStreamHeader } from '@/components/tools/livestream/LiveStreamHeader';
import { LiveStreamPlatformSelector } from '@/components/tools/livestream/LiveStreamPlatformSelector';
import { LiveStreamPreview } from '@/components/tools/livestream/LiveStreamPreview';
import { LiveStreamSettings } from '@/components/tools/livestream/LiveStreamSettings';
import { TopupModal } from '@/components/tools/TopupModal';
import { PageTransition } from '@/components/ui/PageTransition';
import { ContinueWorkspaceDialog } from '@/components/workspace/ContinueWorkspaceDialog';
import { useScrollToTopOnChange } from '@/hooks/use-scroll-to-top-on-change';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useMutableSearchParams } from '@/lib/route-search';

export function LiveStreamPage() {
  const [searchParams] = useMutableSearchParams();
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
    quota,
    showTopup,
    setShowTopup,
    errorMessage,

    // Actions
    handleFileSelect,
    handleStartStream,
    handleStopStream,
  } = useLiveStream({ sessionId });

  let liveStreamStepKey = 'source';
  if (isStreaming) {
    liveStreamStepKey = 'live';
  } else if (hasSourceVideo) {
    liveStreamStepKey = 'destination';
  }
  useScrollToTopOnChange(liveStreamStepKey);

  useEffect(() => {
    if (sessionId) {
      setShowContinueDialog(false);
    }
  }, [sessionId]);

  return (
    <PageTransition className="min-h-screen bg-background px-4 pt-6 pb-8 md:px-8 lg:pb-0">
      <div className="max-w-[1400px] mx-auto space-y-6 lg:space-y-8">
        <LiveStreamHeader isStreaming={isStreaming} />

        <div className="grid grid-cols-12 gap-4 lg:gap-10">
          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-7 xl:col-span-8">
            <section className="overflow-hidden rounded-xl border border-border/50 bg-card/70 backdrop-blur-xl">
              <LiveStreamPlatformSelector
                platform={platform}
                setPlatform={setPlatform}
                isStreaming={isStreaming}
                embedded
              />

              <div className="border-t border-border/50 p-4 sm:p-5 lg:p-6">
                <LiveStreamPreview
                  videoUrl={videoUrl}
                  isStreaming={isStreaming}
                  onFileSelect={handleFileSelect}
                  sourceMetadata={sourceMetadata}
                  quality={quality}
                  bitrate={bitrate}
                  embedded
                />
              </div>
            </section>
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
