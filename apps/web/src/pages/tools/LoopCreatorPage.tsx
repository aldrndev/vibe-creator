import { useState, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Button, Card, CardBody, CardHeader, Slider, Divider, Progress, Chip, Select, SelectItem, Switch, Input } from '@heroui/react';
import { Upload, RefreshCw, Repeat, Film, Download, ArrowLeft, Sparkles, Check, AlertTriangle, AlertCircle, Lock } from 'lucide-react';
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

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

export function LoopCreatorPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [loopMode, setLoopMode] = useState<LoopMode>('loop');
  const [loopCount, setLoopCount] = useState(3);
  const [aspectRatio, setAspectRatio] = useState<string>('');
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(5000);
  const [maxDuration, setMaxDuration] = useState(30000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [results, setResults] = useState<Record<string, string>>({});
  const [useDurationMode, setUseDurationMode] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState(1);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Calculate loopCount based on targetMinutes and current video segment duration
  useEffect(() => {
    if (useDurationMode && videoRef.current) {
      const segmentDurationSeconds = (endMs - startMs) / 1000;
      if (segmentDurationSeconds > 0) {
        const targetDurationSeconds = targetMinutes * 60;
        let calculatedLoopCount = Math.ceil(targetDurationSeconds / segmentDurationSeconds);
        if (loopMode === 'boomerang') {
          // Boomerang cycle is 2x segment duration (forward + backward)
          calculatedLoopCount = Math.ceil(targetDurationSeconds / (segmentDurationSeconds * 2));
        }
        setLoopCount(Math.max(1, calculatedLoopCount));
      } else {
        setLoopCount(1);
      }
    }
  }, [useDurationMode, targetMinutes, startMs, endMs, loopMode]);

  // Reset states when switching modes to prevent invalid values per mode limits
  useEffect(() => {
    setLoopCount(loopMode === 'boomerang' ? 1 : 3);
    if (loopMode === 'boomerang') setUseDurationMode(false);
  }, [loopMode]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Gate: Max Size 200MB
      if (file.size > 200 * 1024 * 1024) {
        alert('File terlalu besar! Maksimal 200MB.');
        return;
      }
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setResults({});
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
       const duration = videoRef.current.duration * 1000;
       // Gate: Max Duration 5 Minutes
       if (duration > 5 * 60 * 1000) {
          alert('Durasi video terlalu panjang! Maksimal 5 menit.');
          setVideoFile(null);
          setVideoUrl('');
          return;
       }
       setMaxDuration(duration);
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
      const inputPath = uploadData.data.filepath; // fix: use filepath from backend
      
      setProcessingStatus(`Membuat ${loopMode === 'gif' ? 'GIF' : loopMode === 'boomerang' ? 'boomerang' : 'loop'}...`);
      
      const endpoint = loopMode === 'gif' 
        ? '/api/v1/loop/gif'
        : loopMode === 'boomerang'
          ? '/api/v1/loop/boomerang'
          : '/api/v1/loop/create';
          
      const body: any = { inputPath, startMs, endMs };

      if (aspectRatio) {
        body.aspectRatio = aspectRatio;
      }
      
      // Auto enable seamless for standard loops
      if (loopMode === 'loop') {
         body.crossfade = true;
         // UI is "Total Plays", Backend expects "Repeats" (Total - 1)
         body.loopCount = Math.max(1, loopCount - 1);
      }
      // NEW: Enable loopCount for Boomerang (Ping-Pong Loop)
      if (loopMode === 'boomerang') {
         // UI is "Total Plays of (Forward+Backward) Cycle"
         // Backend Loop filter repeats = loopCount - 1
         body.loopCount = Math.max(1, loopCount - 1);
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
      
      // Handle Windows/Unix paths for filename
      const outputPath = processData.data.outputPath || processData.data; // Handle potential response variations
      const filename = typeof outputPath === 'string' ? outputPath.split(/[/\\]/).pop() : '';
      
      if (!filename) throw new Error('Invalid output path');

      setProcessingStatus('Mendownload hasil...');
      const downloadRes = await authFetch(`/api/v1/loop/download/${filename}`);
      if (!downloadRes.ok) throw new Error('Gagal mengambil file hasil');

      const blob = await downloadRes.blob();
      const downloadUrl = URL.createObjectURL(blob);

      setResults(prev => ({
        ...prev,
        [loopMode]: downloadUrl
      }));
      setProcessingStatus('Selesai!');
      
    } catch (err) {
      logger.error('Processing failed', err);
      setProcessingStatus('Gagal: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(results).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [results]); // Add results dependency to clean up old blobs if results change? 
                // Or just empty dependency for unmount? map keeps refs.
                // Best to cleanup only on unmount for simple implementation.
                // But if map changes, we might want to clean up old ones?
                // For simplicity, cleaning up on unmount is sufficient for now.
  
  const currentModeConfig = loopModes.find(m => m.id === loopMode)!;

  return (
    <PageTransition className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
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
                    <p className="text-foreground/40 text-sm mt-1">MP4, MOV, WebM • Max 200MB, 5 Min</p>
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
                          </CardBody>
                        </Card>
                      </HoverCard>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  {!videoFile && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
                      <div className="bg-default-100 p-3 rounded-full mb-2">
                        <Lock size={20} className="text-foreground/50" />
                      </div>
                      <p className="text-xs font-medium text-foreground/50">Upload video untuk mengatur</p>
                    </div>
                  )}
                  <div className={!videoFile ? "opacity-30 pointer-events-none blur-[1px] transition-all space-y-6" : "transition-all space-y-6"}>
                    <Divider />

                    <div className="mt-4">
                  <Select 
                    label="Format Output (Canvas)" 
                    placeholder="Pilih Rasio" 
                    selectedKeys={aspectRatio ? [aspectRatio] : []}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="max-w-full"
                    size="sm"
                  >
                    <SelectItem key="">Original (Tanpa Crop)</SelectItem>
                    <SelectItem key="16:9">16:9 (YouTube, FB Video)</SelectItem>
                    <SelectItem key="9:16">9:16 (TikTok/Reels/Shorts)</SelectItem>
                    <SelectItem key="1:1">1:1 (IG/FB Feed)</SelectItem>
                    <SelectItem key="4:5">4:5 (IG/FB Portrait)</SelectItem>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    *Otomatis menambahkan background blur jika rasio tidak sesuai
                  </p>
                </div>

                <Divider className="my-4" />

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
                      getValue={(v) => `${(v as number / 1000).toFixed(1)}s`}
                      className="flex-1"
                      color="primary"
                    />
                    <Slider
                      label="Akhir"
                      step={100}
                      minValue={startMs + 500}
                      maxValue={maxDuration}
                      value={endMs}
                      onChange={(v) => setEndMs(v as number)}
                      getValue={(v) => `${(v as number / 1000).toFixed(1)}s`}
                      className="flex-1"
                      color="primary"
                    />
                  </div>
                </div>
                
                {/* GIF Duration Warning */}
                {loopMode === 'gif' && (endMs - startMs) > 10000 && (
                   <div className="mt-3 p-2 bg-warning/10 border border-warning/20 rounded-md flex items-center gap-2">
                     <AlertCircle size={14} className="text-warning" />
                     <p className="text-xs text-warning-700">
                       Durasi GIF {((endMs-startMs)/1000).toFixed(1)}s cukup panjang. Ukuran file mungkin sangat besar.
                     </p>
                   </div>
                )}

                {/* Loop Count / Duration Control */}
                {(loopMode === 'loop' || loopMode === 'boomerang') && (
                  <>
                    <Divider />
                    <div className="space-y-4">
                      {loopMode === 'loop' && (
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">Target Output</label>
                        <Switch 
                          size="sm" 
                          isSelected={useDurationMode} 
                          onValueChange={setUseDurationMode}
                        >
                          <span className="text-xs">{useDurationMode ? 'Durasi' : 'Jumlah Putar'}</span>
                        </Switch>
                      </div>
                      )}

                       {(loopMode === 'loop' && useDurationMode) ? (() => {
                         // [EXISTING DURATION MODE LOGIC FOR LOOP]
                         const durationMs = endMs - startMs;
                         let unitMs = durationMs;
                           const overlap = Math.min(2000, durationMs * 0.3);
                           unitMs = durationMs - overlap;
                         
                         const maxPossibleMinutes = Math.floor((5000 * unitMs) / 60000);
                         const uiMaxMinutes = Math.min(500, maxPossibleMinutes);

                         return (
                        <div className="space-y-2">
                           <Input
                             type="number"
                             label="Durasi Target (Menit)"
                             placeholder={`Maks: ${uiMaxMinutes} menit`}
                             value={targetMinutes.toString()}
                             onValueChange={(v) => {
                               setTargetMinutes(Number(v));
                               const targetMs = Number(v) * 60 * 1000;
                               const calcLoops = Math.ceil(targetMs / unitMs);
                               setLoopCount(calcLoops);
                             }}
                             min={1}
                             max={uiMaxMinutes}
                             classNames={{
                               input: "[&::-webkit-inner-spin-button]:appearance-none"
                             }}
                             description={`Maksimal input: ${uiMaxMinutes} menit (berdasarkan batas 5000x putaran).`}
                             isInvalid={loopCount > 5000}
                             errorMessage={loopCount > 5000 ? `Durasi ini membutuhkan ${loopCount}x putaran (Melebihi batas 5000x). Harap kurangi durasi.` : ''}
                           />
                           <p className={`text-xs ${loopCount > 5000 ? 'text-danger' : 'text-muted-foreground'}`}>
                             Sistem akan mengulang sebanyak <b>{loopCount}x</b> {loopCount > 5000 && '(Terlalu Banyak!)'} untuk mencapai durasi ini.
                           </p>
                        </div>
                         );
                       })() : (
                        <div>
                          {loopMode === 'boomerang' && (
                             <div className="mb-2 p-2 bg-primary/10 rounded-md text-xs text-primary">
                                <b>Mode Boomerang:</b> Total Putar disesuaikan agar durasi maksimal 1 Menit.
                             </div>
                          )}
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium">
                              Total Putar: {loopCount}x
                            </label>
                            <span className="text-xs text-muted-foreground">
                              Estimasi: {formatDuration((
                                loopMode === 'loop' 
                                  ? ((endMs - startMs - Math.min(2000, (endMs - startMs)*0.3)) * loopCount)
                                  : ((endMs - startMs) * 2 * loopCount)
                              ) / 1000)}
                            </span>
                          </div>
                          <Slider 
                            aria-label="Loop Count"
                            step={1}
                            minValue={1}
                            maxValue={(() => {
                                if (loopMode === 'boomerang') {
                                    // Calculate Max Loops to hit 60s
                                    const unitMs = (endMs - startMs) * 2;
                                    const maxLoops = Math.max(1, Math.floor(60000 / unitMs));
                                    return maxLoops;
                                }
                                return 50; // Standard Loop Max
                            })()} 
                            value={loopCount}
                            onChange={(v) => setLoopCount(v as number)}
                            className="flex-1"
                          />
                          {loopMode === 'boomerang' && (
                             <p className="text-xs text-muted-foreground mt-1">
                               Max {Math.max(1, Math.floor(60000 / ((endMs-startMs)*2)))}x putaran (karena batas durasi 1 menit).
                             </p>
                          )}
                        </div>
                       )}
                    </div>
                  </>
                )}

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

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    color={currentModeConfig.color as 'primary' | 'secondary' | 'warning'}
                    className="flex-1"
                    isDisabled={!videoFile || isProcessing || loopCount > 5000}
                    isLoading={isProcessing}
                    onPress={handleProcess}
                    startContent={!isProcessing && <currentModeConfig.icon size={18} />}
                    size="lg"
                  >
                    {loopMode === 'gif' ? 'Buat GIF' : loopMode === 'boomerang' ? 'Buat Boomerang' : 'Buat Loop'}
                  </Button>
                  
                  {results[loopMode] && (
                    <Button
                      as="a"
                      href={results[loopMode]}
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
        {results[loopMode] && (
          <div className="mt-6">
            <Card className="border-2 border-success/30 bg-success/5">
              <CardHeader className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                  <Check size={16} className="text-success" />
                </div>
                <h2 className="text-lg font-semibold">Hasil ({loopMode === 'loop' ? 'Seamless' : loopMode === 'boomerang' ? 'Boomerang' : 'GIF'})</h2>
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
                {loopMode === 'gif' ? (
                  <img 
                    src={results[loopMode]} 
                    alt="Result GIF" 
                    className="w-full max-w-2xl mx-auto rounded-xl"
                  />
                ) : (
                  <video
                    src={results[loopMode]}
                    controls
                    loop
                    autoPlay
                    muted
                    className="w-full max-w-2xl mx-auto rounded-xl"
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
