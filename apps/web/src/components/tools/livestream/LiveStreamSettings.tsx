import { Eye, EyeOff, Info, Play, Settings, Square, Wifi, WifiOff } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
  quotaRemaining: number | null;
  quota: { remaining: number; total: number; used: number } | null;
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
  quotaRemaining,
  quota,
  setShowTopup,
  onStartStream,
  onStopStream,
  hasVideoFile,
  errorMessage,
}: LiveStreamSettingsProps) {
  return (
    <Card className="bg-card/70 backdrop-blur-xl border-border/50 h-full">
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
        <Tabs defaultValue={isStreaming ? 'go-live' : 'destination'} className="w-full">
          <TabsList className="grid h-11 w-full grid-cols-2 rounded-2xl border border-border/60 bg-muted p-1">
            <TabsTrigger
              value="destination"
              className="rounded-xl text-xs font-black text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              Stream Key
            </TabsTrigger>
            <TabsTrigger
              value="go-live"
              className="rounded-xl text-xs font-black text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              Mulai Live
            </TabsTrigger>
          </TabsList>

          <TabsContent value="destination" className="mt-5 min-h-[520px] space-y-6">
            <div className="space-y-4">
              {platform === 'custom' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    RTMP URL
                  </div>
                  <Input
                    placeholder="rtmp://your-server.com/live"
                    value={customRtmpUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCustomRtmpUrl(e.target.value)
                    }
                    disabled={isStreaming}
                    className="h-12 rounded-xl bg-muted/20 border-border/50 font-bold"
                  />
                  <p className="px-1 text-[10px] font-semibold text-muted-foreground">
                    Dipakai hanya untuk platform Custom RTMP.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Stream Key
                </div>
                <div className="relative">
                  <Input
                    type={isStreamKeyVisible ? 'text' : 'password'}
                    placeholder="Paste stream key disini..."
                    value={streamKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setStreamKey(e.target.value)
                    }
                    disabled={isStreaming}
                    className="h-12 rounded-xl bg-muted/20 border-border/50 pr-12 font-bold"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setIsStreamKeyVisible(!isStreamKeyVisible)}
                    disabled={isStreaming}
                    aria-label={
                      isStreamKeyVisible ? 'Sembunyikan stream key' : 'Tampilkan stream key'
                    }
                  >
                    {isStreamKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold px-1">
                  Masukan stream key platform tujuan anda disini.
                </p>
              </div>
            </div>

            <Divider className="opacity-40" />

            <div className="p-5 rounded-3xl bg-muted/10 border border-border/40 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 px-1">
                Cara Mendapatkan Stream Key?
              </p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'YouTube', text: 'Studio → Live → Key' },
                  { label: 'TikTok', text: 'Live Studio → Key' },
                  { label: 'Twitch', text: 'Settings → Stream Key' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/5"
                  >
                    <span className="text-[10px] font-black text-foreground">{item.label}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-80">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="go-live" className="mt-5 min-h-[520px] space-y-6">
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

            <div className="space-y-4">
              {streamStatus && (
                <div
                  className={cn(
                    'p-4 rounded-2xl text-center flex items-center justify-center gap-2 border transition-colors',
                    isStreaming
                      ? 'bg-rose-500/5 border-rose-500/20 text-rose-500'
                      : 'bg-muted/10 border-border/50 text-muted-foreground',
                  )}
                >
                  {isStreaming ? (
                    <Wifi size={16} className="animate-pulse" />
                  ) : (
                    <WifiOff size={16} />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                    {streamStatus}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center bg-muted/5 p-4 rounded-2xl border border-border/40">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Sisa Kuota
                  </span>
                  <span className="text-[9px] text-muted-foreground leading-none font-medium opacity-60">
                    {quota ? `${quota.used}/${quota.total} menit terpakai` : 'Reset bulanan'}
                  </span>
                </div>
                <Badge
                  className={cn(
                    'px-4 py-2 rounded-xl text-[10px] font-black tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-2',
                    quotaRemaining === null
                      ? 'bg-muted'
                      : quotaRemaining < 60
                        ? 'bg-rose-500'
                        : 'bg-primary',
                  )}
                  onClick={() => setShowTopup(true)}
                >
                  {quotaRemaining === null ? '...' : `${quotaRemaining} MINS`}
                  <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-white text-[10px] font-black">+</span>
                  </div>
                </Badge>
              </div>
            </div>

            <div className="pt-2">
              {!isStreaming ? (
                <Button
                  className="w-full h-14 md:h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all active:scale-[0.98]"
                  disabled={!hasVideoFile || !streamKey}
                  onClick={onStartStream}
                >
                  <Play size={18} className="mr-2 fill-current" />
                  Mulai Streaming
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full h-14 md:h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all active:scale-[0.98] border-border/50 bg-muted"
                  onClick={onStopStream}
                >
                  <Square size={18} className="mr-2 fill-current" />
                  Stop Streaming
                </Button>
              )}

              {!hasVideoFile && (
                <div className="flex items-center gap-2 p-3 mt-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <Info className="text-amber-500 shrink-0" size={14} />
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">
                    Upload video untuk memulai siaran
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-bold text-destructive">
                  {errorMessage}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardBody>
    </Card>
  );
}
