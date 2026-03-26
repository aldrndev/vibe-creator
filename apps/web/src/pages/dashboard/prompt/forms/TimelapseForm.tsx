import { Plus, Sliders, X } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui';
import { TargetModelSelector } from '../components/TargetModelSelector';
import {
  aspectRatios,
  timelapseCameras,
  timelapseCategories,
  timelapseLightings,
  timelapseSpeeds,
  timelapseStyles,
  timelapseTransformations,
} from '../constants';
import type { TimelapseFormData, TimelapseScene } from '../types';

type TimelapseOption = { key: string; label: string };
type TimelapseSpeedOption = { key: number; label: string };

interface TimelapseFormProps {
  data: TimelapseFormData;
  onChange: (data: TimelapseFormData) => void;
}

export function TimelapseForm({ data, onChange }: TimelapseFormProps) {
  const handleChange = (
    key: keyof TimelapseFormData,
    value: TimelapseFormData[keyof TimelapseFormData],
  ) => {
    onChange({ ...data, [key]: value });
  };

  const remainingSeconds =
    data.mode === 'storyboard'
      ? data.totalDurationSeconds -
        data.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0)
      : 0;

  const addScene = () => {
    if (data.scenes.length >= 8) return;
    const defaultDuration = Math.min(5, remainingSeconds || 5);
    handleChange('scenes', [...data.scenes, { description: '', durationSeconds: defaultDuration }]);
  };

  const removeScene = (index: number) => {
    handleChange(
      'scenes',
      data.scenes.filter((_, i) => i !== index),
    );
  };

  const updateScene = (
    index: number,
    field: 'description' | 'durationSeconds',
    value: string | number,
  ) => {
    handleChange(
      'scenes',
      data.scenes.map((scene, i) => (i === index ? { ...scene, [field]: value } : scene)),
    );
  };

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl shadow-primary/5">
      <CardBody className="p-8 space-y-10">
        <TargetModelSelector
          promptType="TIMELAPSE"
          value={data.targetModel}
          onChange={(v) => handleChange('targetModel', v)}
        />

        {/* Section: Configuration */}
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
                Configuration
              </h3>
            </div>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[9px] tracking-widest px-3 py-1"
            >
              Sora AI Optimized
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Kategori Timelapse
              </div>
              <Select value={data.category} onValueChange={(v) => handleChange('category', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {timelapseCategories.map((c: TimelapseOption) => (
                    <SelectItem
                      key={c.key}
                      value={c.key}
                      className="font-bold text-xs uppercase tracking-widest py-3"
                    >
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Subjek Utama
              </div>
              <Input
                placeholder="Misal: Mekarnya Bunga Mawar"
                value={data.subject}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange('subject', e.target.value)
                }
                className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-6 text-sm focus:bg-muted/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Tipe Transformasi
            </div>
            <Select
              value={data.transformation}
              onValueChange={(v) => handleChange('transformation', v)}
            >
              <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                <SelectValue placeholder="Pilih Transformasi" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50">
                {timelapseTransformations.map((t: TimelapseOption) => (
                  <SelectItem
                    key={t.key}
                    value={t.key}
                    className="font-bold text-xs uppercase tracking-widest py-3"
                  >
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Divider className="opacity-30" />

        {/* Section: Logic & Duration */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Logic & Duration
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Mode Produksi
              </div>
              <Select
                value={data.mode}
                onValueChange={(v) => {
                  const mode = v as 'single' | 'storyboard';
                  onChange({
                    ...data,
                    mode,
                    totalDurationSeconds: mode === 'single' ? 15 : 25,
                    scenes: [],
                  });
                }}
              >
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  <SelectItem value="single" className="font-bold text-xs uppercase py-3">
                    Single Video (15s)
                  </SelectItem>
                  <SelectItem value="storyboard" className="font-bold text-xs uppercase py-3">
                    Storyboard (25s)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Total Durasi (Detik)
              </div>
              <Select
                value={String(data.totalDurationSeconds)}
                onValueChange={(v) => {
                  onChange({
                    ...data,
                    totalDurationSeconds: Number(v),
                    scenes: [],
                  });
                }}
              >
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {(data.mode === 'single' ? [5, 10, 15] : [15, 20, 25]).map((d) => (
                    <SelectItem
                      key={d}
                      value={String(d)}
                      className="font-bold text-xs uppercase py-3"
                    >
                      {d} Detik
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {data.mode === 'storyboard' && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders size={14} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">
                    Flow Adegan
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge
                    variant={remainingSeconds <= 0 ? 'default' : 'outline'}
                    className="h-6 rounded-full font-black text-[9px] px-3"
                  >
                    {remainingSeconds}S Tersisa
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={addScene}
                    disabled={data.scenes.length >= 8 || remainingSeconds <= 0}
                    className="h-8 rounded-full border border-primary/20 text-primary font-black uppercase text-[9px] px-4"
                  >
                    <Plus size={12} className="mr-2" /> Tambah
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {data.scenes.map((scene: TimelapseScene, index: number) => (
                  <div
                    key={`${scene.description}-${scene.durationSeconds}`}
                    className="group relative bg-muted/10 rounded-3xl p-5 border border-border/50 transition-all hover:bg-muted/20"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[1fr,100px,40px] gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary border border-primary/20">
                            {index + 1}
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            Deskripsi Scene
                          </span>
                        </div>
                        <Input
                          placeholder="Jelaskan apa yang terjadi..."
                          value={scene.description}
                          onChange={(e) => updateScene(index, 'description', e.target.value)}
                          className="h-10 bg-background/50 border-border/30 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1 ml-1">
                          Durasi
                        </span>
                        <Select
                          value={String(scene.durationSeconds)}
                          onValueChange={(v) => updateScene(index, 'durationSeconds', Number(v))}
                        >
                          <SelectTrigger className="h-10 bg-background/50 border-border/30 rounded-xl text-xs font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                              <SelectItem
                                key={s}
                                value={String(s)}
                                className="text-[10px] font-bold uppercase"
                              >
                                {s}S
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end justify-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeScene(index)}
                          className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Divider className="opacity-30" />

        {/* Section: Visual Styling */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-rose-600 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Visual Styling
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Speed Multiplier
              </div>
              <Select
                value={String(data.speedMultiplier)}
                onValueChange={(v) => handleChange('speedMultiplier', Number(v))}
              >
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {timelapseSpeeds.map((s: TimelapseSpeedOption) => (
                    <SelectItem
                      key={s.key}
                      value={String(s.key)}
                      className="font-bold text-xs uppercase py-3"
                    >
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Style Animasi
              </div>
              <Select value={data.style} onValueChange={(v) => handleChange('style', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {timelapseStyles.map((s: TimelapseOption) => (
                    <SelectItem
                      key={s.key}
                      value={s.key}
                      className="font-bold text-xs uppercase py-3"
                    >
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Sudut Kamera
              </div>
              <Select value={data.camera} onValueChange={(v) => handleChange('camera', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {timelapseCameras.map((c: TimelapseOption) => (
                    <SelectItem
                      key={c.key}
                      value={c.key}
                      className="font-bold text-xs uppercase py-3"
                    >
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Aspect Ratio
              </div>
              <Select
                value={data.aspectRatio}
                onValueChange={(v) => handleChange('aspectRatio', v)}
              >
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {aspectRatios.map((a: TimelapseOption) => (
                    <SelectItem
                      key={a.key}
                      value={a.key}
                      className="font-bold text-xs uppercase py-3"
                    >
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Pencahayaan
              </div>
              <Select value={data.lighting} onValueChange={(v) => handleChange('lighting', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {timelapseLightings.map((l: TimelapseOption) => (
                    <SelectItem
                      key={l.key}
                      value={l.key}
                      className="font-bold text-xs uppercase py-3"
                    >
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Detail Tambahan (opsional)
            </div>
            <Textarea
              placeholder="Informasi tambahan untuk memperkaya hasil..."
              value={data.additionalDetails}
              onChange={(e) => handleChange('additionalDetails', e.target.value)}
              className="min-h-[140px] rounded-3xl bg-muted/10 border-border/50 font-bold p-6 focus:bg-muted/20 transition-all leading-relaxed"
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
