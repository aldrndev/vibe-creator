import { Eye, EyeOff, Play, Settings, Square, Wifi, WifiOff } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from '@/components/ui';
import type { StreamPlatform } from '@/hooks/useLiveStream';
import { cn } from '@/lib/utils';

interface LiveStreamSettingsProps {
  platform: StreamPlatform;
  streamKey: string;
  setStreamKey: (k: string) => void;
  isStreamKeyVisible: boolean;
  setIsStreamKeyVisible: (visible: boolean) => void;
  customRtmpUrl: string;
  setCustomRtmpUrl: (u: string) => void;
  isStreaming: boolean;
  streamStatus: string;
  quality: '720p' | '1080p';
  setQuality: (q: '720p' | '1080p') => void;
  bitrate: number;
  setBitrate: (b: number) => void;
  duration: number;
  setDuration: (d: number) => void;
  quota: {
    remaining: number | null;
    total: number | null;
    used: number;
    isUnlimited?: boolean;
  } | null;
  setShowTopup: (s: boolean) => void;
  onStartStream: () => void;
  onStopStream: () => void;
  hasVideoFile: boolean;
  errorMessage?: string | null;
}

export function LiveStreamSettings({
  platform,
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
  setShowTopup,
  onStartStream,
  onStopStream,
  hasVideoFile,
  errorMessage,
}: LiveStreamSettingsProps) {
  const {
    isQuotaUnlimited,
    quotaTotal,
    quotaUsagePercent,
    isQuotaEmpty,
    canStartStream,
    quotaHeadline,
    quotaDescription,
  } = getQuotaDetails(quota, hasVideoFile, streamKey);

  return (
    <Card className="bg-card/70 border-border/50 h-full">
      <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 pb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <Settings size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight">Pengaturan Live</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Stream Key & Live
          </p>
        </div>
      </CardHeader>

      <CardBody className="p-5 lg:p-6">
        <div className="space-y-5">
          <div className="space-y-4">
            {platform === 'custom' && (
              <CustomRtmpInput
                customRtmpUrl={customRtmpUrl}
                setCustomRtmpUrl={setCustomRtmpUrl}
                isStreaming={isStreaming}
              />
            )}

            <StreamKeyInput
              streamKey={streamKey}
              setStreamKey={setStreamKey}
              isStreaming={isStreaming}
              isStreamKeyVisible={isStreamKeyVisible}
              setIsStreamKeyVisible={setIsStreamKeyVisible}
            />
          </div>

          <StreamResolutionControls
            quality={quality}
            setQuality={setQuality}
            setBitrate={setBitrate}
            duration={duration}
            setDuration={setDuration}
            isStreaming={isStreaming}
          />

          <StreamBitrateControl bitrate={bitrate} setBitrate={setBitrate} />

          <div className="space-y-4">
            <StreamStatusIndicator streamStatus={streamStatus} isStreaming={isStreaming} />

            <StreamQuotaCard
              isQuotaEmpty={isQuotaEmpty}
              quotaHeadline={quotaHeadline}
              quotaDescription={quotaDescription}
              quota={quota}
              isQuotaUnlimited={isQuotaUnlimited}
              setShowTopup={setShowTopup}
              quotaTotal={quotaTotal}
              quotaUsagePercent={quotaUsagePercent}
            />
          </div>

          <StreamActionButtons
            isStreaming={isStreaming}
            isQuotaEmpty={isQuotaEmpty}
            canStartStream={canStartStream}
            onStopStream={onStopStream}
            onStartStream={onStartStream}
            setShowTopup={setShowTopup}
            errorMessage={errorMessage}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function CustomRtmpInput({
  customRtmpUrl,
  setCustomRtmpUrl,
  isStreaming,
}: {
  customRtmpUrl: string;
  setCustomRtmpUrl: (u: string) => void;
  isStreaming: boolean;
}) {
  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
        RTMP URL
      </div>
      <Input
        placeholder="rtmp://your-server.com/live"
        value={customRtmpUrl}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomRtmpUrl(e.target.value)}
        disabled={isStreaming}
        className="h-12 rounded-xl bg-muted/20 border-border/50 font-bold"
      />
    </div>
  );
}

