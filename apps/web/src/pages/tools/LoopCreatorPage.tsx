import { useState, useRef } from 'react';
import { Button, Card, CardBody, CardHeader, Slider, Divider, Progress, Chip } from '@heroui/react';
import { Upload, RefreshCw, Repeat, Film, Download, ArrowLeft, Sparkles, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageTransition, HoverCard } from '@/components/ui/PageTransition';
import { authFetch } from '@/services/api';

type LoopMode = 'loop' | 'boomerang' | 'gif';

const loopModes = [
  { 
    id: 'loop' as const, 
    name: 'Loop', 
    description: 'Ulangi video beberapa kali',
    icon: Repeat,
    color: 'primary'
  },
  { 
    id: 'boomerang' as const, 
    name: 'Boomerang', 
    description: 'Maju-mundur seamless',
    icon: RefreshCw,
    color: 'secondary'
  },
  { 
    id: 'gif' as const, 
    name: 'GIF', 
    description: 'Export ke format GIF',
    icon: Film,
    color: 'warning'
  },
];

export function LoopCreatorPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [loopMode, setLoopMode] = useState<LoopMode>('loop');
  const [loopCount, setLoopCount] = useState(3);
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(5000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [resultUrl, setResultUrl] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setResultUrl('');
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration * 1000;
      setEndMs(Math.min(duration, 10000));
    }
  };

  const handleProcess = async () => {
    if (!videoFile) return;

    try {
      setIsProcessing(true);
      setProcessingStatus('Mengupload video...');
      
      const formData = new FormData();
      formData.append('video', videoFile);
      
      const uploadRes = await authFetch('/api/v1/upload/video', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const inputPath = uploadData.data.path;
      
      setProcessingStatus(`Membuat ${loopMode === 'gif' ? 'GIF' : loopMode === 'boomerang' ? 'boomerang' : 'loop'}...`);
      
      const endpoint = loopMode === 'gif' 
        ? '/api/v1/loop/gif'
        : loopMode === 'boomerang'
          ? '/api/v1/loop/boomerang'
          : '/api/v1/loop/create';
          
      const body: Record<string, unknown> = {
        inputPath,
        startMs,
        endMs,
      };
      
      if (loopMode === 'loop') {
        body.loopCount = loopCount;
      }
      if (loopMode === 'gif') {
        body.fps = 15;
        body.width = 480;
      }
      
      const processRes = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!processRes.ok) throw new Error('Processing failed');
      const processData = await processRes.json();
      
      const filename = processData.data.outputPath.split('/').pop();
      setResultUrl(`/api/v1/loop/download/${filename}`);
      setProcessingStatus('Selesai!');
      
    } catch (err) {
      console.error('Processing failed:', err);
      setProcessingStatus('Gagal: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const currentModeConfig = loopModes.find(m => m.id === loopMode)!;

  return (
    <PageTransition className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard">
            <Button isIconOnly variant="light" size="sm">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Repeat size={24} className="text-primary" />
              Loop Creator
            </h1>
            <p className="text-foreground/60 text-sm">Buat video loop, boomerang, atau GIF</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Video Preview */}
          <div>
            <Card className="h-full">
              <CardHeader className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Upload size={16} className="text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Video</h2>
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
                    <p className="text-foreground/60 font-medium">Klik untuk upload video</p>
                    <p className="text-foreground/40 text-sm mt-1">MP4, MOV, WebM</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      loop
                      className="w-full aspect-video rounded-xl bg-black"
                      onLoadedMetadata={handleVideoLoaded}
                    />
                    <Button 
                      variant="flat" 
                      size="sm"
                      onPress={() => fileInputRef.current?.click()}
                      startContent={<Upload size={14} />}
                    >
                      Ganti Video
                    </Button>
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

          {/* Right: Controls */}
          <div>
            <Card>
              <CardHeader className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-secondary" />
                </div>
                <h2 className="text-lg font-semibold">Pengaturan</h2>
              </CardHeader>
              <CardBody className="space-y-6">
                {/* Loop Mode Cards */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {loopModes.map((mode) => (
                      <HoverCard key={mode.id}>
                        <Card 
                          isPressable
                          onPress={() => setLoopMode(mode.id)}
                          className={`border-2 transition-colors ${
                            loopMode === mode.id 
                              ? `border-${mode.color} bg-${mode.color}/10` 
                              : 'border-transparent hover:border-divider'
                          }`}
                        >
                          <CardBody className="p-3 text-center">
                            <div className={`w-10 h-10 rounded-lg bg-${mode.color}/20 flex items-center justify-center mx-auto mb-2`}>
                              <mode.icon size={20} className={`text-${mode.color}`} />
                            </div>
                            <p className="font-medium text-sm">{mode.name}</p>
                            <p className="text-xs text-foreground/50 mt-0.5">{mode.description}</p>
                            {loopMode === mode.id && (
                              <Chip size="sm" color={mode.color as 'primary' | 'secondary' | 'warning'} className="mt-2">
                                <Check size={12} />
                              </Chip>
                            )}
                          </CardBody>
                        </Card>
                      </HoverCard>
                    ))}
                  </div>
                </div>

                <Divider />

                {/* Trim Controls */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Rentang: {(startMs / 1000).toFixed(1)}s - {(endMs / 1000).toFixed(1)}s
                  </label>
                  <div className="flex gap-4">
                    <Slider
                      label="Mulai"
                      step={100}
                      minValue={0}
                      maxValue={endMs - 500}
                      value={startMs}
                      onChange={(v) => setStartMs(v as number)}
                      className="flex-1"
                      color="primary"
                    />
                    <Slider
                      label="Akhir"
                      step={100}
                      minValue={startMs + 500}
                      maxValue={30000}
                      value={endMs}
                      onChange={(v) => setEndMs(v as number)}
                      className="flex-1"
                      color="primary"
                    />
                  </div>
                </div>

                {/* Loop Count */}
                {loopMode === 'loop' && (
                  <>
                    <Divider />
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Jumlah Loop: {loopCount}x
                      </label>
                      <Slider
                        step={1}
                        minValue={2}
                        maxValue={10}
                        value={loopCount}
                        onChange={(v) => setLoopCount(v as number)}
                        color="primary"
                      />
                    </div>
                  </>
                )}

                <Divider />

                {/* Processing Status */}
                {isProcessing && (
                  <div className="space-y-2 p-3 rounded-lg bg-primary/5">
                    <Progress isIndeterminate size="sm" color="primary" aria-label="Sedang memproses" />
                    <p className="text-sm text-center text-foreground/60">{processingStatus}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    color={currentModeConfig.color as 'primary' | 'secondary' | 'warning'}
                    className="flex-1"
                    isDisabled={!videoFile || isProcessing}
                    isLoading={isProcessing}
                    onPress={handleProcess}
                    startContent={!isProcessing && <currentModeConfig.icon size={18} />}
                    size="lg"
                  >
                    {loopMode === 'gif' ? 'Buat GIF' : loopMode === 'boomerang' ? 'Buat Boomerang' : 'Buat Loop'}
                  </Button>
                  
                  {resultUrl && (
                    <Button
                      as="a"
                      href={resultUrl}
                      download
                      color="success"
                      size="lg"
                      startContent={<Download size={18} />}
                    >
                      Download
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Result Preview */}
        {resultUrl && (
          <div className="mt-6">
            <Card className="border-2 border-success/30 bg-success/5">
              <CardHeader className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                  <Check size={16} className="text-success" />
                </div>
                <h2 className="text-lg font-semibold">Hasil</h2>
                <Chip color="success" size="sm" variant="flat">Selesai</Chip>
              </CardHeader>
              <CardBody>
                {loopMode === 'gif' ? (
                  <img 
                    src={resultUrl} 
                    alt="Result GIF" 
                    className="max-w-md mx-auto rounded-xl"
                  />
                ) : (
                  <video
                    src={resultUrl}
                    controls
                    loop
                    autoPlay
                    muted
                    className="max-w-md mx-auto rounded-xl"
                  />
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
