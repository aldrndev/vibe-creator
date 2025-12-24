import { useState, useRef } from 'react';
import { logger } from '@/lib/logger';
import { 
  Button, 
  Card, 
  CardBody, 
  CardHeader, 
  Input,
  Divider,
  Chip
} from '@heroui/react';
import { Upload, Play, Square, ArrowLeft, Radio, Wifi, WifiOff, Settings, Video, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PageTransition, HoverCard } from '@/components/ui/PageTransition';
import { authFetch } from '@/services/api';

type StreamPlatform = 'youtube' | 'tiktok' | 'twitch' | 'facebook' | 'instagram' | 'custom';

const platformConfigs: Record<StreamPlatform, { name: string; icon: React.ReactNode; color: 'danger' | 'default' | 'secondary' | 'primary' | 'warning' }> = {
  youtube: { name: 'YouTube', icon: <Video size={20} />, color: 'danger' },
  tiktok: { name: 'TikTok', icon: <Radio size={20} />, color: 'default' },
  twitch: { name: 'Twitch', icon: <Tv size={20} />, color: 'secondary' },
  facebook: { name: 'Facebook', icon: <Radio size={20} />, color: 'primary' },
  instagram: { name: 'Instagram', icon: <Radio size={20} />, color: 'warning' },
  custom: { name: 'Custom RTMP', icon: <Settings size={20} />, color: 'default' },
};

