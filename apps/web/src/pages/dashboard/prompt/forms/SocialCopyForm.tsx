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
import { hookStyles, niches, tones } from '../constants';
import type { SocialCopyFormData } from '../types';

interface SocialCopyFormProps {
  data: SocialCopyFormData;
  onChange: (data: SocialCopyFormData) => void;
  errors?: Record<string, boolean>;
}

const platformOptions = [
  { key: 'instagram', label: 'Instagram Feed / Reels' },
  { key: 'tiktok', label: 'TikTok Caption' },
  { key: 'youtube_shorts', label: 'YouTube Shorts Description' },
  { key: 'twitter', label: 'Twitter / X Thread & Post' },
  { key: 'linkedin', label: 'LinkedIn Professional Post' },
  { key: 'facebook', label: 'Facebook Page Post' },
];

const hashtagDensityOptions = [
  { key: 'low', label: 'Low / 1-3 Hashtags Utama' },
  { key: 'medium', label: 'Medium / 5-8 Hashtags Relevan' },
  { key: 'high', label: 'High / Banyak Hashtags Pendukung' },
];

export function SocialCopyForm({ data, onChange, errors }: SocialCopyFormProps) {
  const handleChange = (
    key: keyof SocialCopyFormData,
    value: SocialCopyFormData[keyof SocialCopyFormData],
  ) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl shadow-primary/5">
      <CardBody className="p-8 space-y-10">
        {/* Section: Platform & Topic */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Platform & Topic
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Target Platform
              </div>
              <Select value={data.platform} onValueChange={(v) => handleChange('platform', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {platformOptions.map((p) => (
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
                Niche / Topik Konten <span className="text-rose-500 font-black">*</span>
              </div>
              <Select value={data.niche} onValueChange={(v) => handleChange('niche', v)}>
                <SelectTrigger
                  className={cn(
                    'h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm',
                    errors?.niche && 'border-rose-500/80 focus:border-rose-500',
                  )}
                >
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
              {errors?.niche && (
                <div className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  * Kolom ini wajib dipilih
                </div>
              )}
            </div>
          </div>
        </div>

        <Divider className="opacity-30" />

        {/* Section: Copywriting Parameters */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Style & Hook
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Tone of Voice / Suasana
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
                      className="font-bold text-xs uppercase tracking-widest py-3"
                    >
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Gaya Hook Pembuka
              </div>
              <Select value={data.hookType} onValueChange={(v) => handleChange('hookType', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-5 text-sm">
                  <SelectValue placeholder="Pilih Gaya Hook" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {hookStyles.map((h) => (
                    <SelectItem
                      key={h.key}
                      value={h.key}
                      className="font-bold text-xs uppercase tracking-widest py-3"
                    >
                      {h.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SelectionGrid
            label="Kerapatan Hashtag (Hashtag Density)"
            options={hashtagDensityOptions}
            value={data.hashtagDensity}
            onChange={(v) => handleChange('hashtagDensity', v)}
            columns={3}
          />

          <div className="space-y-6 pt-4">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Keywords Utama (pisahkan dengan koma)
              </div>
              <Input
                placeholder="Contoh: giveaway, tips bisnis, finansial, pemula"
                value={data.keywords}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange('keywords', e.target.value)
                }
                className="h-14 rounded-2xl bg-muted/10 border-border/50 font-bold px-6 text-sm focus:bg-muted/20 transition-all"
              />
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Konteks / Detail Penawaran / Poin Penting
              </div>
              <Textarea
                placeholder="Informasi promosi, diskon, deskripsi konten, atau poin-poin yang ingin disertakan..."
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
