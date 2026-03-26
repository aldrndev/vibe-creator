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
import { TargetModelSelector } from '../components/TargetModelSelector';
import {
  aspectRatios,
  cameraMovements,
  lightingOptions,
  moodOptions,
  videoDurations,
  videoStyles,
} from '../constants';
import type { VideoGenFormData } from '../types';

interface VideoGenFormProps {
  data: VideoGenFormData;
  onChange: (data: VideoGenFormData) => void;
}

export function VideoGenForm({ data, onChange }: VideoGenFormProps) {
  const handleChange = (
    key: keyof VideoGenFormData,
    value: VideoGenFormData[keyof VideoGenFormData],
  ) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl shadow-primary/5">
      <CardBody className="p-8 space-y-10">
        <TargetModelSelector
          promptType="VIDEO_GEN"
          value={data.targetModel}
          onChange={(v) => handleChange('targetModel', v)}
        />

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
              Konsep Video
            </div>
            <Select value={data.concept} onValueChange={(v) => handleChange('concept', v)}>
              <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                <SelectValue placeholder="Pilih Konsep" />
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
            columns={3}
          />

          <SelectionGrid
            label="Pencahayaan (Lighting)"
            options={lightingOptions}
            value={data.lighting}
            onChange={(v) => handleChange('lighting', v)}
            columns={3}
          />

          <SelectionGrid
            label="Mood & Suasana"
            options={moodOptions}
            value={data.mood}
            onChange={(v) => handleChange('mood', v)}
            columns={3}
          />

          <div className="space-y-3 pt-4">
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
        </div>
      </CardBody>
    </Card>
  );
}
