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
import { TargetModelSelector } from '../components/TargetModelSelector';
import {
  callToActions,
  contentGoals,
  durations,
  keyMessages,
  narrativeStyles,
  niches,
  platforms,
  targetAudiences,
  tones,
} from '../constants';
import type { ScriptFormData } from '../types';

interface ScriptFormProps {
  data: ScriptFormData;
  onChange: (data: ScriptFormData) => void;
}

export function ScriptForm({ data, onChange }: ScriptFormProps) {
  const handleChange = (key: keyof ScriptFormData, value: ScriptFormData[keyof ScriptFormData]) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl shadow-primary/5">
      <CardBody className="p-8 space-y-10">
        <TargetModelSelector
          promptType="SCRIPT"
          value={data.targetModel}
          onChange={(v) => handleChange('targetModel', v)}
        />

        {/* Section: Core Identity */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Core Identity
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Niche / Topik
              </div>
              <Select value={data.niche} onValueChange={(v) => handleChange('niche', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue placeholder="Pilih Niche" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50 max-h-[300px]">
                  {niches.map((n) => (
                    <SelectItem
                      key={n.key}
                      value={n.key}
                      className="font-bold text-xs uppercase tracking-widest py-3"
                    >
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Target Audiens
              </div>
              <Select
                value={data.targetAudience}
                onValueChange={(v) => handleChange('targetAudience', v)}
              >
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue placeholder="Pilih Audiens" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50 max-h-[300px]">
                  {targetAudiences.map((a) => (
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
        </div>

        <Divider className="opacity-30" />

        {/* Section: Format & Delivery */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Format & Delivery
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Platform
              </div>
              <Select value={data.platform} onValueChange={(v) => handleChange('platform', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {platforms.map((p) => (
                    <SelectItem
                      key={p.key}
                      value={p.key}
                      className="font-bold text-xs uppercase tracking-widest"
                    >
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Durasi
              </div>
              <Select value={data.duration} onValueChange={(v) => handleChange('duration', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {durations.map((d) => (
                    <SelectItem
                      key={d.key}
                      value={d.key}
                      className="font-bold text-xs uppercase tracking-widest"
                    >
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Tone / Suasana
              </div>
              <Select value={data.tone} onValueChange={(v) => handleChange('tone', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {tones.map((t) => (
                    <SelectItem
                      key={t.key}
                      value={t.key}
                      className="font-bold text-xs uppercase tracking-widest"
                    >
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Goal Konten
              </div>
              <Select
                value={data.contentGoal}
                onValueChange={(v) => handleChange('contentGoal', v)}
              >
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {contentGoals.map((g) => (
                    <SelectItem
                      key={g.key}
                      value={g.key}
                      className="font-bold text-xs uppercase tracking-widest"
                    >
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Gaya Narasi
            </div>
            <Select
              value={data.narrativeStyle}
              onValueChange={(v) => handleChange('narrativeStyle', v)}
            >
              <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50">
                {narrativeStyles.map((n) => (
                  <SelectItem
                    key={n.key}
                    value={n.key}
                    className="font-bold text-xs uppercase tracking-widest"
                  >
                    {n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Divider className="opacity-30" />

        {/* Section: Strategy & Details */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-rose-600 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Strategy & Details
            </h3>
          </div>

          <SelectionGrid
            label="Pesan Utama"
            options={keyMessages}
            value={data.keyMessage}
            onChange={(v) => handleChange('keyMessage', v)}
            columns={3}
          />

          <SelectionGrid
            label="Call to Action"
            options={callToActions}
            value={data.callToAction}
            onChange={(v) => handleChange('callToAction', v)}
            columns={3}
          />

          <div className="space-y-6 pt-4">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Keywords (pisahkan dengan koma)
              </div>
              <Input
                placeholder="Contoh: iPhone, Apple, smartphone, review"
                value={data.keywords}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange('keywords', e.target.value)
                }
                className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-6 focus:bg-muted/20 transition-all"
              />
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Emotional Journey (pisahkan dengan , atau -{'>'})
              </div>
              <Input
                placeholder="Contoh: Penasaran -> Terkejut -> Puas"
                value={data.emotionalJourney}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange('emotionalJourney', e.target.value)
                }
                className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-6 focus:bg-muted/20 transition-all"
              />
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Konteks Tambahan (opsional)
              </div>
              <Textarea
                placeholder="Informasi tambahan yang perlu diketahui..."
                value={data.additionalContext}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleChange('additionalContext', e.target.value)
                }
                className="min-h-[140px] rounded-3xl bg-muted/10 border-border/50 font-bold p-6 focus:bg-muted/20 transition-all leading-relaxed"
              />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
