import type * as React from 'react';
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
  Textarea,
} from '@/components/ui';
import { SelectionGrid } from '@/components/ui/SelectionGrid';
import { cn } from '@/lib/utils';
import type { TalkingHeadFormData } from '../types';

interface TalkingHeadFormProps {
  data: TalkingHeadFormData;
  onChange: (data: TalkingHeadFormData) => void;
  errors?: Record<string, boolean>;
}

const framingOptions = [
  { key: 'close-up', label: 'Close-Up / Wajah Dekat' },
  { key: 'medium-close-up', label: 'Medium Close-Up / Dada ke Atas' },
  { key: 'medium-shot', label: 'Medium Shot / Pinggang ke Atas' },
  { key: 'cinematic', label: 'Cinematic Shot / Sudut Sinematik' },
];

const backgroundOptions = [
  { key: 'office-modern', label: 'Office Modern / Kantor Modern' },
  { key: 'home-cozy', label: 'Cozy Home / Rumah Hangat' },
  { key: 'studio-solid', label: 'Studio Solid / Latar Studio Polos' },
  { key: 'cyberpunk-neon', label: 'Cyberpunk Neon / Ruang Neon' },
  { key: 'nature', label: 'Nature / Latar Pemandangan Alam' },
  { key: 'custom', label: 'Custom / Kustom' },
];

const voiceStyleOptions = [
  { key: 'conversational', label: 'Conversational / Percakapan Alami' },
  { key: 'professional', label: 'Professional / Formal & Profesional' },
  { key: 'energetic', label: 'Energetic / Penuh Energi' },
  { key: 'narrator', label: 'Narrator / Narator Berwibawa' },
  { key: 'calm', label: 'Calm / Tenang & Lembut' },
];

export function TalkingHeadForm({ data, onChange, errors }: TalkingHeadFormProps) {
  const handleChange = (
    key: keyof TalkingHeadFormData,
    value: TalkingHeadFormData[keyof TalkingHeadFormData],
  ) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl shadow-primary/5">
      <CardBody className="p-8 space-y-10">
        {/* Section: Presenter & Speech */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Presenter & Script
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Karakter / Persona Avatar <span className="text-rose-500 font-black">*</span>
              </div>
              <Input
                placeholder="Contoh: Pria profesional, setelan jas, awal 30an"
                value={data.avatar}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange('avatar', e.target.value)
                }
                className={cn(
                  'h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-6 text-sm focus:bg-muted/20 transition-all',
                  errors?.avatar && 'border-rose-500/80 focus:border-rose-500',
                )}
              />
              {errors?.avatar && (
                <div className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  * Kolom ini wajib diisi
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Gaya Suara (Voice Style)
              </div>
              <Select value={data.voiceStyle} onValueChange={(v) => handleChange('voiceStyle', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {voiceStyleOptions.map((v) => (
                    <SelectItem
                      key={v.key}
                      value={v.key}
                      className="font-bold text-xs uppercase tracking-widest py-3"
                    >
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Script / Teks Bicara Avatar <span className="text-rose-500 font-black">*</span>
              </div>
              <Textarea
                placeholder="Tulis naskah yang akan diucapkan oleh avatar secara lengkap di sini..."
                value={data.script}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleChange('script', e.target.value)
                }
                className={cn(
                  'min-h-[140px] rounded-3xl bg-muted/10 border-border/50 font-bold p-6 focus:bg-muted/20 transition-all leading-relaxed',
                  errors?.script && 'border-rose-500/80 focus:border-rose-500',
                )}
              />
              {errors?.script && (
                <div className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  * Kolom ini wajib diisi
                </div>
              )}
            </div>
          </div>
        </div>

        <Divider className="opacity-30" />

        {/* Section: Framing & Background */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Framing & Background
            </h3>
          </div>

          <SelectionGrid
            label="Framing Kamera (Framing Shot)"
            options={framingOptions}
            value={data.framing}
            onChange={(v) => handleChange('framing', v)}
            columns={4}
          />

          <SelectionGrid
            label="Latar Belakang (Background)"
            options={backgroundOptions}
            value={data.background}
            onChange={(v) => handleChange('background', v)}
            columns={3}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Voice ID / Referensi Suara (opsional)
              </div>
              <Input
                placeholder="Contoh: ElevenLabs ID, Rachel, Adam..."
                value={data.voiceId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange('voiceId', e.target.value)
                }
                className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-6 text-sm focus:bg-muted/20 transition-all"
              />
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Detail Tambahan (opsional)
              </div>
              <Input
                placeholder="Contoh: gerakan tangan natural, kedipan mata, dll"
                value={data.additionalDetails}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange('additionalDetails', e.target.value)
                }
                className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-6 text-sm focus:bg-muted/20 transition-all"
              />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
