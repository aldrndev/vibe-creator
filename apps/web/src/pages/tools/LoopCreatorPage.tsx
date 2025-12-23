import { useState, useRef } from 'react';
import { Button, Card, CardBody, CardHeader, Slider, RadioGroup, Radio, Divider, Progress } from '@heroui/react';
import { Upload, RefreshCw, Repeat, Film, Download, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

type LoopMode = 'loop' | 'boomerang' | 'gif';

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
      setEndMs(Math.min(duration, 10000)); // Max 10 seconds for loop
    }
  };

  const handleProcess = async () => {
    if (!videoFile) return;

    try {
      setIsProcessing(true);
      setProcessingStatus('Mengupload video...');
      
      // First upload the video
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
      
      setProcessingStatus(`Membuat ${loopMode === 'gif' ? 'GIF' : loopMode === 'boomerang' ? 'boomerang' : 'loop'}...`);
      
      // Create loop/boomerang/gif
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
      
      const processRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      
      if (!processRes.ok) throw new Error('Processing failed');
      const processData = await processRes.json();
      
      // Get filename from path
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
          <h1 className="text-2xl font-bold">Loop Creator</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Video Preview */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Video</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {!videoUrl ? (
                <div 
                  className="aspect-video bg-default-100 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-default-200 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={48} className="text-default-400 mb-3" />
                  <p className="text-default-500">Klik untuk upload video</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  loop
                  className="w-full aspect-video rounded-xl bg-black"
                  onLoadedMetadata={handleVideoLoaded}
                />
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {videoUrl && (
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

          {/* Right: Controls */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Pengaturan</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              {/* Loop Mode */}
              <div>
                <label className="text-sm font-medium mb-2 block">Mode</label>
                <RadioGroup 
                  orientation="horizontal"
                  value={loopMode}
                  onValueChange={(v) => setLoopMode(v as LoopMode)}
                >
                  <Radio value="loop">
                    <div className="flex items-center gap-2">
                      <Repeat size={16} />
                      <span>Loop</span>
                    </div>
                  </Radio>
                  <Radio value="boomerang">
                    <div className="flex items-center gap-2">
                      <RefreshCw size={16} />
                      <span>Boomerang</span>
                    </div>
                  </Radio>
                  <Radio value="gif">
                    <div className="flex items-center gap-2">
                      <Film size={16} />
                      <span>GIF</span>
                    </div>
                  </Radio>
                </RadioGroup>
              </div>

              <Divider />

              {/* Trim Controls */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rentang ({(startMs / 1000).toFixed(1)}s - {(endMs / 1000).toFixed(1)}s)
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
                  />
                  <Slider
                    label="Akhir"
                    step={100}
                    minValue={startMs + 500}
                    maxValue={30000}
                    value={endMs}
                    onChange={(v) => setEndMs(v as number)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Loop Count (only for loop mode) */}
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
                    />
                  </div>
                </>
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
                  isDisabled={!videoFile || isProcessing}
                  isLoading={isProcessing}
                  onPress={handleProcess}
                  startContent={!isProcessing && (loopMode === 'gif' ? <Film size={18} /> : <Repeat size={18} />)}
                >
                  {loopMode === 'gif' ? 'Buat GIF' : loopMode === 'boomerang' ? 'Buat Boomerang' : 'Buat Loop'}
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
        )}
      </div>
    </div>
  );
}
