import type { PromptType } from '@vibe-creator/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Copy, Sparkles, Terminal } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, Divider } from '@/components/ui';
import { cn } from '@/lib/utils';

interface PromptResultDisplayProps {
  generatedPrompt: string | null;
  type?: PromptType;
  onEdit?: () => void;
}

export interface AdviceDetail {
  models: { name: string; badge: string; color: string }[];
  params: { label: string; value: string }[];
  tips: string[];
}

export const ADVICE_BY_TYPE: Record<string, AdviceDetail> = {
  SCRIPT: {
    models: [
      {
        name: 'Claude',
        badge: 'Terbaik untuk Narasi',
        color: 'from-orange-500 to-amber-600',
      },
      {
        name: 'GPT',
        badge: 'Terbaik untuk Hook/Struktur',
        color: 'from-emerald-500 to-teal-600',
      },
      {
        name: 'Gemini',
        badge: 'Terbaik untuk Konteks Panjang',
        color: 'from-blue-500 to-indigo-600',
      },
    ],
    params: [
      { label: 'Temperature', value: '0.7 (Kreatif) / 0.3 (Struktur)' },
      { label: 'Top-P', value: '0.9' },
      { label: 'System Role', value: 'Content Creator / Scriptwriter' },
    ],
    tips: [
      'Gunakan Claude untuk menulis draf naskah yang lebih natural dan humanis.',
      'Gunakan GPT untuk memikirkan alternatif judul video dan Hook 3 detik pertama.',
      'Sertakan data riset kompetitor langsung di bagian Input Data.',
    ],
  },
  VOICE: {
    models: [
      {
        name: 'ElevenLabs',
        badge: 'Suara Paling Realistis',
        color: 'from-purple-500 to-indigo-600',
      },
      {
        name: 'OpenAI TTS',
        badge: 'Ekonomis & Cepat',
        color: 'from-emerald-500 to-teal-600',
      },
    ],
    params: [
      { label: 'Stability', value: '0.45 (Lebih Ekspresif)' },
      { label: 'Clarity / Similarity', value: '0.75 (Sangat Mirip)' },
      { label: 'Style Exaggeration', value: '0.10 (Alami)' },
    ],
    tips: [
      'Gunakan tanda baca (koma, titik, titik dua) secara presisi untuk jeda nafas alami.',
      'Jika menggunakan suara tokoh, tulis nama tokoh tersebut pada input Voice ID.',
      'Ekspor hasil suara dalam format MP3 192kbps untuk keseimbangan kualitas dan ukuran file.',
    ],
  },
  VIDEO_GEN: {
    models: [
      {
        name: 'Runway',
        badge: 'Kamera Sangat Halus',
        color: 'from-pink-500 to-rose-600',
      },
      { name: 'Kling', badge: 'Fisika & Gerak Nyata', color: 'from-red-500 to-orange-600' },
      { name: 'HunyuanVideo', badge: 'Open Source Kelas Atas', color: 'from-blue-600 to-sky-500' },
    ],
    params: [
      { label: 'Motion Strength', value: '5 - 7 (Direkomendasikan)' },
      { label: 'Upscale', value: 'Gunakan Ultra-HD jika tersedia' },
      { label: 'Frame Rate', value: '24 FPS / 30 FPS' },
    ],
    tips: [
      'Salin prompt visual yang dihasilkan langsung ke input video generator.',
      'Gunakan negative prompt untuk menghindari distorsi wajah atau teks berantakan.',
      'Gunakan model Kling jika memerlukan interaksi fisik yang realistis antar objek.',
    ],
  },
  IMAGE: {
    models: [
      {
        name: 'FLUX',
        badge: 'Fotorealisme & Teks Presisi',
        color: 'from-violet-500 to-purple-600',
      },
      {
        name: 'Midjourney',
        badge: 'Estetika & Gaya Artistik',
        color: 'from-indigo-500 to-blue-600',
      },
      { name: 'DALL-E', badge: 'Kepatuhan Prompt Tinggi', color: 'from-emerald-500 to-teal-600' },
    ],
    params: [
      { label: 'Aspect Ratio', value: 'Mengikuti pilihan konfigurasi' },
      { label: 'Stylize (MJ)', value: '--s 250 (Default) / --s 50 (Realis)' },
      { label: 'Quality', value: 'High Quality / Raw Mode' },
    ],
    tips: [
      'Gunakan perintah /imagine beserta hasil prompt jika menggunakan Midjourney Discord.',
      'Gunakan FLUX jika gambar memerlukan teks tertulis yang dieja dengan benar.',
      'DALL-E paling bagus digunakan melalui ChatGPT Plus untuk interaksi bahasa alami.',
    ],
  },
  RELAXING: {
    models: [
      {
        name: 'Suno',
        badge: 'Terbaik untuk Musik Latar',
        color: 'from-amber-500 to-orange-600',
      },
      {
        name: 'Udio',
        badge: 'Kualitas Audio Audiophile',
        color: 'from-purple-500 to-pink-600',
      },
      {
        name: 'ElevenLabs',
        badge: 'Efek Suara Ambient',
        color: 'from-indigo-500 to-purple-600',
      },
    ],
    params: [
      { label: 'Duration', value: '2 - 4 Menit' },
      { label: 'Looping', value: 'Gunakan Seamless Loop jika tersedia' },
      { label: 'Instrumental Only', value: 'True (Aktifkan)' },
    ],
    tips: [
      'Tentukan genre "Lofi Chill" atau "Ambient Pad" pada input generator suara.',
      'Gunakan track instrumental agar tidak bentrok dengan suara narator utama.',
      'Atur volume musik latar di level -18dB hingga -24dB saat editing video.',
    ],
  },
  CREATIVE_SCAN: {
    models: [
      {
        name: 'Claude',
        badge: 'Analisis Tren & Struktur',
        color: 'from-orange-500 to-amber-600',
      },
      {
        name: 'Gemini',
        badge: 'Ekstraksi Konten Panjang',
        color: 'from-blue-500 to-indigo-600',
      },
    ],
    params: [
      { label: 'Temperature', value: '0.2 (Analisis Lebih Presisi)' },
      { label: 'Max Output Tokens', value: '4096' },
      { label: 'Mode', value: 'Riset Kompetitor / Dekonstruksi' },
    ],
    tips: [
      'Tempelkan URL video viral atau artikel kompetitor langsung di kolom scan.',
      'Gunakan rekomendasi Hook yang dihasilkan untuk membuat versi video Anda sendiri.',
      'Amati pola visual 3 detik pertama yang terdekonstruksi di output prompt.',
    ],
  },
  TALKING_HEAD: {
    models: [
      {
        name: 'HeyGen',
        badge: 'Gerakan Bibir & Ekspresi Sempurna',
        color: 'from-teal-500 to-emerald-600',
      },
      { name: 'D-ID', badge: 'Cepat & Terintegrasi API', color: 'from-sky-500 to-blue-600' },
      {
        name: 'SadTalker',
        badge: 'Alternatif Open Source Gratis',
        color: 'from-slate-600 to-zinc-700',
      },
    ],
    params: [
      { label: 'Framing', value: 'Close-Up / Medium Shot' },
      { label: 'Voice Clone', value: 'Aktifkan jika memiliki sampel suara asli' },
      { label: 'Super Resolution', value: 'Aktifkan (Face Enhance)' },
    ],
    tips: [
      'Salin script dan deskripsi avatar yang dihasilkan ke HeyGen.',
      'Gunakan latar belakang kantor modern atau studio solid agar terlihat profesional.',
      'Pastikan deskripsi pakaian avatar kontras dengan warna latar belakang.',
    ],
  },
  SOCIAL_COPY: {
    models: [
      {
        name: 'Claude',
        badge: 'Copywriting Persuasif',
        color: 'from-orange-500 to-amber-600',
      },
      { name: 'GPT', badge: 'Bahasa Gaul & SEO Tren', color: 'from-emerald-500 to-teal-600' },
    ],
    params: [
      { label: 'Tone of Voice', value: 'Kasual / Persuasif / Informatif' },
      { label: 'Hashtag Limit', value: '3 - 5 Hashtag Relevan' },
      { label: 'Call to Action', value: 'Satu CTA yang jelas di akhir' },
    ],
    tips: [
      'Salin output teks ke aplikasi catatan sebelum di-post ke Instagram/TikTok.',
      'Gunakan emoji secara strategis untuk memecah teks yang panjang (maksimalkan keterbacaan).',
      'Lakukan pengujian hook alternatif yang dihasilkan untuk variasi konten.',
    ],
  },
};

