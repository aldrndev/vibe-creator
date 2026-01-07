import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Select,
  SelectItem,
  Slider,
  Switch,
} from "@heroui/react";
import { Info, Play, Settings, Square, Wifi, WifiOff } from "lucide-react";
import { StreamPlatform } from "@/hooks/useLiveStream";
import { platformConfigs } from "./constants";

interface LiveStreamSettingsProps {
  platform: StreamPlatform;
  streamKey: string;
  setStreamKey: (k: string) => void;
  customRtmpUrl: string;
  setCustomRtmpUrl: (u: string) => void;
  isStreaming: boolean;
  streamStatus: string;
  quality: "720p" | "1080p";
  setQuality: (q: "720p" | "1080p") => void;
  bitrate: number;
  setBitrate: (b: number) => void;
  duration: number;
  setDuration: (d: number) => void;
  showAdvanced: boolean;
  setShowAdvanced: (s: boolean) => void;
  quotaRemaining: number | null;
  setShowTopup: (s: boolean) => void;
  onStartStream: () => void;
  onStopStream: () => void;
  hasVideoFile: boolean;
}

export function LiveStreamSettings({
  platform,
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
  setShowTopup,
  onStartStream,
  onStopStream,
  hasVideoFile,
}: LiveStreamSettingsProps) {
  const currentPlatformConfig = platformConfigs[platform];

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-lg bg-${currentPlatformConfig.color}/10 flex items-center justify-center`}
        >
          {currentPlatformConfig.icon}
        </div>
        <h2 className="text-lg font-semibold">
          {currentPlatformConfig.name} Settings
        </h2>
      </CardHeader>

      <CardBody className="space-y-6">
        {/* Mode Toggle */}
        {platform !== "custom" && (
          <div className="flex justify-between items-center bg-content2 p-2 rounded-lg">
            <span className="text-xs text-foreground/60">
              Advanced Mode (Edit URL)
            </span>
            <Switch
              size="sm"
              isSelected={showAdvanced}
              onValueChange={setShowAdvanced}
            />
          </div>
        )}

        {/* Custom RTMP URL */}
        {(platform === "custom" || showAdvanced) && (
          <Input
            label="RTMP URL"
            placeholder="rtmp://your-server.com/live"
            value={customRtmpUrl}
            onChange={(e) => setCustomRtmpUrl(e.target.value)}
            isDisabled={isStreaming}
          />
        )}

        {/* Stream Key */}
        <Input
          label="Stream Key"
          type="password"
          placeholder="Masukkan stream key dari platform"
          value={streamKey}
          onChange={(e) => setStreamKey(e.target.value)}
          description="Dapatkan stream key dari dashboard platform streaming kamu"
          isDisabled={isStreaming}
        />

        <Divider />

        {/* Quality Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Settings size={16} /> Stream Quality
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Resolusi"
              size="sm"
              selectedKeys={[quality]}
              onChange={(e) => {
                const q = e.target.value as "720p" | "1080p";
                setQuality(q);
                // Auto-adjust bitrate defaults
                if (q === "1080p") setBitrate(4500);
                else setBitrate(2500);
              }}
            >
              <SelectItem key="720p">HD 720p (Smooth)</SelectItem>
              <SelectItem key="1080p">FHD 1080p (Sharp)</SelectItem>
            </Select>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Bitrate</span>
                <span>{bitrate} kbps</span>
              </div>
              <Slider
                aria-label="Bitrate"
                size="sm"
                step={100}
                minValue={1000}
                maxValue={8000}
                value={bitrate}
                onChange={(v) => setBitrate(v as number)}
                className="max-w-md"
              />
            </div>
          </div>

          <Select
            label="Durasi Auto-Stop"
            size="sm"
            selectedKeys={[duration.toString()]}
            onChange={(e) => setDuration(Number(e.target.value))}
            isDisabled={isStreaming}
            description="Stream akan otomatis berhenti ketika durasi ini habis."
          >
            <SelectItem key="30">30 Menit</SelectItem>
            <SelectItem key="60">1 Jam</SelectItem>
            <SelectItem key="180">3 Jam</SelectItem>
            <SelectItem key="360">6 Jam</SelectItem>
            <SelectItem key="720">12 Jam</SelectItem>
            <SelectItem key="1440">24 Jam</SelectItem>
          </Select>
        </div>

        <Divider />

        {/* Status */}
        {streamStatus && (
          <div
            className={`p-4 rounded-lg text-center ${
              isStreaming
                ? "bg-danger/10 border border-danger/30"
                : "bg-content2"
            }`}
          >
            {isStreaming ? (
              <div className="flex items-center justify-center gap-2">
                <Wifi size={18} className="text-danger animate-pulse" />
                <span className="font-semibold text-danger">
                  {streamStatus}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <WifiOff size={18} className="text-foreground/60" />
                <span className="text-foreground/60">{streamStatus}</span>
              </div>
            )}
          </div>
        )}

        {/* Quota Info */}
        <div className="flex justify-between items-center px-1 pb-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Sisa Kuota</span>
            <span className="text-xs text-foreground/50">Reset tiap bulan</span>
          </div>
          <Chip
            size="md"
            color={
              quotaRemaining === null
                ? "default"
                : quotaRemaining < 15
                ? "danger"
                : quotaRemaining < 60
                ? "warning"
                : "primary"
            }
            variant="flat"
            className="font-bold cursor-pointer hover:opacity-80 transition-opacity"
            startContent={<Info size={14} />}
            onClick={() => setShowTopup(true)}
          >
            {quotaRemaining === null ? "..." : `${quotaRemaining} Menit (+)`}
          </Chip>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isStreaming ? (
            <Button
              color="danger"
              className="flex-1"
              size="lg"
              isDisabled={!hasVideoFile || !streamKey}
              onPress={onStartStream}
              startContent={<Play size={18} />}
            >
              Mulai Streaming
            </Button>
          ) : (
            <Button
              color="default"
              className="flex-1"
              size="lg"
              onPress={onStopStream}
              startContent={<Square size={18} />}
            >
              Stop Streaming
            </Button>
          )}
        </div>

        {/* Platform Instructions */}
        <div className="p-3 rounded-lg bg-content2 text-xs text-foreground/60 space-y-1">
          <p className="font-semibold mb-2">Cara mendapatkan Stream Key:</p>
          <p>
            • <strong>YouTube:</strong> Studio → Go Live → Stream Key
          </p>
          <p>
            • <strong>TikTok:</strong> LIVE Studio → Stream Key
          </p>
          <p>
            • <strong>Twitch:</strong> Dashboard → Settings → Stream Key
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
