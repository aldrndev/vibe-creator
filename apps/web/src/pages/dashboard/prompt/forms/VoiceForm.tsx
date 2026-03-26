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
  emotions,
  emphasisOptions,
  genders,
  languages,
  paces,
  pauseOptions,
  voiceStyles,
} from '../constants';
import type { VoiceFormData } from '../types';

interface VoiceFormProps {
  data: VoiceFormData;
  onChange: (data: VoiceFormData) => void;
}

export function VoiceForm({ data, onChange }: VoiceFormProps) {
  const handleChange = (key: keyof VoiceFormData, value: VoiceFormData[keyof VoiceFormData]) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl shadow-primary/5">
      <CardBody className="p-8 space-y-10">
        <TargetModelSelector
          promptType="VOICE"
          value={data.targetModel}
          onChange={(v) => handleChange('targetModel', v)}
        />

        {/* Section: Script & Language */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Script & Language
            </h3>
          </div>

          <div className="space-y-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Script/Teks yang Dibacakan
            </div>
            <Textarea
              placeholder="Masukkan script yang akan dijadikan voice-over..."
              value={data.script}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleChange('script', e.target.value)
              }
              className="min-h-[140px] rounded-3xl bg-muted/10 border-border/50 font-bold p-6 focus:bg-muted/20 transition-all leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Bahasa
              </div>
              <Select value={data.language} onValueChange={(v) => handleChange('language', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {languages.map((l) => (
                    <SelectItem
                      key={l.key}
                      value={l.key}
                      className="font-bold text-xs uppercase tracking-widest py-3"
                    >
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Gender
              </div>
              <Select value={data.gender} onValueChange={(v) => handleChange('gender', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {genders.map((g) => (
                    <SelectItem
                      key={g.key}
                      value={g.key}
                      className="font-bold text-xs uppercase tracking-widest py-3"
                    >
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Divider className="opacity-30" />

        {/* Section: Voice Personality */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Voice Personality
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Gaya Suara (Voice Style)
              </div>
              <Select value={data.voiceStyle} onValueChange={(v) => handleChange('voiceStyle', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {voiceStyles.map((v) => (
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

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Kecepatan (Pace)
              </div>
              <Select value={data.pace} onValueChange={(v) => handleChange('pace', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {paces.map((p) => (
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
          </div>

          <SelectionGrid
            label="Emosi"
            options={emotions}
            value={data.emotion}
            onChange={(v) => handleChange('emotion', v)}
            columns={3}
          />

          <SelectionGrid
            label="Penekanan Kalimat"
            options={emphasisOptions}
            value={data.emphasis}
            onChange={(v) => handleChange('emphasis', v)}
            columns={3}
          />

          <SelectionGrid
            label="Jeda & Pause"
            options={pauseOptions}
            value={data.pauses}
            onChange={(v) => handleChange('pauses', v)}
            columns={3}
          />
        </div>
      </CardBody>
    </Card>
  );
}