export const DEFAULT_ADVICE: AdviceDetail = {
  models: [
    {
      name: 'Claude',
      badge: 'Terbaik untuk Penalaran',
      color: 'from-orange-500 to-amber-600',
    },
    { name: 'GPT', badge: 'Serbaguna & Cepat', color: 'from-emerald-500 to-teal-600' },
  ],
  params: [
    { label: 'Temperature', value: '0.5' },
    { label: 'Top-P', value: '0.9' },
  ],
  tips: [
    'Salin prompt yang sesuai dan tempelkan ke chat interface AI pilihan Anda.',
    'Gunakan system prompt untuk memberikan instruksi kepribadian/role sebelum memberikan data input.',
  ],
};

export interface PromptTerminalViewProps {
  generatedPrompt: string;
}

export function PromptTerminalView({ generatedPrompt }: PromptTerminalViewProps) {
  const promptLines = generatedPrompt.split('\n').map((text, idx) => ({
    id: `line-${idx + 1}-${text.slice(0, 10)}`,
    text,
  }));

  return (
    <div className="relative border border-border/30 bg-card/30 rounded-3xl overflow-hidden shadow-inner flex flex-col flex-1 min-h-[450px]">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/20 bg-muted/5 select-none shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase ml-3">
            Prompt Editor View
          </span>
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500/80 bg-emerald-500/10 px-2 py-0.5 rounded-md">
          Preview
        </span>
      </div>

      {/* Editor Lines */}
      <div className="p-6 overflow-auto flex-1 select-all flex flex-col gap-1.5">
        {promptLines.map((lineObj, idx) => {
          const trimmed = lineObj.text.trim();
          let lineClass = 'text-foreground/90 font-sans font-normal text-[12px]';
          if (trimmed.startsWith('###') || trimmed.startsWith('***')) {
            lineClass = 'text-primary font-sans font-bold text-[12px]';
          } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            lineClass =
              'text-foreground/90 font-sans font-normal text-[12px] pl-2 border-l border-primary/20';
          } else if (trimmed.startsWith('```')) {
            lineClass = 'text-emerald-500/85 font-mono text-[12px] bg-muted/5 px-1 rounded-sm';
          }
          return (
            <div key={lineObj.id} className="flex items-start group leading-relaxed">
              {/* Line Number */}
              <div className="text-right text-muted-foreground/30 font-mono text-[11px] select-none pr-4 border-r border-border/10 min-w-[32px] shrink-0 pt-0.5">
                {idx + 1}
              </div>
              {/* Line Text */}
              <div className={cn('pl-4 flex-1 whitespace-pre-wrap', lineClass)}>
                {lineObj.text || '\u00A0'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PromptEmptyState() {
  return (
    <div className="text-center space-y-6">
      <div className="relative inline-flex">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-20" />
        <div className="relative w-24 h-24 rounded-4xl bg-muted/20 flex items-center justify-center border border-border/50">
          <Sparkles size={40} className="text-primary/40 animate-pulse" />
        </div>
      </div>
      <div>
        <h4 className="text-lg font-black uppercase tracking-tighter mb-2 text-foreground/80">
          Architecting Logic
        </h4>
        <p className="text-[11px] font-black uppercase tracking-widest opacity-60">
          Hasil rancangan prompt akan muncul di sini
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Divider className="w-8 opacity-20" />
          <span className="text-[9px] font-black tracking-[0.2em] opacity-30 font-sans">
            VIBE CREATOR
          </span>
          <Divider className="w-8 opacity-20" />
        </div>
      </div>
    </div>
  );
}

export interface AIModelAdvisorProps {
  advice: AdviceDetail;
}

export function AIModelAdvisor({ advice }: AIModelAdvisorProps) {
  return (
    <Card className="bg-card/40 border-border/50 rounded-3xl p-6 lg:p-8 space-y-6 h-full flex flex-col overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="space-y-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Sparkles className="text-orange-500 w-4 h-4" />
          </div>
          <h4 className="text-sm font-black uppercase tracking-wider text-foreground">
            AI Model Advisor
          </h4>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Rekomendasi Eksekusi Terbaik
        </p>
      </div>

      <Divider className="opacity-20" />

      {/* Model Badges */}
      <div className="space-y-3 relative z-10">
        <div className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">
          Model Terbaik
        </div>
        <div className="space-y-2">
          {advice.models.map((m) => (
            <div
              key={m.name}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/5 border border-border/10 hover:bg-muted/10 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className={cn('w-2 h-2 rounded-full bg-linear-to-r', m.color)} />
                <span className="text-xs font-bold text-foreground">{m.name}</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-md">
                {m.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Divider className="opacity-20" />

      {/* Parameter Recommendations */}
      <div className="space-y-3 relative z-10">
        <div className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">
          Parameter Optimal
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {advice.params.map((p) => (
            <div
              key={p.label}
              className="flex items-center justify-between p-3 rounded-xl bg-black/10 border border-border/5 border-dashed"
            >
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {p.label}
              </span>
              <span className="text-xs font-bold text-foreground/90">{p.value}</span>
            </div>
          ))}
        </div>
      </div>

      <Divider className="opacity-20" />

      {/* Execution Tips */}
      <div className="space-y-3 relative z-10">
        <div className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">
          Tips Eksekusi
        </div>
        <ul className="space-y-3">
          {advice.tips.map((t) => (
            <li
              key={t}
              className="flex items-start gap-2.5 text-xs text-muted-foreground font-medium leading-relaxed"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

interface PromptResultHeaderActionsProps {
  onEdit?: () => void;
  generatedPrompt: string | null;
  handleCopy: () => void;
  copied: boolean;
}

function PromptResultHeaderActions({
  onEdit,
  generatedPrompt,
  handleCopy,
  copied,
}: PromptResultHeaderActionsProps) {
  return (
    <div className="flex items-center gap-3 self-end sm:self-auto">
      {onEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-9 px-3.5 rounded-xl font-black uppercase tracking-widest text-[9px] border border-border/50 hover:bg-muted/10 hover:text-primary active:scale-95 transition-all flex items-center gap-1.5"
        >
          <ArrowLeft size={12} />
          <span>Edit</span>
        </Button>
      )}

      <AnimatePresence>
        {generatedPrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Button
              size="sm"
              onClick={handleCopy}
              className="h-9 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-linear-to-r from-primary via-orange-500 to-rose-600 text-white border-none shadow-lg shadow-primary/10 transition-all hover:brightness-110 active:scale-95 flex items-center gap-2"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Disalin!' : 'Salin Semua'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PromptResultDisplay({ generatedPrompt, type, onEdit }: PromptResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (generatedPrompt) {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const advice = type ? ADVICE_BY_TYPE[type] || DEFAULT_ADVICE : DEFAULT_ADVICE;

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* Left Side: Result Card */}
        <div className="lg:col-span-2 h-full flex flex-col">
          <Card className="h-full bg-card/75 backdrop-blur-2xl border-border/50 overflow-hidden flex flex-col group/result">
            {/* Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-b border-border/50 bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-primary/20 to-orange-500/20 flex items-center justify-center border border-primary/30">
                  <Terminal size={15} className="text-primary animate-pulse" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-[0.2em] bg-clip-text text-transparent bg-linear-to-r from-primary to-orange-500">
                  Hasil Prompt
                </h3>
              </div>

              <PromptResultHeaderActions
                onEdit={onEdit}
                generatedPrompt={generatedPrompt}
                handleCopy={handleCopy}
                copied={copied}
              />
            </div>

            {/* Content Body */}
            <div className="flex-1 p-6 flex flex-col min-h-[480px]">
              <AnimatePresence mode="wait">
                {generatedPrompt ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6 flex-1 flex flex-col"
                  >
                    <PromptTerminalView generatedPrompt={generatedPrompt} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex items-center justify-center text-muted-foreground min-h-[400px]"
                  >
                    <PromptEmptyState />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>

        {/* Right Side: AI Execution Advisor */}
        <div className="lg:col-span-1 h-full">
          <AIModelAdvisor advice={advice} />
        </div>
      </div>
    </div>
  );
}
