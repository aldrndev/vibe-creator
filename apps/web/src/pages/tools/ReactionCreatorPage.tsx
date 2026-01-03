import { useState, useRef, useEffect } from 'react';

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
  Chip,
  Switch
} from '@heroui/react';
import { Upload, Play, Download, ArrowLeft, Monitor, Smartphone, Grid, Layers, Check, Sparkles, Volume2, Lock, 
  AlertTriangle 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { authFetch } from '@/services/api';
import toast from 'react-hot-toast';


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
  
  const [layoutMode, setLayoutMode] = useState<'side-by-side' | 'pip'>('side-by-side');
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [smoothBorder, setSmoothBorder] = useState(false);
  const [overlayMode, setOverlayMode] = useState(false);
  const [pipPosition, setPipPosition] = useState<PipPosition>('top-right');
  const [pipScale, setPipScale] = useState(0.3);
  const [_pipMargin, _setPipMargin] = useState(20);
  const [reactionVolume, setReactionVolume] = useState(0.8);
  const [mainVolume, setMainVolume] = useState(1.0);
  const [sideBySideLayout, setSideBySideLayout] = useState<SideBySideLayout>('horizontal');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [circular, setCircular] = useState(false);

  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [results, setResults] = useState<Record<string, string>>({});
  
  const mainInputRef = useRef<HTMLInputElement>(null);
  const reactionInputRef = useRef<HTMLInputElement>(null);

  const handleMainVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        alert('Ukuran file maksimal 200MB');
        return;
      }
      setMainVideoFile(file);
      setMainVideoUrl(URL.createObjectURL(file));
      setResults({});
    }
  };

  const handleReactionVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        alert('Ukuran file maksimal 200MB');
        return;
      }
      setReactionVideoFile(file);
      setReactionVideoUrl(URL.createObjectURL(file));
      setResults({});
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
      
      setProcessingStatus('Mengupload video reaksi...');
      const reactionFormData = new FormData();
      reactionFormData.append('video', reactionVideoFile);
      const reactionUploadRes = await authFetch('/api/v1/upload/video', {
        method: 'POST',
        body: reactionFormData,
      });
      if (!reactionUploadRes.ok) throw new Error('Reaction video upload failed');
      const reactionData = await reactionUploadRes.json();

      setProcessingStatus('Memproses video...');

      if (layoutMode === 'pip') {
        const payload = {
           mainVideoPath: mainData.data.filepath,
           reactionVideoPath: reactionData.data.filepath,
           position: pipPosition,
           scale: pipScale, // Assuming pipScale is already a decimal
           margin: 20,
           circular: circular,
           aspectRatio: aspectRatio,
           reactionVolume,
           mainVolume,
        };
        
        const res = await authFetch('/api/v1/reaction/create-mixed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        const data = await res.json();
        if (res.ok && data.data) {
           const filename = data.data.outputPath.split('/').pop();
           setProcessingStatus('Mendownload hasil...');
           const downloadRes = await authFetch(`/api/v1/reaction/download/${filename}`);
           if (!downloadRes.ok) throw new Error('Gagal mengambil video hasil');
           const blob = await downloadRes.blob();
           const url = URL.createObjectURL(blob);
           setResults(prev => ({ ...prev, [layoutMode]: url }));
           toast.success('Video berhasil diproses!');
        } else {
           throw new Error(data.error?.message || 'Gagal memproses video');
        }

      } else {
        // Side-by-Side
        const payload = {
           leftVideoPath: mainData.data.filepath, // Main is Left/Top
           rightVideoPath: reactionData.data.filepath, // Reaction is Right/Bottom
           layout: sideBySideLayout,
           aspectRatio,
           reactionVolume,
           mainVolume,
           splitRatio,
           smoothBorder,
           overlayMode,
        };

        const res = await authFetch('/api/v1/reaction/create-side-by-side', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        const data = await res.json();
        if (res.ok && data.data) {
           const filename = data.data.outputPath.split('/').pop();
           setProcessingStatus('Mendownload hasil...');
           const downloadRes = await authFetch(`/api/v1/reaction/download/${filename}`);
           if (!downloadRes.ok) throw new Error('Gagal mengambil video hasil');
           const blob = await downloadRes.blob();
           const url = URL.createObjectURL(blob);
           setResults(prev => ({ ...prev, [layoutMode]: url }));
           toast.success('Video berhasil diproses!');
        } else {
           throw new Error(data.error?.message || 'Gagal memproses video');
        }
      }
      setProcessingStatus('Selesai!');
      
    } catch (err) {
      console.error('Processing failed', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setProcessingStatus('Gagal: ' + message);
      toast.error(message);
      setIsProcessing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup blob URL on unmount or change
  useEffect(() => {
    return () => {
      Object.values(results).forEach(url => {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
      });
    };
  }, [results]);

  const currentLayoutConfig = layoutModes.find(m => m.id === layoutMode)!;
  const resultUrl = results[layoutMode];

  return (
    <PageTransition className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div 
          className="flex items-center gap-4 mb-6"
        >
          <Button 
            as={Link} 
            to="/dashboard" 
            isIconOnly 
            variant="light" 
            size="sm"
          >
            <ArrowLeft size={20} />
          </Button>
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
                    <p className="text-foreground/40 text-xs mt-1">Video yang akan ditonton/direaksikan • Max 200MB, 5 Min</p>
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
                    <p className="text-foreground/40 text-xs mt-1">Video wajah/reaksi kamu • Max 200MB, 5 Min</p>
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
                <div className="relative">
                  {(!mainVideoFile || !reactionVideoFile) && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
                      <div className="bg-default-100 p-3 rounded-full mb-2">
                        <Lock size={20} className="text-foreground/50" />
                      </div>
                      <p className="text-xs font-medium text-foreground/50">Upload kedua video untuk mengatur</p>
                    </div>
                  )}
                  <div className={(!mainVideoFile || !reactionVideoFile) ? "opacity-30 pointer-events-none blur-[1px] transition-all space-y-6" : "transition-all space-y-6"}>
                    
                    {/* Global Output Settings */}
                    <div>
                         <label className="text-sm font-medium mb-2 block">Aspect Ratio (Output)</label>
                         <Select
                           aria-label="Aspect Ratio"
                           selectedKeys={[aspectRatio]}
                           onSelectionChange={(keys) => setAspectRatio(Array.from(keys)[0] as string)}
                           classNames={{ value: "text-small" }}
                         >
                           <SelectItem key="16:9" textValue="16:9 (YouTube)">16:9 (YouTube, FB Video)</SelectItem>
                           <SelectItem key="9:16" textValue="9:16 (TikTok/Reels)">9:16 (TikTok, Reels, YT Shorts)</SelectItem>
                           <SelectItem key="1:1" textValue="1:1 (Square)">1:1 (Instagram, FB Feed)</SelectItem>
                           <SelectItem key="4:5" textValue="4:5 (Portrait)">4:5 (IG/FB Portrait)</SelectItem>
                         </Select>
                    </div>

                    {/* PiP Settings */}
                    {layoutMode === 'pip' && (
                      <>
                        <div className="flex justify-between items-center bg-default-50 p-2 rounded-lg">
                            <label className="text-sm font-medium">Bentuk Lingkaran</label>
                            <Switch size="sm" isSelected={circular} onValueChange={setCircular} aria-label="Circular Mode" />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Posisi PiP</label>
                          <Select
                            aria-label="Posisi PiP"
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
                            aria-label="Ukuran PiP"
                            step={0.05}
                            minValue={0.15}
                            maxValue={0.5}
                            value={pipScale}
                            onChange={(v) => setPipScale(v as number)}
                            color="primary"
                          />
                        </div>


                      </>
                    )}

                    {/* Side-by-side Settings */}
                    {layoutMode === 'side-by-side' && (
                      <div className="flex flex-col gap-6">
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

                        {/* Split Ratio Slider */}
                        <div className="mt-4 space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <Grid size={16} className="text-foreground/50" />
                                Rasio Pembagian
                              </span>
                              <span className="text-foreground/70">{Math.round(splitRatio * 100)}% Main</span>
                            </div>
                            <Slider 
                              aria-label="Split Ratio"
                              size="sm"
                              step={0.05}
                              maxValue={0.7}
                              minValue={0.5}
                              defaultValue={0.5}
                              value={splitRatio}
                              onChange={(v) => {
                                const val = Array.isArray(v) ? v[0] : v;
                                if (typeof val === 'number') setSplitRatio(val);
                              }}
                              className="max-w-md"
                              color="primary"
                            />
                            <p className="text-xs text-foreground/40">
                              Geser ke kanan untuk memperbesar video utama (Max 70%).
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Switch
                            size="sm"
                            isSelected={smoothBorder}
                            onValueChange={setSmoothBorder}
                          >
                            <span className="text-sm">Gradient Blending (Halus)</span>
                          </Switch>
                          <p className="text-xs text-foreground/40 pl-10">
                             Efek gradasi transparan di perbatasan. Gunakan bersama <b>Overlay Mode</b> untuk hasil menyatu terbaik.
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                           <Switch
                            size="sm"
                            isSelected={overlayMode}
                            onValueChange={setOverlayMode}
                          >
                            <span className="text-sm">Overlay Mode (Tumpuk)</span>
                          </Switch>
                           <p className="text-xs text-foreground/40 pl-10">
                             Video Utama Full Screen, Video Reaksi ditumpuk di atasnya.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Audio Settings (Global) */}
                    <div>
                        <label className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Volume2 size={14} /> Main Volume: {Math.round(mainVolume * 100)}%
                        </label>
                        <Slider
                          aria-label="Main Volume"
                          step={0.1}
                          minValue={0}
                          maxValue={2}
                          value={mainVolume}
                          onChange={(v) => setMainVolume(v as number)}
                          color="success"
                        />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Volume2 size={14} /> Reaction Volume: {Math.round(reactionVolume * 100)}%
                      </label>
                      <Slider
                        aria-label="Volume Reaksi"
                        step={0.1}
                        minValue={0}
                        maxValue={2}
                        value={reactionVolume}
                        onChange={(v) => setReactionVolume(v as number)}
                        color="secondary"
                      />
                    </div>
                  </div>
                </div>

                <Divider />

                {/* Processing Status */}
                {isProcessing && (
                  <div className="space-y-2 p-3 rounded-lg bg-primary/5">
                    <Progress isIndeterminate size="sm" color="primary" aria-label="Sedang memproses" />
                    <p className="text-sm text-center text-foreground/60">{processingStatus}</p>
                  </div>
                )}



                <Divider className="my-2" />

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
                <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="text-warning shrink-0 mt-0.5" size={18} />
                  <div>
                    <h3 className="text-sm font-semibold text-warning-700 dark:text-warning-500">Video Tidak Disimpan Permanen</h3>
                    <p className="text-xs text-muted-foreground mt-1 text-warning-800/80 dark:text-warning-300/80">
                       Hasil video ini hanya tersimpan di server selama <b>60 menit</b>. 
                       Harap segera unduh video Anda sebelum dihapus otomatis oleh sistem.
                    </p>
                  </div>
                </div>
                <video
                  src={resultUrl}
                  controls
                  autoPlay
                  muted
                  className="w-full max-w-2xl mx-auto rounded-xl"
                />
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
