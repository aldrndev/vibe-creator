import {
  Badge,
  Card,
  CardBody,
  Divider,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { SelectionGrid } from '@/components/ui/SelectionGrid';
import { TargetModelSelector } from '../components/TargetModelSelector';
import { analysisTypes, focusAreas, niches } from '../constants';
import type { CreativeScanFormData } from '../types';

interface CreativeScanFormProps {
  data: CreativeScanFormData;
  onChange: (data: CreativeScanFormData) => void;
}

export function CreativeScanForm({ data, onChange }: CreativeScanFormProps) {
  const handleChange = (
    key: keyof CreativeScanFormData,
    value: CreativeScanFormData[keyof CreativeScanFormData],
  ) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl shadow-primary/5">
      <CardBody className="p-8 space-y-10">
        <TargetModelSelector
          promptType="CREATIVE_SCAN"
          value={data.targetModel}
          onChange={(v) => handleChange('targetModel', v)}
        />

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
                Source & Method
              </h3>
            </div>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[9px] tracking-widest px-3 py-1"
            >
              Analisis Kompetitor
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                URL Video / Source
              </div>
              <Input
                placeholder="Masukkan URL YouTube/TikTok/Instagram"
                value={data.sourceUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange('sourceUrl', e.target.value)
                }
                className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-6 text-sm focus:bg-muted/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Jenis Konten (Niche)
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
                  Tipe Analisis
                </div>
                <Select
                  value={data.analysisType}
                  onValueChange={(v) => handleChange('analysisType', v)}
                >
                  <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/50">
                    {analysisTypes.map((a) => (
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
        </div>

        <Divider className="opacity-30" />

        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Deep Focus
            </h3>
          </div>

          <SelectionGrid
            label="Fokus Analisis"
            options={focusAreas}
            value={data.focusAreas}
            onChange={(v) => handleChange('focusAreas', v)}
            columns={3}
          />
        </div>
      </CardBody>
    </Card>
  );
}
