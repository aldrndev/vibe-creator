import {
  Card,
  CardBody,
  Divider,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui';
import { SelectionGrid } from '@/components/ui/SelectionGrid';
import { cn } from '@/lib/utils';
import {
  aspectRatios,
  cameraMovements,
  fpsOptions,
  lightingOptions,
  moodOptions,
  motionStrengths,
  videoConcepts,
  videoDurations,
  videoStyles,
} from '../constants';
import type { VideoGenFormData } from '../types';

interface VideoGenFormProps {
  data: VideoGenFormData;
  onChange: (data: VideoGenFormData) => void;
  errors?: Record<string, boolean>;
}

export function VideoGenForm({ data, onChange, errors }: VideoGenFormProps) {
  const handleChange = (
    key: keyof VideoGenFormData,
    value: VideoGenFormData[keyof VideoGenFormData],
  ) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card className="bg-card/60 border-border/50">
      <CardBody className="p-8 space-y-10">
        {/* Section: Basic Config */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Basic Configuration
            </h3>
          </div>

          <div className="space-y-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Konsep Video <span className="text-rose-500 font-black">*</span>
            </div>
            <Select value={data.concept} onValueChange={(v) => handleChange('concept', v)}>
              <SelectTrigger
                className={cn(
                  'h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm',
                  errors?.concept && 'border-rose-500/80 focus:border-rose-500',
                )}
              >
                <SelectValue placeholder="Pilih Konsep" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50">
                {videoConcepts.map((s) => (
                  <SelectItem
                    key={s.key}
                    value={s.key}
                    className="font-bold text-xs uppercase tracking-widest py-3"
                  >
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors?.concept && (
              <div className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                * Kolom ini wajib dipilih
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Gaya Visual (Style)
              </div>
              <Select value={data.style} onValueChange={(v) => handleChange('style', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue placeholder="Pilih Style" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {videoStyles.map((s) => (
                    <SelectItem
                      key={s.key}
                      value={s.key}
                      className="font-bold text-xs uppercase tracking-widest py-3"
                    >
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Rasio Aspek (Aspect Ratio)
              </div>
              <Select
                value={data.aspectRatio}
                onValueChange={(v) => handleChange('aspectRatio', v)}
              >
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {aspectRatios.map((a) => (
                    <SelectItem
                      key={a.key}
                      value={a.key}
                      className="font-bold text-xs uppercase tracking-widest py-3"
                    >
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Durasi Video
            </div>
            <Select value={data.duration} onValueChange={(v) => handleChange('duration', v)}>
              <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50">
                {videoDurations.map((d) => (
                  <SelectItem
                    key={d.key}
                    value={d.key}
                    className="font-bold text-xs uppercase tracking-widest py-3"
                  >
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Divider className="opacity-30" />

        {/* Section: Cinematography */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Cinematography & Mood
            </h3>
          </div>

          <SelectionGrid
            label="Pergerakan Kamera (Camera Movement)"
            options={cameraMovements}
            value={data.movement}
            onChange={(v) => handleChange('movement', v)}
            columns={5}
          />

          <SelectionGrid
            label="Pencahayaan (Lighting)"
            options={lightingOptions}
            value={data.lighting}
            onChange={(v) => handleChange('lighting', v)}
            columns={5}
          />

          <SelectionGrid
            label="Mood & Suasana"
            options={moodOptions}
            value={data.mood}
            onChange={(v) => handleChange('mood', v)}
            columns={5}
          />

          <SelectionGrid
            label="Kekuatan Gerakan (Motion Strength)"
            options={motionStrengths}
            value={data.motionStrength}
            onChange={(v) => handleChange('motionStrength', v)}
            columns={4}
          />

          <SelectionGrid
            label="Frame Rate (FPS)"
            options={fpsOptions}
            value={data.fps}
            onChange={(v) => handleChange('fps', v)}
            columns={3}
          />

          <div className="space-y-6 pt-4">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Detail Tambahan (opsional)
              </div>
              <Textarea
                placeholder="Detail spesifik lainnya..."
                value={data.additionalDetails}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleChange('additionalDetails', e.target.value)
                }
                className="min-h-[140px] rounded-3xl bg-muted/10 border-border/50 font-bold p-6 focus:bg-muted/20 transition-all leading-relaxed"
              />
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Negative Prompt (opsional)
              </div>
              <Textarea
                placeholder="Hal-hal yang ingin dihindari (contoh: blur, teks distorsi, kecacatan tangan)..."
                value={data.negativePrompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleChange('negativePrompt', e.target.value)
                }
                className="min-h-[100px] rounded-3xl bg-muted/10 border-border/50 font-bold p-6 focus:bg-muted/20 transition-all leading-relaxed"
              />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
