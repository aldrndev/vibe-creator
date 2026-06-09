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
  cameraLenses,
  colorOptions,
  imagePurposes,
  imageStyles,
  imageSubjects,
  moodOptions,
  textOverlayOptions,
} from '../constants';
import type { ImageFormData } from '../types';

interface ImageFormProps {
  data: ImageFormData;
  onChange: (data: ImageFormData) => void;
  errors?: Record<string, boolean>;
}

export function ImageForm({ data, onChange, errors }: ImageFormProps) {
  const handleChange = (key: keyof ImageFormData, value: ImageFormData[keyof ImageFormData]) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card className="bg-card/60 border-border/50">
      <CardBody className="p-8 space-y-10">
        {/* Section: Objective */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Objective & Subject
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Tujuan Gambar
              </div>
              <Select value={data.purpose} onValueChange={(v) => handleChange('purpose', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue placeholder="Pilih Tujuan" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {imagePurposes.map((p) => (
                    <SelectItem
                      key={p.key}
                      value={p.key}
                      className="font-bold text-xs uppercase tracking-widest py-3"
                    >
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Subjek / Objek Utama <span className="text-rose-500 font-black">*</span>
              </div>
              <Select value={data.subject} onValueChange={(v) => handleChange('subject', v)}>
                <SelectTrigger
                  className={cn(
                    'h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm',
                    errors?.subject && 'border-rose-500/80 focus:border-rose-500',
                  )}
                >
                  <SelectValue placeholder="Pilih Subjek" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {imageSubjects.map((s) => (
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
              {errors?.subject && (
                <div className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  * Kolom ini wajib dipilih
                </div>
              )}
            </div>
          </div>
        </div>

        <Divider className="opacity-30" />

        {/* Section: Artistic Direction */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Artistic Direction
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Gaya Visual (Style)
              </div>
              <Select value={data.style} onValueChange={(v) => handleChange('style', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {imageStyles.map((s) => (
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
                Aspect Ratio
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

          <SelectionGrid
            label="Mood & Suasana"
            options={moodOptions}
            value={data.mood}
            onChange={(v) => handleChange('mood', v)}
            columns={5}
          />

          <SelectionGrid
            label="Skema Warna"
            options={colorOptions}
            value={data.colors}
            onChange={(v) => handleChange('colors', v)}
            columns={5}
          />

          <SelectionGrid
            label="Text Overlay"
            options={textOverlayOptions}
            value={data.textOverlay}
            onChange={(v) => handleChange('textOverlay', v)}
            columns={4}
          />

          <SelectionGrid
            label="Spesifikasi Kamera & Lensa (Gaya Foto)"
            options={cameraLenses}
            value={data.cameraLens}
            onChange={(v) => handleChange('cameraLens', v)}
            columns={5}
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
                placeholder="Hal-hal yang ingin dihindari (contoh: blur, deformed, low quality, extra limbs)..."
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