export function LiveStreamPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  
  const [platform, setPlatform] = useState<StreamPlatform>('youtube');
  const [streamKey, setStreamKey] = useState('');
  const [customRtmpUrl, setCustomRtmpUrl] = useState('');
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamId, setStreamId] = useState<string>('');
  const [streamStatus, setStreamStatus] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
    }
  };

  const handleStartStream = async () => {
    if (!videoFile || !streamKey) return;

    try {
      setStreamStatus('Mengupload video...');
      
      const formData = new FormData();
      formData.append('video', videoFile);
      
      const uploadRes = await authFetch('/api/v1/upload/video', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const inputPath = uploadData.data.path;
      
      setStreamStatus('Memulai streaming...');
      
      const streamRes = await authFetch('/api/v1/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputPath,
          config: {
            platform,
            streamKey,
            rtmpUrl: platform === 'custom' ? customRtmpUrl : undefined,
          },
        }),
      });
      
      if (!streamRes.ok) throw new Error('Start stream failed');
      const streamData = await streamRes.json();
      
      setStreamId(streamData.data.streamId);
      setIsStreaming(true);
      setStreamStatus('LIVE');
      
      statusIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await authFetch(`/api/v1/stream/${streamData.data.streamId}/status`);
          const statusData = await statusRes.json();
          
          if (statusData.data.status === 'ENDED' || statusData.data.status === 'FAILED') {
            setIsStreaming(false);
            setStreamStatus(statusData.data.status);
            if (statusIntervalRef.current) {
              clearInterval(statusIntervalRef.current);
            }
          }
        } catch {
          // Ignore polling errors
        }
      }, 5000);
      
    } catch (err) {
      logger.error('Stream start failed', err);
      setStreamStatus('Gagal: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setIsStreaming(false);
    }
  };

  const handleStopStream = async () => {
    if (!streamId) return;

    try {
      setStreamStatus('Menghentikan stream...');
      
      await authFetch('/api/v1/stream/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId }),
      });
      
      setIsStreaming(false);
      setStreamStatus('Stream dihentikan');
      
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      
    } catch (err) {
      logger.error('Stream stop failed', err);
      setStreamStatus('Gagal menghentikan: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const currentPlatformConfig = platformConfigs[platform];

  return (
    <PageTransition className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div 
          className="flex items-center gap-4 mb-6"
        >
          <Link to="/dashboard">
            <Button isIconOnly variant="light" size="sm">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Radio size={24} className="text-danger" />
              Live Streaming
            </h1>
            <p className="text-foreground/60 text-sm">Stream video ke platform favorit</p>
          </div>
          {isStreaming && (
            <div
            >
              <Chip 
                color="danger" 
                variant="solid" 
                className="animate-pulse"
                startContent={<Wifi size={14} />}
              >
                LIVE
              </Chip>
            </div>
          )}
        </div>

        {/* Platform Selection */}
        <div
          className="mb-6"
        >
          <label className="text-sm font-medium mb-3 block">Pilih Platform</label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {Object.entries(platformConfigs).map(([key, config]) => (
              <HoverCard key={key}>
                <Card 
                  isPressable
                  isDisabled={isStreaming}
                  onPress={() => setPlatform(key as StreamPlatform)}
                  className={`border-2 transition-colors ${
                    platform === key 
                      ? `border-${config.color} bg-${config.color}/10` 
                      : 'border-transparent hover:border-divider'
                  }`}
                >
                  <CardBody className="p-3 text-center">
                    <div className={`w-10 h-10 rounded-lg bg-${config.color}/20 flex items-center justify-center mx-auto mb-1`}>
                      {config.icon}
                    </div>
                    <p className="text-xs font-medium truncate">{config.name}</p>
                  </CardBody>
                </Card>
              </HoverCard>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Video Preview */}
          <div
          >
            <Card className="h-full">
              <CardHeader className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Video size={16} className="text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Video Source</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                {!videoUrl ? (
                  <div 
                    className="aspect-video bg-content2 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-content3 transition-colors border-2 border-dashed border-divider hover:border-primary/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Upload size={32} className="text-primary" />
                    </div>
                    <p className="text-foreground/60 font-medium">Upload video untuk stream</p>
                    <p className="text-foreground/40 text-xs mt-1">Video akan di-loop terus menerus</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <video
                        src={videoUrl}
                        controls
                        loop
                        className="w-full aspect-video rounded-xl bg-black"
                      />
                      {isStreaming && (
                        <div className="absolute top-3 left-3">
                          <Chip color="danger" size="sm" className="animate-pulse">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-white rounded-full" />
                              Streaming
                            </span>
                          </Chip>
                        </div>
                      )}
                    </div>
                    {!isStreaming && (
                      <Button 
                        variant="flat" 
                        size="sm"
                        onPress={() => fileInputRef.current?.click()}
                        startContent={<Upload size={14} />}
                      >
                        Ganti Video
                      </Button>
                    )}
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </CardBody>
            </Card>
          </div>

          {/* Right: Stream Settings */}
          <div
          >
            <Card>
              <CardHeader className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg bg-${currentPlatformConfig.color}/10 flex items-center justify-center`}>
                  {currentPlatformConfig.icon}
                </div>
                <h2 className="text-lg font-semibold">{currentPlatformConfig.name} Settings</h2>
              </CardHeader>
              <CardBody className="space-y-6">
                {/* Custom RTMP URL */}
                {platform === 'custom' && (
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

                {/* Status */}
                {streamStatus && (
                  <div className={`p-4 rounded-lg text-center ${
                    isStreaming 
                      ? 'bg-danger/10 border border-danger/30' 
                      : 'bg-content2'
                  }`}>
                    {isStreaming ? (
                      <div className="flex items-center justify-center gap-2">
                        <Wifi size={18} className="text-danger animate-pulse" />
                        <span className="font-semibold text-danger">{streamStatus}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <WifiOff size={18} className="text-foreground/60" />
                        <span className="text-foreground/60">{streamStatus}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!isStreaming ? (
                    <Button
                      color="danger"
                      className="flex-1"
                      size="lg"
                      isDisabled={!videoFile || !streamKey}
                      onPress={handleStartStream}
                      startContent={<Play size={18} />}
                    >
                      Mulai Streaming
                    </Button>
                  ) : (
                    <Button
                      color="default"
                      className="flex-1"
                      size="lg"
                      onPress={handleStopStream}
                      startContent={<Square size={18} />}
                    >
                      Stop Streaming
                    </Button>
                  )}
                </div>

                {/* Platform Instructions */}
                <div className="p-3 rounded-lg bg-content2 text-xs text-foreground/60 space-y-1">
                  <p className="font-semibold mb-2">Cara mendapatkan Stream Key:</p>
                  <p>• <strong>YouTube:</strong> Studio → Go Live → Stream Key</p>
                  <p>• <strong>TikTok:</strong> LIVE Studio → Stream Key</p>
                  <p>• <strong>Twitch:</strong> Dashboard → Settings → Stream Key</p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
