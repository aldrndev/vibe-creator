import { useState, useRef } from 'react';
import { 
  Button, 
  Card, 
  CardBody, 
  CardHeader, 
  Slider, 
  RadioGroup, 
  Radio, 
  Divider, 
  Progress,
  Select,
  SelectItem
} from '@heroui/react';
import { Upload, Play, Download, ArrowLeft, Monitor, Smartphone, Grid } from 'lucide-react';
import { Link } from 'react-router-dom';

type LayoutMode = 'pip' | 'side-by-side';
type PipPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type SideBySideLayout = 'horizontal' | 'vertical';

export function ReactionCreatorPage() {
  // Main video
  const [mainVideoFile, setMainVideoFile] = useState<File | null>(null);
  const [mainVideoUrl, setMainVideoUrl] = useState<string>('');
  
  // Reaction video
  const [reactionVideoFile, setReactionVideoFile] = useState<File | null>(null);
  const [reactionVideoUrl, setReactionVideoUrl] = useState<string>('');
  
  // Settings
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('pip');
  const [pipPosition, setPipPosition] = useState<PipPosition>('bottom-right');
  const [pipScale, setPipScale] = useState(0.3);
  const [pipMargin, setPipMargin] = useState(20);
  const [reactionVolume, setReactionVolume] = useState(0.8);
  const [sideBySideLayout, setSideBySideLayout] = useState<SideBySideLayout>('horizontal');
  
  // Processing
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
      
      // Upload main video
      const mainFormData = new FormData();
      mainFormData.append('video', mainVideoFile);
      
      const mainUploadRes = await fetch('/api/v1/upload/video', {
        method: 'POST',
        body: mainFormData,
        credentials: 'include',
      });
      if (!mainUploadRes.ok) throw new Error('Main video upload failed');
      const mainData = await mainUploadRes.json();
      const mainVideoPath = mainData.data.path;
      
      setProcessingStatus('Mengupload video reaksi...');
      
      // Upload reaction video
      const reactionFormData = new FormData();
      reactionFormData.append('video', reactionVideoFile);
      
      const reactionUploadRes = await fetch('/api/v1/upload/video', {
        method: 'POST',
        body: reactionFormData,
        credentials: 'include',
      });
      if (!reactionUploadRes.ok) throw new Error('Reaction video upload failed');
      const reactionData = await reactionUploadRes.json();
      const reactionVideoPath = reactionData.data.path;
      
      setProcessingStatus(`Membuat ${layoutMode === 'pip' ? 'reaction video' : 'side-by-side'}...`);
      
      let processRes: Response;
      
      if (layoutMode === 'pip') {
        // Create PiP reaction
        processRes = await fetch('/api/v1/reaction/create-mixed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mainVideoPath,
            reactionVideoPath,
            position: pipPosition,
            scale: pipScale,
            margin: pipMargin,
            reactionVolume,
          }),
          credentials: 'include',
        });
      } else {
        // Create side-by-side
        processRes = await fetch('/api/v1/reaction/side-by-side', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leftVideoPath: mainVideoPath,
            rightVideoPath: reactionVideoPath,
            layout: sideBySideLayout,
          }),
          credentials: 'include',
        });
      }
      
      if (!processRes.ok) throw new Error('Processing failed');
      const processData = await processRes.json();
      
      // Get filename from path
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard">
            <Button isIconOnly variant="light" size="sm">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Reaction Creator</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Main Video */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Monitor size={20} />
                Video Utama
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {!mainVideoUrl ? (
                <div 
                  className="aspect-video bg-default-100 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-default-200 transition-colors"
                  onClick={() => mainInputRef.current?.click()}
                >
                  <Upload size={48} className="text-default-400 mb-3" />
                  <p className="text-default-500 text-sm">Upload video utama</p>
                </div>
              ) : (
                <video
                  src={mainVideoUrl}
                  controls
                  className="w-full aspect-video rounded-xl bg-black"
                />
              )}
              
              <input
                ref={mainInputRef}
                type="file"
                accept="video/*"
                onChange={handleMainVideoSelect}
                className="hidden"
              />
              
              {mainVideoUrl && (
                <Button 
                  variant="flat" 
                  size="sm"
                  onPress={() => mainInputRef.current?.click()}
                  startContent={<Upload size={14} />}
                >
                  Ganti
                </Button>
              )}
            </CardBody>
          </Card>

          {/* Middle: Reaction Video */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Smartphone size={20} />
                Video Reaksi
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {!reactionVideoUrl ? (
                <div 
                  className="aspect-video bg-default-100 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-default-200 transition-colors"
                  onClick={() => reactionInputRef.current?.click()}
                >
                  <Upload size={48} className="text-default-400 mb-3" />
                  <p className="text-default-500 text-sm">Upload video reaksi</p>
                </div>
              ) : (
                <video
                  src={reactionVideoUrl}
                  controls
                  className="w-full aspect-video rounded-xl bg-black"
                />
              )}
              
              <input
                ref={reactionInputRef}
                type="file"
                accept="video/*"
                onChange={handleReactionVideoSelect}
                className="hidden"
              />
              
              {reactionVideoUrl && (
                <Button 
                  variant="flat" 
                  size="sm"
                  onPress={() => reactionInputRef.current?.click()}
                  startContent={<Upload size={14} />}
                >
                  Ganti
                </Button>
              )}
            </CardBody>
          </Card>

          {/* Right: Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Pengaturan</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              {/* Layout Mode */}
              <div>
                <label className="text-sm font-medium mb-2 block">Layout</label>
                <RadioGroup 
                  orientation="horizontal"
                  value={layoutMode}
                  onValueChange={(v) => setLayoutMode(v as LayoutMode)}
                >
                  <Radio value="pip">
                    <div className="flex items-center gap-2">
                      <Play size={16} />
                      <span>Picture-in-Picture</span>
                    </div>
                  </Radio>
                  <Radio value="side-by-side">
                    <div className="flex items-center gap-2">
                      <Grid size={16} />
                      <span>Side by Side</span>
                    </div>
                  </Radio>
                </RadioGroup>
              </div>

              <Divider />

              {/* PiP Settings */}
              {layoutMode === 'pip' && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Posisi</label>
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
                      Ukuran: {Math.round(pipScale * 100)}%
                    </label>
                    <Slider
                      step={0.05}
                      minValue={0.15}
                      maxValue={0.5}
                      value={pipScale}
                      onChange={(v) => setPipScale(v as number)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Volume Reaksi: {Math.round(reactionVolume * 100)}%
                    </label>
                    <Slider
                      step={0.1}
                      minValue={0}
                      maxValue={2}
                      value={reactionVolume}
                      onChange={(v) => setReactionVolume(v as number)}
                    />
                  </div>
                </>
              )}

              {/* Side-by-side Settings */}
              {layoutMode === 'side-by-side' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Orientasi</label>
                  <RadioGroup 
                    orientation="horizontal"
                    value={sideBySideLayout}
                    onValueChange={(v) => setSideBySideLayout(v as SideBySideLayout)}
                  >
                    <Radio value="horizontal">Horizontal</Radio>
                    <Radio value="vertical">Vertical</Radio>
                  </RadioGroup>
                </div>
              )}

              <Divider />

              {/* Processing Status */}
              {isProcessing && (
                <div className="space-y-2">
                  <Progress isIndeterminate size="sm" color="primary" />
                  <p className="text-sm text-center text-foreground/60">{processingStatus}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  color="primary"
                  className="flex-1"
                  isDisabled={!mainVideoFile || !reactionVideoFile || isProcessing}
                  isLoading={isProcessing}
                  onPress={handleProcess}
                  startContent={!isProcessing && <Play size={18} />}
                >
                  Buat Video
                </Button>
                
                {resultUrl && (
                  <Button
                    as="a"
                    href={resultUrl}
                    download
                    color="success"
                    startContent={<Download size={18} />}
                  >
                    Download
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Result Preview */}
        {resultUrl && (
          <Card className="mt-6">
            <CardHeader>
              <h2 className="text-lg font-semibold">Hasil</h2>
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
        )}
      </div>
    </div>
  );
}
