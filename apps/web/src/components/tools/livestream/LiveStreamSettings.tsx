import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Divider,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Slider,
  Switch,
} from "@/components/ui";
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
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          {currentPlatformConfig.icon}
        </div>
        <h2 className="text-lg font-semibold">
          {currentPlatformConfig.name} Settings
        </h2>
      </CardHeader>

      <CardBody className="space-y-6">
        {/* Mode Toggle */}
        {platform !== "custom" && (
          <div className="flex justify-between items-center bg-muted p-2 rounded-lg">
            <span className="text-xs text-muted-foreground">
              Advanced Mode (Edit URL)
            </span>
            <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
          </div>
        )}

        {/* Custom RTMP URL */}
        {(platform === "custom" || showAdvanced) && (
          <Input
            label="RTMP URL"
            placeholder="rtmp://your-server.com/live"
            value={customRtmpUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCustomRtmpUrl(e.target.value)
            }
            disabled={isStreaming}
          />
        )}

        {/* Stream Key */}
        <div className="space-y-2">
          <Input
            label="Stream Key"
            type="password"
            placeholder="Masukkan stream key dari platform"
            value={streamKey}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setStreamKey(e.target.value)
            }
            disabled={isStreaming}
          />
          <p className="text-xs text-muted-foreground">
            Dapatkan stream key dari dashboard platform streaming kamu
          </p>
        </div>

        <Divider />

        {/* Quality Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Settings size={16} /> Stream Quality
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Resolusi</label>
              <Select
                value={quality}
                onValueChange={(v) => {
                  const q = v as "720p" | "1080p";
                  setQuality(q);
                  if (q === "1080p") setBitrate(4500);
                  else setBitrate(2500);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih resolusi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720p">HD 720p (Smooth)</SelectItem>
                  <SelectItem value="1080p">FHD 1080p (Sharp)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Bitrate</span>
                <span>{bitrate} kbps</span>
              </div>
              <Slider
                min={1000}
                max={8000}
                step={100}
                value={[bitrate]}
                onValueChange={(v: number[]) => setBitrate(v[0] ?? 2500)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              Durasi Auto-Stop
            </label>
            <Select
              value={duration.toString()}
              onValueChange={(v) => setDuration(Number(v))}
              disabled={isStreaming}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih durasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 Menit</SelectItem>
                <SelectItem value="60">1 Jam</SelectItem>
                <SelectItem value="180">3 Jam</SelectItem>
                <SelectItem value="360">6 Jam</SelectItem>
                <SelectItem value="720">12 Jam</SelectItem>
                <SelectItem value="1440">24 Jam</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Stream akan otomatis berhenti ketika durasi ini habis.
            </p>
          </div>
        </div>

        <Divider />

        {/* Status */}
        {streamStatus && (
          <div
            className={`p-4 rounded-lg text-center ${
              isStreaming
                ? "bg-destructive/10 border border-destructive/30"
                : "bg-muted"
            }`}
          >
            {isStreaming ? (
              <div className="flex items-center justify-center gap-2">
                <Wifi size={18} className="text-destructive animate-pulse" />
                <span className="font-semibold text-destructive">
                  {streamStatus}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <WifiOff size={18} className="text-muted-foreground" />
                <span className="text-muted-foreground">{streamStatus}</span>
              </div>
            )}
          </div>
        )}

        {/* Quota Info */}
        <div className="flex justify-between items-center px-1 pb-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Sisa Kuota</span>
            <span className="text-xs text-muted-foreground">
              Reset tiap bulan
            </span>
          </div>
          <Badge
            variant={
              quotaRemaining === null
                ? "secondary"
                : quotaRemaining < 15
                ? "destructive"
                : quotaRemaining < 60
                ? "warning"
                : "default"
            }
            className="font-bold cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowTopup(true)}
          >
            <Info size={14} className="mr-1" />
            {quotaRemaining === null ? "..." : `${quotaRemaining} Menit (+)`}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isStreaming ? (
            <Button
              variant="destructive"
              className="flex-1"
              size="lg"
              disabled={!hasVideoFile || !streamKey}
              onClick={onStartStream}
            >
              <Play size={18} />
              Mulai Streaming
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="flex-1"
              size="lg"
              onClick={onStopStream}
            >
              <Square size={18} />
              Stop Streaming
            </Button>
          )}
        </div>

        {/* Platform Instructions */}
        <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground space-y-1">
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
