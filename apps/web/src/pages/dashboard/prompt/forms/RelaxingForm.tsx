import {
  Card,
  CardBody,
  Divider,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui';
import { SelectionGrid } from '@/components/ui/SelectionGrid';
import { cn } from '@/lib/utils';
import {
  environments,
  primarySounds,
  relaxingBpms,
  relaxingDurations,
  relaxingMoods,
  secondarySounds,
  visualStyles,
} from '../constants';
import type { RelaxingFormData } from '../types';

const intensityOptions = [
  { key: 'subtle', label: 'Subtle / Lembut' },
  { key: 'moderate', label: 'Moderate / Sedang' },
  { key: 'immersive', label: 'Immersive / Mendalam' },
];

interface RelaxingFormProps {
  data: RelaxingFormData;
  onChange: (data: RelaxingFormData) => void;
  errors?: Record<string, boolean>;
}

export function RelaxingForm({ data, onChange, errors }: RelaxingFormProps) {
  const handleChange = (
    key: keyof RelaxingFormData,
    value: RelaxingFormData[keyof RelaxingFormData],
  ) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl shadow-primary/5">
      <CardBody className="p-8 space-y-10">
        {/* Section: Audio Environment */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Audio Environment
            </h3>
          </div>

          <div className="space-y-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Lingkungan (Environment)
            </div>
            <Select value={data.environment} onValueChange={(v) => handleChange('environment', v)}>
              <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50">
                {environments.map((e) => (
                  <SelectItem
                    key={e.key}
                    value={e.key}
                    className="font-bold text-xs uppercase tracking-widest py-3"
                  >
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {data.environment === 'custom' && (
            <div className="space-y-3 pt-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Nama Lingkungan Kustom <span className="text-rose-500 font-black">*</span>
              </div>
              <Input
                placeholder="Contoh: Perpustakaan tua saat badai salju"
                value={data.customEnvironment}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange('customEnvironment', e.target.value)
                }
                className={cn(
                  'h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-6 text-sm focus:bg-muted/20 transition-all',
                  errors?.customEnvironment && 'border-rose-500/80 focus:border-rose-500',
                )}
              />
              {errors?.customEnvironment && (
                <div className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  * Kolom ini wajib diisi
                </div>
              )}
            </div>
          )}

          <SelectionGrid
            label="Suara Utama (Primary)"
            options={primarySounds}
            value={data.primarySound}
            onChange={(v) => handleChange('primarySound', v)}
            columns={4}
            required
            error={errors?.primarySound}
          />

          <SelectionGrid
            label="Suara Sekunder (Background)"
            options={secondarySounds}
            value={data.secondarySounds}
            onChange={(v) => handleChange('secondarySounds', v)}
            columns={4}
          />
        </div>

        <Divider className="opacity-30" />

        {/* Section: Format & Mood */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Format & Mood
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Durasi Relaxing
              </div>
              <Select value={data.duration} onValueChange={(v) => handleChange('duration', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {relaxingDurations.map((d) => (
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

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Mood & Suasana
              </div>
              <Select value={data.mood} onValueChange={(v) => handleChange('mood', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {relaxingMoods.map((m) => (
                    <SelectItem
                      key={m.key}
                      value={m.key}
                      className="font-bold text-xs uppercase tracking-widest py-3"
                    >
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SelectionGrid
            label="Visual Style (untuk video)"
            options={visualStyles}
            value={data.visualStyle}
            onChange={(v) => handleChange('visualStyle', v)}
            columns={3}
          />

          <SelectionGrid
            label="Intensitas Suara (Intensity)"
            options={intensityOptions}
            value={data.intensity}
            onChange={(v) => handleChange('intensity', v)}
            columns={3}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Tempo (BPM)
              </div>
              <Select value={data.bpm} onValueChange={(v) => handleChange('bpm', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue placeholder="Pilih Tempo" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {relaxingBpms.map((b) => (
                    <SelectItem
                      key={b.key}
                      value={b.key}
                      className="font-bold text-xs uppercase tracking-widest py-3"
                    >
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Instrumen Pendukung (opsional)
              </div>
              <Input
                placeholder="Contoh: Piano Akustik, Gitar Klasik, Synth Pad..."
                value={data.instrumentation}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange('instrumentation', e.target.value)
                }
                className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-6 focus:bg-muted/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-muted/10 border border-border/50 rounded-2xl p-5">
            <div className="space-y-1 flex-1 pr-4">
              <div className="text-[11px] font-black uppercase tracking-wider text-foreground">
                Seamless Loop
              </div>
              <div className="text-[10px] font-medium text-muted-foreground">
                Pastikan audio dapat di-loop terus-menerus tanpa jeda terputus.
              </div>
            </div>
            <Switch
              checked={data.loopSeamless}
              onCheckedChange={(v) => handleChange('loopSeamless', v)}
            />
          </div>

          <div className="space-y-3 pt-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Detail Ambient (pisahkan dengan koma)
            </div>
            <Input
              placeholder="Contoh: suara burung, angin sepoi-sepoi, bel sekolah"
              value={data.ambientDetails}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange('ambientDetails', e.target.value)
              }
              className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-6 focus:bg-muted/20 transition-all"
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
