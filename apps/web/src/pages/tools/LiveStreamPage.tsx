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
    <PageTransition className="min-h-screen bg-background pb-20 lg:pb-10 pt-6 px-4 md:px-8">
      <div className="max-w-[1400px] mx-auto space-y-6 lg:space-y-8">
        <LiveStreamHeader isStreaming={isStreaming} />

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
            />
          </div>

          {/* Settings Sidebar */}
          <div className="col-span-12 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 h-fit">
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
