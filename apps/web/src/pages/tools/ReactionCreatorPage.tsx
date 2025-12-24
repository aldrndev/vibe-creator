import { useState, useRef } from 'react';
import { 
  Button, 
  Card, 
  CardBody, 
  CardHeader, 
  Slider, 
  Divider, 
  Progress,
  Select,
  SelectItem,
  Chip
} from '@heroui/react';
import { Upload, Play, Download, ArrowLeft, Monitor, Smartphone, Grid, Layers, Check, Sparkles, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authFetch } from '@/services/api';

import { PageTransition, HoverCard } from '@/components/ui/PageTransition';

type LayoutMode = 'pip' | 'side-by-side';
type PipPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type SideBySideLayout = 'horizontal' | 'vertical';

const layoutModes = [
  { 
    id: 'pip' as const, 
    name: 'Picture-in-Picture', 
    description: 'Video reaksi di sudut',
    icon: Layers,
    color: 'primary'
  },
  { 
    id: 'side-by-side' as const, 
    name: 'Side by Side', 
    description: 'Dua video berdampingan',
    icon: Grid,
    color: 'secondary'
  },
];

export function ReactionCreatorPage() {
  const [mainVideoFile, setMainVideoFile] = useState<File | null>(null);
  const [mainVideoUrl, setMainVideoUrl] = useState<string>('');
  const [reactionVideoFile, setReactionVideoFile] = useState<File | null>(null);
  const [reactionVideoUrl, setReactionVideoUrl] = useState<string>('');
  
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('pip');
  const [pipPosition, setPipPosition] = useState<PipPosition>('bottom-right');
  const [pipScale, setPipScale] = useState(0.3);
  const [_pipMargin, _setPipMargin] = useState(20);
  const [reactionVolume, setReactionVolume] = useState(0.8);
  const [sideBySideLayout, setSideBySideLayout] = useState<SideBySideLayout>('horizontal');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [resultUrl, setResultUrl] = useState<string>('');
  
  const mainInputRef = useRef<HTMLInputElement>(null);
  const reactionInputRef = useRef<HTMLInputElement>(null);

  const handleMainVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainVideoFile(file);
      setMainVideoUrl(URL.createObjectURL(file));
      setResultUrl('');
    }
  };

  const handleReactionVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReactionVideoFile(file);
      setReactionVideoUrl(URL.createObjectURL(file));
      setResultUrl('');
    }
  };

  const handleProcess = async () => {
    if (!mainVideoFile || !reactionVideoFile) return;

    try {
      setIsProcessing(true);
      setProcessingStatus('Mengupload video utama...');
      
      const mainFormData = new FormData();
      mainFormData.append('video', mainVideoFile);
      
      const mainUploadRes = await authFetch('/api/v1/upload/video', {
        method: 'POST',
        body: mainFormData,
      });
      if (!mainUploadRes.ok) throw new Error('Main video upload failed');
      const mainData = await mainUploadRes.json();
      const mainVideoPath = mainData.data.path;
      
      setProcessingStatus('Mengupload video reaksi...');
      
      const reactionFormData = new FormData();
      reactionFormData.append('video', reactionVideoFile);
      
      const reactionUploadRes = await authFetch('/api/v1/upload/video', {
        method: 'POST',
        body: reactionFormData,
      });
      if (!reactionUploadRes.ok) throw new Error('Reaction video upload failed');
      const reactionData = await reactionUploadRes.json();
      const reactionVideoPath = reactionData.data.path;
      
      setProcessingStatus(`Membuat ${layoutMode === 'pip' ? 'reaction video' : 'side-by-side'}...`);
      
      let processRes: Response;
      
      if (layoutMode === 'pip') {
        processRes = await authFetch('/api/v1/reaction/create-mixed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mainVideoPath,
            reactionVideoPath,
            position: pipPosition,
            scale: pipScale,
            margin: 20,
            reactionVolume,
          }),
        });
      } else {
        processRes = await authFetch('/api/v1/reaction/side-by-side', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leftVideoPath: mainVideoPath,
            rightVideoPath: reactionVideoPath,
            layout: sideBySideLayout,
          }),
        });
      }
      
      if (!processRes.ok) throw new Error('Processing failed');
      const processData = await processRes.json();
      
      const filename = processData.data.outputPath.split('/').pop();
      setResultUrl(`/api/v1/reaction/download/${filename}`);
      setProcessingStatus('Selesai!');
      
    } catch (err) {
      console.error('Processing failed:', err);
      setProcessingStatus('Gagal: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const currentLayoutConfig = layoutModes.find(m => m.id === layoutMode)!;

  return (
    <PageTransition className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div 
          className="flex items-center gap-4 mb-6"
        >
          <Link to="/dashboard">
            <Button isIconOnly variant="light" size="sm">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers size={24} className="text-primary" />
              Reaction Creator
            </h1>
            <p className="text-foreground/60 text-sm">Buat video reaction atau tempel</p>
          </div>
        </div>

        {/* Layout Mode Selection */}
        <div
          className="mb-6"
        >
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {layoutModes.map((mode) => (
              <HoverCard key={mode.id}>
                <Card 
                  isPressable
                  onPress={() => setLayoutMode(mode.id)}
                  className={`border-2 transition-colors ${
                    layoutMode === mode.id 
                      ? `border-${mode.color} bg-${mode.color}/10` 
                      : 'border-transparent hover:border-divider'
                  }`}
                >
                  <CardBody className="p-4 text-center">
                    <div className={`w-12 h-12 rounded-lg bg-${mode.color}/20 flex items-center justify-center mx-auto mb-2`}>
                      <mode.icon size={24} className={`text-${mode.color}`} />
                    </div>
                    <p className="font-medium">{mode.name}</p>
                    <p className="text-xs text-foreground/50 mt-0.5">{mode.description}</p>
                    {layoutMode === mode.id && (
                      <Chip size="sm" color={mode.color as 'primary' | 'secondary'} className="mt-2">
                        <Check size={12} />
                      </Chip>
                    )}
                  </CardBody>
                </Card>
              </HoverCard>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Main Video */}
          <div
          >
            <Card className="h-full">
              <CardHeader className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Monitor size={16} className="text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Video Utama</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                {!mainVideoUrl ? (
                  <div 
                    className="aspect-video bg-content2 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-content3 transition-colors border-2 border-dashed border-divider hover:border-primary/50"
                    onClick={() => mainInputRef.current?.click()}
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Upload size={28} className="text-primary" />
                    </div>
                    <p className="text-foreground/60 font-medium">Upload video utama</p>
                    <p className="text-foreground/40 text-xs mt-1">Video yang akan ditonton/direaksikan</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <video
                      src={mainVideoUrl}
                      controls
                      className="w-full aspect-video rounded-xl bg-black"
                    />
                    <Button 
                      variant="flat" 
                      size="sm"
                      onPress={() => mainInputRef.current?.click()}
                      startContent={<Upload size={14} />}
                    >
                      Ganti
                    </Button>
                  </div>
                )}
                
                <input
                  ref={mainInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleMainVideoSelect}
                  className="hidden"
                />
              </CardBody>
            </Card>
          </div>

          {/* Middle: Reaction Video */}
          <div
          >
            <Card className="h-full">
              <CardHeader className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Smartphone size={16} className="text-secondary" />
                </div>
                <h2 className="text-lg font-semibold">Video Reaksi</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                {!reactionVideoUrl ? (
                  <div 
                    className="aspect-video bg-content2 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-content3 transition-colors border-2 border-dashed border-divider hover:border-secondary/50"
                    onClick={() => reactionInputRef.current?.click()}
                  >
                    <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mb-3">
                      <Upload size={28} className="text-secondary" />
                    </div>
                    <p className="text-foreground/60 font-medium">Upload video reaksi</p>
                    <p className="text-foreground/40 text-xs mt-1">Video wajah/reaksi kamu</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <video
                      src={reactionVideoUrl}
                      controls
                      className="w-full aspect-video rounded-xl bg-black"
                    />
                    <Button 
                      variant="flat" 
                      size="sm"
                      onPress={() => reactionInputRef.current?.click()}
                      startContent={<Upload size={14} />}
                    >
                      Ganti
                    </Button>
                  </div>
                )}
                
                <input
                  ref={reactionInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleReactionVideoSelect}
                  className="hidden"
                />
              </CardBody>
            </Card>
          </div>

          {/* Right: Settings */}
          <div
          >
            <Card>
              <CardHeader className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-warning" />
                </div>
                <h2 className="text-lg font-semibold">Pengaturan</h2>
              </CardHeader>
              <CardBody className="space-y-6">
                {/* PiP Settings */}
                {layoutMode === 'pip' && (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Posisi PiP</label>
                      <Select
                        selectedKeys={[pipPosition]}
                        onSelectionChange={(keys) => setPipPosition(Array.from(keys)[0] as PipPosition)}
                      >
                        <SelectItem key="top-left">Kiri Atas</SelectItem>
                        <SelectItem key="top-right">Kanan Atas</SelectItem>
                        <SelectItem key="bottom-left">Kiri Bawah</SelectItem>
                        <SelectItem key="bottom-right">Kanan Bawah</SelectItem>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Ukuran PiP: {Math.round(pipScale * 100)}%
                      </label>
                      <Slider
                        step={0.05}
                        minValue={0.15}
                        maxValue={0.5}
                        value={pipScale}
                        onChange={(v) => setPipScale(v as number)}
                        color="primary"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Volume2 size={14} />
                        Volume Reaksi: {Math.round(reactionVolume * 100)}%
                      </label>
                      <Slider
                        step={0.1}
                        minValue={0}
                        maxValue={2}
                        value={reactionVolume}
                        onChange={(v) => setReactionVolume(v as number)}
                        color="secondary"
                      />
                    </div>
                  </>
                )}

                {/* Side-by-side Settings */}
                {layoutMode === 'side-by-side' && (
                  <div>
                    <label className="text-sm font-medium mb-3 block">Orientasi</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Card 
                        isPressable
                        onPress={() => setSideBySideLayout('horizontal')}
                        className={`border-2 ${sideBySideLayout === 'horizontal' ? 'border-primary bg-primary/10' : 'border-transparent'}`}
                      >
                        <CardBody className="p-3 text-center">
                          <div className="flex gap-1 justify-center mb-2">
                            <div className="w-6 h-4 bg-foreground/20 rounded" />
                            <div className="w-6 h-4 bg-foreground/20 rounded" />
                          </div>
                          <p className="text-sm">Horizontal</p>
                        </CardBody>
                      </Card>
                      <Card 
                        isPressable
                        onPress={() => setSideBySideLayout('vertical')}
                        className={`border-2 ${sideBySideLayout === 'vertical' ? 'border-primary bg-primary/10' : 'border-transparent'}`}
                      >
                        <CardBody className="p-3 text-center">
                          <div className="flex flex-col gap-1 items-center mb-2">
                            <div className="w-8 h-3 bg-foreground/20 rounded" />
                            <div className="w-8 h-3 bg-foreground/20 rounded" />
                          </div>
                          <p className="text-sm">Vertical</p>
                        </CardBody>
                      </Card>
                    </div>
                  </div>
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
                    color={currentLayoutConfig.color as 'primary' | 'secondary'}
                    className="flex-1"
                    isDisabled={!mainVideoFile || !reactionVideoFile || isProcessing}
                    isLoading={isProcessing}
                    onPress={handleProcess}
                    startContent={!isProcessing && <Play size={18} />}
                    size="lg"
                  >
                    Buat Video
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
          <div
            className="mt-6"
          >
            <Card className="border-2 border-success/30 bg-success/5">
              <CardHeader className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                  <Check size={16} className="text-success" />
                </div>
                <h2 className="text-lg font-semibold">Hasil</h2>
                <Chip color="success" size="sm" variant="flat">Selesai</Chip>
              </CardHeader>
              <CardBody>
                <video
                  src={resultUrl}
                  controls
                  autoPlay
                  muted
                  className="max-w-2xl mx-auto rounded-xl"
                />
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
