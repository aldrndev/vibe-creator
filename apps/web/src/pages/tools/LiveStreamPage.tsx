import { useState, useRef } from 'react';
import { 
  Button, 
  Card, 
  CardBody, 
  CardHeader, 
  Input,
  Select,
  SelectItem,
  Divider,
  Chip
} from '@heroui/react';
import { Upload, Play, Square, ArrowLeft, Radio, Youtube, Twitch } from 'lucide-react';
import { Link } from 'react-router-dom';

type StreamPlatform = 'youtube' | 'tiktok' | 'twitch' | 'facebook' | 'instagram' | 'custom';

const platformConfigs: Record<StreamPlatform, { name: string; icon: React.ReactNode; color: string }> = {
  youtube: { name: 'YouTube', icon: <Youtube size={20} />, color: 'danger' },
  tiktok: { name: 'TikTok', icon: <Radio size={20} />, color: 'default' },
  twitch: { name: 'Twitch', icon: <Twitch size={20} />, color: 'secondary' },
  facebook: { name: 'Facebook', icon: <Radio size={20} />, color: 'primary' },
  instagram: { name: 'Instagram', icon: <Radio size={20} />, color: 'warning' },
  custom: { name: 'Custom RTMP', icon: <Radio size={20} />, color: 'default' },
};

export function LiveStreamPage() {
  // Video source
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  
  // Stream settings
  const [platform, setPlatform] = useState<StreamPlatform>('youtube');
  const [streamKey, setStreamKey] = useState('');
  const [customRtmpUrl, setCustomRtmpUrl] = useState('');
  
  // Stream state
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
      
      // Upload video first
      const formData = new FormData();
      formData.append('video', videoFile);
      
      const uploadRes = await fetch('/api/v1/upload/video', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const inputPath = uploadData.data.path;
      
      setStreamStatus('Memulai streaming...');
      
      // Start stream
      const streamRes = await fetch('/api/v1/stream/start', {
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
        credentials: 'include',
      });
      
      if (!streamRes.ok) throw new Error('Start stream failed');
      const streamData = await streamRes.json();
      
      setStreamId(streamData.data.streamId);
      setIsStreaming(true);
      setStreamStatus('LIVE');
      
      // Poll status
      statusIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/v1/stream/${streamData.data.streamId}/status`, {
            credentials: 'include',
          });
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
      console.error('Stream start failed:', err);
      setStreamStatus('Gagal: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setIsStreaming(false);
    }
  };

  const handleStopStream = async () => {
    if (!streamId) return;

    try {
      setStreamStatus('Menghentikan stream...');
      
      await fetch('/api/v1/stream/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId }),
        credentials: 'include',
      });
      
      setIsStreaming(false);
      setStreamStatus('Stream dihentikan');
      
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      
    } catch (err) {
      console.error('Stream stop failed:', err);
      setStreamStatus('Gagal menghentikan: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard">
            <Button isIconOnly variant="light" size="sm">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Live Streaming</h1>
          {isStreaming && (
            <Chip color="danger" variant="flat" className="animate-pulse">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-danger rounded-full" />
                LIVE
              </span>
            </Chip>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Video Preview */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Video Source</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {!videoUrl ? (
                <div 
                  className="aspect-video bg-default-100 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-default-200 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={48} className="text-default-400 mb-3" />
                  <p className="text-default-500">Upload video untuk stream</p>
                  <p className="text-xs text-default-400 mt-1">Video akan di-loop terus menerus</p>
                </div>
              ) : (
                <video
                  src={videoUrl}
                  controls
                  loop
                  className="w-full aspect-video rounded-xl bg-black"
                />
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {videoUrl && !isStreaming && (
                <Button 
                  variant="flat" 
                  onPress={() => fileInputRef.current?.click()}
                  startContent={<Upload size={16} />}
                >
                  Ganti Video
                </Button>
              )}
            </CardBody>
          </Card>

          {/* Right: Stream Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Pengaturan Stream</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              {/* Platform Select */}
              <div>
                <label className="text-sm font-medium mb-2 block">Platform</label>
                <Select
                  selectedKeys={[platform]}
                  onSelectionChange={(keys) => setPlatform(Array.from(keys)[0] as StreamPlatform)}
                  isDisabled={isStreaming}
                >
                  {Object.entries(platformConfigs).map(([key, config]) => (
                    <SelectItem key={key} startContent={config.icon}>
                      {config.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {/* Custom RTMP URL (only for custom) */}
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
                <div className="p-3 rounded-lg bg-default-100 text-center">
                  <span className="text-sm">{streamStatus}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!isStreaming ? (
                  <Button
                    color="danger"
                    className="flex-1"
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
                    onPress={handleStopStream}
                    startContent={<Square size={18} />}
                  >
                    Stop Streaming
                  </Button>
                )}
              </div>

              {/* Platform Instructions */}
              <div className="text-xs text-foreground/50 space-y-1">
                <p><strong>YouTube:</strong> Studio → Go Live → Stream Key</p>
                <p><strong>TikTok:</strong> LIVE Studio → Stream Key</p>
                <p><strong>Twitch:</strong> Dashboard → Settings → Stream Key</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
