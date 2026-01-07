import { PageTransition } from "@/components/ui/PageTransition";
import { TopupModal } from "@/components/tools/TopupModal";

import { useLiveStream } from "@/hooks/useLiveStream";
import { LiveStreamHeader } from "@/components/tools/livestream/LiveStreamHeader";
import { LiveStreamPreview } from "@/components/tools/livestream/LiveStreamPreview";
import { LiveStreamSettings } from "@/components/tools/livestream/LiveStreamSettings";
import { LiveStreamPlatformSelector } from "@/components/tools/livestream/LiveStreamPlatformSelector";

export function LiveStreamPage() {
  const {
    // State
    videoUrl,
    platform,
    setPlatform,
    streamKey,
    setStreamKey,
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
    showAdvanced,
    setShowAdvanced,
    quotaRemaining,
    showTopup,
    setShowTopup,

    // Actions
    handleFileSelect,
    handleStartStream,
    handleStopStream,
    videoFile,
  } = useLiveStream();

  return (
    <PageTransition className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <LiveStreamHeader isStreaming={isStreaming} />

        <LiveStreamPlatformSelector
          platform={platform}
          setPlatform={setPlatform}
          isStreaming={isStreaming}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <LiveStreamPreview
              videoUrl={videoUrl}
              isStreaming={isStreaming}
              onFileSelect={handleFileSelect}
            />
          </div>

          <div>
            <LiveStreamSettings
              platform={platform}
              streamKey={streamKey}
              setStreamKey={setStreamKey}
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
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              quotaRemaining={quotaRemaining}
              setShowTopup={setShowTopup}
              onStartStream={handleStartStream}
              onStopStream={handleStopStream}
              hasVideoFile={!!videoFile}
            />
          </div>
        </div>

        <TopupModal isOpen={showTopup} onClose={() => setShowTopup(false)} />
      </div>
    </PageTransition>
  );
}