function StreamKeyInput({
  streamKey,
  setStreamKey,
  isStreaming,
  isStreamKeyVisible,
  setIsStreamKeyVisible,
}: {
  streamKey: string;
  setStreamKey: (k: string) => void;
  isStreaming: boolean;
  isStreamKeyVisible: boolean;
  setIsStreamKeyVisible: (visible: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
        Stream Key
      </div>
      <div className="relative">
        <Input
          type={isStreamKeyVisible ? 'text' : 'password'}
          placeholder="Paste stream key disini..."
          value={streamKey}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStreamKey(e.target.value)}
          disabled={isStreaming}
          className="h-12 rounded-xl bg-muted/20 border-border/50 pr-12 font-bold"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setIsStreamKeyVisible(!isStreamKeyVisible)}
          disabled={isStreaming}
          aria-label={isStreamKeyVisible ? 'Sembunyikan stream key' : 'Tampilkan stream key'}
        >
          {isStreamKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground font-semibold px-1">
        Stream key tidak disimpan dan hanya dipakai untuk memulai stream.
      </p>
    </div>
  );
}

function StreamResolutionControls({
  quality,
  setQuality,
  setBitrate,
  duration,
  setDuration,
  isStreaming,
}: {
  quality: '720p' | '1080p';
  setQuality: (q: '720p' | '1080p') => void;
  setBitrate: (b: number) => void;
  duration: number;
  setDuration: (d: number) => void;
  isStreaming: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          Resolusi
        </div>
        <Select
          value={quality}
          onValueChange={(v) => {
            const q = v as '720p' | '1080p';
            setQuality(q);
            if (q === '1080p') setBitrate(4500);
            else setBitrate(2500);
          }}
        >
          <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/50 font-bold">
            <SelectValue placeholder="Resolusi" />
          </SelectTrigger>
          <SelectContent className="rounded-xl font-bold">
            <SelectItem value="720p">720p HD</SelectItem>
            <SelectItem value="1080p">1080p FHD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          Auto-Stop
        </div>
        <Select
          value={duration.toString()}
          onValueChange={(v) => setDuration(Number(v))}
          disabled={isStreaming}
        >
          <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/50 font-bold">
            <SelectValue placeholder="Durasi" />
          </SelectTrigger>
          <SelectContent className="rounded-xl font-bold">
            <SelectItem value="30">30 Menit</SelectItem>
            <SelectItem value="60">1 Jam</SelectItem>
            <SelectItem value="180">3 Jam</SelectItem>
            <SelectItem value="1440">24 Jam</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function StreamBitrateControl({
  bitrate,
  setBitrate,
}: {
  bitrate: number;
  setBitrate: (b: number) => void;
}) {
  return (
    <div className="space-y-5 bg-muted/10 p-5 rounded-3xl border border-border/40">
      <div className="flex justify-between items-center px-1">
        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Target Bitrate
        </div>
        <div className="text-[10px] font-black tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 font-mono">
          {bitrate} KBPS
        </div>
      </div>
      <Slider
        min={1000}
        max={8000}
        step={100}
        value={[bitrate]}
        onValueChange={(v: number[]) => setBitrate(v[0] ?? 2500)}
        className="py-2"
      />
    </div>
  );
}

function StreamStatusIndicator({
  streamStatus,
  isStreaming,
}: {
  streamStatus: string;
  isStreaming: boolean;
}) {
  if (!streamStatus) return null;
  return (
    <div
      className={cn(
        'p-4 rounded-2xl text-center flex items-center justify-center gap-2 border transition-colors',
        isStreaming
          ? 'bg-rose-500/5 border-rose-500/20 text-rose-500'
          : 'bg-muted/10 border-border/50 text-muted-foreground',
      )}
    >
      {isStreaming ? <Wifi size={16} className="animate-pulse" /> : <WifiOff size={16} />}
      <span className="text-[10px] font-black uppercase tracking-widest leading-none">
        {streamStatus}
      </span>
    </div>
  );
}

function StreamQuotaCard({
  isQuotaEmpty,
  quotaHeadline,
  quotaDescription,
  quota,
  isQuotaUnlimited,
  setShowTopup,
  quotaTotal,
  quotaUsagePercent,
}: {
  isQuotaEmpty: boolean;
  quotaHeadline: string;
  quotaDescription: string;
  quota: LiveStreamSettingsProps['quota'];
  isQuotaUnlimited: boolean;
  setShowTopup: (s: boolean) => void;
  quotaTotal: number | null;
  quotaUsagePercent: number;
}) {
  return (
    <div
      className={cn(
        'space-y-4 rounded-2xl border p-4',
        isQuotaEmpty ? 'border-rose-500/20 bg-rose-500/5' : 'border-border/40 bg-muted/5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Sisa Streaming
          </span>
          <p className="text-xl font-black tracking-tight text-foreground">{quotaHeadline}</p>
          <p className="text-[10px] font-semibold text-muted-foreground">{quotaDescription}</p>
        </div>
        {quota && !isQuotaUnlimited && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowTopup(true)}
            className="h-10 shrink-0 rounded-xl border-border/50 bg-muted/20 px-4 text-[10px] font-black uppercase tracking-widest"
          >
            Top Up
          </Button>
        )}
      </div>

      {quota && !isQuotaUnlimited && quotaTotal && quotaTotal > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span>Usage</span>
            <span>{quotaUsagePercent}%</span>
          </div>
          <Progress value={quotaUsagePercent} className="h-2" />
        </div>
      )}
    </div>
  );
}

function StreamActionButtons({
  isStreaming,
  isQuotaEmpty,
  canStartStream,
  onStopStream,
  onStartStream,
  setShowTopup,
  errorMessage,
}: {
  isStreaming: boolean;
  isQuotaEmpty: boolean;
  canStartStream: boolean;
  onStopStream: () => void;
  onStartStream: () => void;
  setShowTopup: (s: boolean) => void;
  errorMessage?: string | null;
}) {
  return (
    <>
      {isStreaming ? (
        <Button
          variant="secondary"
          className="w-full h-14 md:h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all active:scale-[0.98] border-border/50 bg-muted"
          onClick={onStopStream}
        >
          <Square size={18} className="mr-2 fill-current" />
          Stop Streaming
        </Button>
      ) : (
        <Button
          className="w-full h-14 md:h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all active:scale-[0.98]"
          disabled={isQuotaEmpty ? false : !canStartStream}
          onClick={isQuotaEmpty ? () => setShowTopup(true) : onStartStream}
        >
          <Play size={18} className="mr-2 fill-current" />
          {isQuotaEmpty ? 'Top Up Quota' : 'Mulai Streaming'}
        </Button>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-bold text-destructive">
          {errorMessage}
        </div>
      )}
    </>
  );
}

function getQuotaHeadline(
  quota: LiveStreamSettingsProps['quota'],
  isQuotaUnlimited: boolean,
  isQuotaEmpty: boolean,
  quotaRemainingValue: number | null,
) {
  if (!quota) return 'Memuat quota...';
  if (isQuotaUnlimited) return 'Unlimited';
  if (isQuotaEmpty) return 'Quota habis';
  return `${quotaRemainingValue ?? 0} menit tersisa`;
}

function getQuotaDescription(
  quota: LiveStreamSettingsProps['quota'],
  isQuotaUnlimited: boolean,
  quotaUsed: number,
  quotaTotal: number | null,
) {
  if (!quota) return 'Quota streaming akan muncul di sini.';
  if (isQuotaUnlimited) return 'Akses unlimited tanpa batas streaming.';
  return `${quotaUsed} dari ${quotaTotal ?? 0} menit terpakai bulan ini`;
}

function getQuotaDetails(
  quota: LiveStreamSettingsProps['quota'],
  hasVideoFile: boolean,
  streamKey: string,
) {
  const isQuotaUnlimited = Boolean(quota?.isUnlimited);
  const quotaUsed = quota?.used ?? 0;
  const quotaTotal = quota?.total ?? null;
  const quotaRemainingValue = quota && !isQuotaUnlimited ? Math.max(0, quota.remaining ?? 0) : null;
  const quotaUsagePercent =
    quota && !isQuotaUnlimited && quotaTotal && quotaTotal > 0
      ? Math.min(100, Math.round((quota.used / quotaTotal) * 100))
      : 0;
  const isQuotaEmpty = Boolean(quota && !isQuotaUnlimited && (quota.remaining ?? 0) <= 0);
  const canStartStream = hasVideoFile && Boolean(streamKey) && !isQuotaEmpty;

  const quotaHeadline = getQuotaHeadline(
    quota,
    isQuotaUnlimited,
    isQuotaEmpty,
    quotaRemainingValue,
  );

  const quotaDescription = getQuotaDescription(quota, isQuotaUnlimited, quotaUsed, quotaTotal);

  return {
    isQuotaUnlimited,
    quotaTotal,
    quotaRemainingValue,
    quotaUsagePercent,
    isQuotaEmpty,
    canStartStream,
    quotaHeadline,
    quotaDescription,
  };
}
