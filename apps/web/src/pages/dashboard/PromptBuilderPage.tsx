import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Button, 
  Card, 
  CardBody, 
  Input, 
  Select, 
  SelectItem, 
  Textarea,
  Chip,
} from '@heroui/react';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Copy, Check, Mic, Video, Image, Music, Scan } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreatePrompt } from '@/hooks/use-prompts';
import type { PromptType } from '@vibe-creator/shared';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ScriptFormData {
  niche: string;
  platform: string;
  duration: string;
  tone: string;
  targetAudience: string;
  keywords: string;
  contentGoal: string;
  callToAction: string;
  narrativeStyle: string;
  emotionalJourney: string;
  keyMessage: string;
  additionalContext: string;
}

interface VoiceFormData {
  script: string;
  voiceStyle: string;
  language: string;
  gender: string;
  emotion: string;
  pace: string;
  emphasis: string;
  pauses: string;
}

interface VideoGenFormData {
  concept: string;
  style: string;
  aspectRatio: string;
  duration: string;
  camera: string;
  lighting: string;
  mood: string;
  additionalDetails: string;
}

interface ImageFormData {
  subject: string;
  style: string;
  aspectRatio: string;
  mood: string;
  colors: string;
  textOverlay: string;
  additionalDetails: string;
}

interface RelaxingFormData {
  environment: string;
  primarySound: string;
  secondarySounds: string;
  duration: string;
  mood: string;
  visualStyle: string;
}

interface CreativeScanFormData {
  sourceUrl: string;
  analysisType: string;
  niche: string;
  focusAreas: string;
}

// ============================================================================
// OPTIONS
// ============================================================================

const promptTypes = [
  { key: 'SCRIPT', label: 'Script / Ide', description: 'Generate script dan storytelling', icon: Sparkles },
  { key: 'VOICE', label: 'Voice / TTS', description: 'Generate prompt untuk voice-over', icon: Mic },
  { key: 'VIDEO_GEN', label: 'Video Generation', description: 'Generate prompt untuk AI video', icon: Video },
  { key: 'IMAGE', label: 'Image / Thumbnail', description: 'Generate prompt untuk gambar', icon: Image },
  { key: 'RELAXING', label: 'Relaxing / Ambient', description: 'Generate prompt untuk audio ambient', icon: Music },
  { key: 'CREATIVE_SCAN', label: 'Creative Scan', description: 'Analisis video kompetitor', icon: Scan },
];

const platforms = [
  { key: 'youtube', label: 'YouTube' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
];

const durations = [
  { key: '15s', label: '15 detik' },
  { key: '30s', label: '30 detik' },
  { key: '60s', label: '1 menit' },
  { key: '3min', label: '3 menit' },
  { key: '10min', label: '10 menit' },
  { key: '30min', label: '30 menit' },
];

const tones = [
  { key: 'casual', label: 'Casual' },
  { key: 'professional', label: 'Professional' },
  { key: 'humorous', label: 'Humorous' },
  { key: 'educational', label: 'Educational' },
  { key: 'inspirational', label: 'Inspirational' },
  { key: 'dramatic', label: 'Dramatic' },
];

const contentGoals = [
  { key: 'awareness', label: 'Brand Awareness' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'conversion', label: 'Conversion' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'education', label: 'Education' },
];

const narrativeStyles = [
  { key: 'linear', label: 'Linear (Cerita langsung)' },
  { key: 'hook-problem-solution', label: 'Hook → Problem → Solution' },
  { key: 'before-after', label: 'Before/After' },
  { key: 'story-arc', label: 'Story Arc (Setup → Climax → Resolution)' },
  { key: 'listicle', label: 'Listicle (Daftar poin)' },
];

// Voice options
const voiceStyles = [
  { key: 'narrator', label: 'Narrator' },
  { key: 'conversational', label: 'Conversational' },
  { key: 'energetic', label: 'Energetic' },
  { key: 'calm', label: 'Calm' },
  { key: 'authoritative', label: 'Authoritative' },
  { key: 'friendly', label: 'Friendly' },
];

const languages = [
  { key: 'id', label: 'Bahasa Indonesia' },
  { key: 'en', label: 'English' },
];

const genders = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'neutral', label: 'Neutral' },
];

const paces = [
  { key: 'slow', label: 'Lambat' },
  { key: 'normal', label: 'Normal' },
  { key: 'fast', label: 'Cepat' },
];

// Video Gen options
const videoStyles = [
  { key: 'realistic', label: 'Realistic' },
  { key: 'cinematic', label: 'Cinematic' },
  { key: 'anime', label: 'Anime' },
  { key: '3d', label: '3D Render' },
  { key: 'cartoon', label: 'Cartoon' },
  { key: 'vintage', label: 'Vintage' },
];

const aspectRatios = [
  { key: '16:9', label: '16:9 (Landscape)' },
  { key: '9:16', label: '9:16 (Portrait)' },
  { key: '1:1', label: '1:1 (Square)' },
  { key: '4:3', label: '4:3 (Standard)' },
];

const videoDurations = [
  { key: '5s', label: '5 detik' },
  { key: '10s', label: '10 detik' },
  { key: '15s', label: '15 detik' },
];

// Image options
const imageStyles = [
  { key: 'photorealistic', label: 'Photorealistic' },
  { key: 'digital-art', label: 'Digital Art' },
  { key: 'illustration', label: 'Illustration' },
  { key: 'minimalist', label: 'Minimalist' },
  { key: 'pop-art', label: 'Pop Art' },
  { key: 'watercolor', label: 'Watercolor' },
];

// Relaxing options
const environments = [
  { key: 'rain', label: 'Hujan' },
  { key: 'forest', label: 'Hutan' },
  { key: 'ocean', label: 'Pantai/Laut' },
  { key: 'fireplace', label: 'Perapian' },
  { key: 'cafe', label: 'Cafe' },
  { key: 'thunderstorm', label: 'Badai' },
  { key: 'city', label: 'Kota' },
  { key: 'custom', label: 'Custom' },
];

const relaxingDurations = [
  { key: '30min', label: '30 menit' },
  { key: '1hour', label: '1 jam' },
  { key: '3hours', label: '3 jam' },
  { key: '10hours', label: '10 jam' },
];

const relaxingMoods = [
  { key: 'peaceful', label: 'Damai' },
  { key: 'focus', label: 'Fokus' },
  { key: 'sleep', label: 'Tidur' },
  { key: 'meditation', label: 'Meditasi' },
];

// Creative Scan options
const analysisTypes = [
  { key: 'hook', label: 'Hook Analysis' },
  { key: 'structure', label: 'Content Structure' },
  { key: 'engagement', label: 'Engagement Patterns' },
  { key: 'full', label: 'Full Analysis' },
];

// ============================================================================
// DEFAULT FORM VALUES
// ============================================================================

const defaultScriptForm: ScriptFormData = {
  niche: '',
  platform: 'youtube',
  duration: '60s',
  tone: 'casual',
  targetAudience: '',
  keywords: '',
  contentGoal: 'engagement',
  callToAction: '',
  narrativeStyle: 'hook-problem-solution',
  emotionalJourney: '',
  keyMessage: '',
  additionalContext: '',
};

const defaultVoiceForm: VoiceFormData = {
  script: '',
  voiceStyle: 'conversational',
  language: 'id',
  gender: 'neutral',
  emotion: '',
  pace: 'normal',
  emphasis: '',
  pauses: '',
};

const defaultVideoGenForm: VideoGenFormData = {
  concept: '',
  style: 'cinematic',
  aspectRatio: '16:9',
  duration: '10s',
  camera: '',
  lighting: '',
  mood: '',
  additionalDetails: '',
};

const defaultImageForm: ImageFormData = {
  subject: '',
  style: 'photorealistic',
  aspectRatio: '16:9',
  mood: '',
  colors: '',
  textOverlay: '',
  additionalDetails: '',
};

const defaultRelaxingForm: RelaxingFormData = {
  environment: 'rain',
  primarySound: '',
  secondarySounds: '',
  duration: '1hour',
  mood: 'peaceful',
  visualStyle: '',
};

const defaultCreativeScanForm: CreativeScanFormData = {
  sourceUrl: '',
  analysisType: 'full',
  niche: '',
  focusAreas: '',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PromptBuilderPage() {
  const navigate = useNavigate();
  const createPrompt = useCreatePrompt();
  
  const [selectedType, setSelectedType] = useState<PromptType>('SCRIPT');
  const [title, setTitle] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Form states
  const [scriptForm, setScriptForm] = useState<ScriptFormData>(defaultScriptForm);
  const [voiceForm, setVoiceForm] = useState<VoiceFormData>(defaultVoiceForm);
  const [videoGenForm, setVideoGenForm] = useState<VideoGenFormData>(defaultVideoGenForm);
  const [imageForm, setImageForm] = useState<ImageFormData>(defaultImageForm);
  const [relaxingForm, setRelaxingForm] = useState<RelaxingFormData>(defaultRelaxingForm);
  const [creativeScanForm, setCreativeScanForm] = useState<CreativeScanFormData>(defaultCreativeScanForm);

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.error('Judul prompt diperlukan');
      return;
    }

    let inputData: Record<string, unknown> = {};

    switch (selectedType) {
      case 'SCRIPT':
        inputData = {
          type: 'SCRIPT',
          niche: scriptForm.niche,
          platform: scriptForm.platform,
          duration: scriptForm.duration,
          tone: scriptForm.tone,
          targetAudience: scriptForm.targetAudience,
          keywords: scriptForm.keywords.split(',').map((k) => k.trim()).filter(Boolean),
          contentGoal: scriptForm.contentGoal,
          callToAction: scriptForm.callToAction || undefined,
          narrativeStyle: scriptForm.narrativeStyle,
          emotionalJourney: scriptForm.emotionalJourney.split(',').map((e) => e.trim()).filter(Boolean),
          keyMessage: scriptForm.keyMessage,
          additionalContext: scriptForm.additionalContext || undefined,
        };
        break;

      case 'VOICE':
        inputData = {
          type: 'VOICE',
          script: voiceForm.script,
          voiceStyle: voiceForm.voiceStyle,
          language: voiceForm.language,
          gender: voiceForm.gender,
          emotion: voiceForm.emotion,
          pace: voiceForm.pace,
          emphasis: voiceForm.emphasis.split(',').map((e) => e.trim()).filter(Boolean),
          pauses: voiceForm.pauses,
        };
        break;

      case 'VIDEO_GEN':
        inputData = {
          type: 'VIDEO_GEN',
          concept: videoGenForm.concept,
          style: videoGenForm.style,
          aspectRatio: videoGenForm.aspectRatio,
          duration: videoGenForm.duration,
          camera: videoGenForm.camera,
          lighting: videoGenForm.lighting,
          mood: videoGenForm.mood,
          additionalDetails: videoGenForm.additionalDetails || undefined,
        };
        break;

      case 'IMAGE':
        inputData = {
          type: 'IMAGE',
          subject: imageForm.subject,
          style: imageForm.style,
          aspectRatio: imageForm.aspectRatio,
          mood: imageForm.mood,
          colors: imageForm.colors.split(',').map((c) => c.trim()).filter(Boolean),
          textOverlay: imageForm.textOverlay || undefined,
          additionalDetails: imageForm.additionalDetails || undefined,
        };
        break;

      case 'RELAXING':
        inputData = {
          type: 'RELAXING',
          environment: relaxingForm.environment,
          primarySound: relaxingForm.primarySound,
          secondarySounds: relaxingForm.secondarySounds.split(',').map((s) => s.trim()).filter(Boolean),
          duration: relaxingForm.duration,
          mood: relaxingForm.mood,
          visualStyle: relaxingForm.visualStyle || undefined,
        };
        break;

      case 'CREATIVE_SCAN':
        inputData = {
          type: 'CREATIVE_SCAN',
          sourceUrl: creativeScanForm.sourceUrl,
          analysisType: creativeScanForm.analysisType,
          niche: creativeScanForm.niche,
          focusAreas: creativeScanForm.focusAreas.split(',').map((f) => f.trim()).filter(Boolean),
        };
        break;
    }

    try {
      const result = await createPrompt.mutateAsync({
        type: selectedType,
        title,
        inputData,
      });
      
      setGeneratedPrompt(result.generatedPrompt);
      toast.success('Prompt berhasil di-generate!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal generate prompt');
    }
  };

  const handleCopy = async () => {
    if (generatedPrompt) {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      toast.success('Prompt disalin ke clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ============================================================================
  // RENDER FORMS
  // ============================================================================

  const renderScriptForm = () => (
    <Card>
      <CardBody className="p-4 space-y-4">
        <h3 className="font-medium">Detail Script</h3>
        
        <Input
          label="Niche / Topik"
          placeholder="Contoh: Tech Review, Kuliner, Travel"
          value={scriptForm.niche}
          onValueChange={(v) => setScriptForm((p) => ({ ...p, niche: v }))}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Platform"
            selectedKeys={[scriptForm.platform]}
            onChange={(e) => setScriptForm((p) => ({ ...p, platform: e.target.value }))}
          >
            {platforms.map((p) => <SelectItem key={p.key}>{p.label}</SelectItem>)}
          </Select>

          <Select
            label="Durasi"
            selectedKeys={[scriptForm.duration]}
            onChange={(e) => setScriptForm((p) => ({ ...p, duration: e.target.value }))}
          >
            {durations.map((d) => <SelectItem key={d.key}>{d.label}</SelectItem>)}
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Tone"
            selectedKeys={[scriptForm.tone]}
            onChange={(e) => setScriptForm((p) => ({ ...p, tone: e.target.value }))}
          >
            {tones.map((t) => <SelectItem key={t.key}>{t.label}</SelectItem>)}
          </Select>

          <Select
            label="Goal Konten"
            selectedKeys={[scriptForm.contentGoal]}
            onChange={(e) => setScriptForm((p) => ({ ...p, contentGoal: e.target.value }))}
          >
            {contentGoals.map((g) => <SelectItem key={g.key}>{g.label}</SelectItem>)}
          </Select>
        </div>

        <Input
          label="Target Audiens"
          placeholder="Contoh: Anak muda 18-25 tahun, pecinta teknologi"
          value={scriptForm.targetAudience}
          onValueChange={(v) => setScriptForm((p) => ({ ...p, targetAudience: v }))}
        />

        <Input
          label="Keywords (pisahkan dengan koma)"
          placeholder="Contoh: iPhone, Apple, smartphone, review"
          value={scriptForm.keywords}
          onValueChange={(v) => setScriptForm((p) => ({ ...p, keywords: v }))}
        />

        <Select
          label="Gaya Narasi"
          selectedKeys={[scriptForm.narrativeStyle]}
          onChange={(e) => setScriptForm((p) => ({ ...p, narrativeStyle: e.target.value }))}
        >
          {narrativeStyles.map((n) => <SelectItem key={n.key}>{n.label}</SelectItem>)}
        </Select>

        <Textarea
          label="Pesan Utama"
          placeholder="Apa pesan utama yang ingin disampaikan?"
          value={scriptForm.keyMessage}
          onValueChange={(v) => setScriptForm((p) => ({ ...p, keyMessage: v }))}
        />

        <Input
          label="Perjalanan Emosi (pisahkan dengan koma)"
          placeholder="Contoh: penasaran, terkejut, puas, termotivasi"
          value={scriptForm.emotionalJourney}
          onValueChange={(v) => setScriptForm((p) => ({ ...p, emotionalJourney: v }))}
        />

        <Input
          label="Call to Action (opsional)"
          placeholder="Contoh: Subscribe dan nyalakan notifikasi"
          value={scriptForm.callToAction}
          onValueChange={(v) => setScriptForm((p) => ({ ...p, callToAction: v }))}
        />

        <Textarea
          label="Konteks Tambahan (opsional)"
          placeholder="Informasi tambahan yang perlu diketahui..."
          value={scriptForm.additionalContext}
          onValueChange={(v) => setScriptForm((p) => ({ ...p, additionalContext: v }))}
        />
      </CardBody>
    </Card>
  );

  const renderVoiceForm = () => (
    <Card>
      <CardBody className="p-4 space-y-4">
        <h3 className="font-medium">Detail Voice/TTS</h3>
        
        <Textarea
          label="Script/Teks yang Dibacakan"
          placeholder="Masukkan script yang akan dijadikan voice-over..."
          minRows={4}
          value={voiceForm.script}
          onValueChange={(v) => setVoiceForm((p) => ({ ...p, script: v }))}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Gaya Suara"
            selectedKeys={[voiceForm.voiceStyle]}
            onChange={(e) => setVoiceForm((p) => ({ ...p, voiceStyle: e.target.value }))}
          >
            {voiceStyles.map((v) => <SelectItem key={v.key}>{v.label}</SelectItem>)}
          </Select>

          <Select
            label="Bahasa"
            selectedKeys={[voiceForm.language]}
            onChange={(e) => setVoiceForm((p) => ({ ...p, language: e.target.value }))}
          >
            {languages.map((l) => <SelectItem key={l.key}>{l.label}</SelectItem>)}
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Gender"
            selectedKeys={[voiceForm.gender]}
            onChange={(e) => setVoiceForm((p) => ({ ...p, gender: e.target.value }))}
          >
            {genders.map((g) => <SelectItem key={g.key}>{g.label}</SelectItem>)}
          </Select>

          <Select
            label="Kecepatan"
            selectedKeys={[voiceForm.pace]}
            onChange={(e) => setVoiceForm((p) => ({ ...p, pace: e.target.value }))}
          >
            {paces.map((p) => <SelectItem key={p.key}>{p.label}</SelectItem>)}
          </Select>
        </div>

        <Input
          label="Emosi"
          placeholder="Contoh: excited, calm, serious"
          value={voiceForm.emotion}
          onValueChange={(v) => setVoiceForm((p) => ({ ...p, emotion: v }))}
        />

        <Input
          label="Penekanan (pisahkan dengan koma)"
          placeholder="Kata-kata yang perlu ditekankan"
          value={voiceForm.emphasis}
          onValueChange={(v) => setVoiceForm((p) => ({ ...p, emphasis: v }))}
        />

        <Input
          label="Jeda/Pause"
          placeholder="Contoh: pause setelah pertanyaan, jeda dramatis"
          value={voiceForm.pauses}
          onValueChange={(v) => setVoiceForm((p) => ({ ...p, pauses: v }))}
        />
      </CardBody>
    </Card>
  );

  const renderVideoGenForm = () => (
    <Card>
      <CardBody className="p-4 space-y-4">
        <h3 className="font-medium">Detail Video Generation</h3>
        
        <Textarea
          label="Konsep Video"
          placeholder="Deskripsikan konsep video yang ingin dihasilkan..."
          minRows={3}
          value={videoGenForm.concept}
          onValueChange={(v) => setVideoGenForm((p) => ({ ...p, concept: v }))}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Style"
            selectedKeys={[videoGenForm.style]}
            onChange={(e) => setVideoGenForm((p) => ({ ...p, style: e.target.value }))}
          >
            {videoStyles.map((s) => <SelectItem key={s.key}>{s.label}</SelectItem>)}
          </Select>

          <Select
            label="Aspect Ratio"
            selectedKeys={[videoGenForm.aspectRatio]}
            onChange={(e) => setVideoGenForm((p) => ({ ...p, aspectRatio: e.target.value }))}
          >
            {aspectRatios.map((a) => <SelectItem key={a.key}>{a.label}</SelectItem>)}
          </Select>
        </div>

        <Select
          label="Durasi"
          selectedKeys={[videoGenForm.duration]}
          onChange={(e) => setVideoGenForm((p) => ({ ...p, duration: e.target.value }))}
        >
          {videoDurations.map((d) => <SelectItem key={d.key}>{d.label}</SelectItem>)}
        </Select>

        <Input
          label="Camera Movement"
          placeholder="Contoh: slow zoom in, pan left to right, static"
          value={videoGenForm.camera}
          onValueChange={(v) => setVideoGenForm((p) => ({ ...p, camera: v }))}
        />

        <Input
          label="Lighting"
          placeholder="Contoh: soft natural light, dramatic shadows, neon"
          value={videoGenForm.lighting}
          onValueChange={(v) => setVideoGenForm((p) => ({ ...p, lighting: v }))}
        />

        <Input
          label="Mood"
          placeholder="Contoh: epic, peaceful, mysterious"
          value={videoGenForm.mood}
          onValueChange={(v) => setVideoGenForm((p) => ({ ...p, mood: v }))}
        />

        <Textarea
          label="Detail Tambahan (opsional)"
          placeholder="Detail spesifik lainnya..."
          value={videoGenForm.additionalDetails}
          onValueChange={(v) => setVideoGenForm((p) => ({ ...p, additionalDetails: v }))}
        />
      </CardBody>
    </Card>
  );

  const renderImageForm = () => (
    <Card>
      <CardBody className="p-4 space-y-4">
        <h3 className="font-medium">Detail Image/Thumbnail</h3>
        
        <Textarea
          label="Subject/Objek"
          placeholder="Deskripsikan subjek utama gambar..."
          minRows={2}
          value={imageForm.subject}
          onValueChange={(v) => setImageForm((p) => ({ ...p, subject: v }))}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Style"
            selectedKeys={[imageForm.style]}
            onChange={(e) => setImageForm((p) => ({ ...p, style: e.target.value }))}
          >
            {imageStyles.map((s) => <SelectItem key={s.key}>{s.label}</SelectItem>)}
          </Select>

          <Select
            label="Aspect Ratio"
            selectedKeys={[imageForm.aspectRatio]}
            onChange={(e) => setImageForm((p) => ({ ...p, aspectRatio: e.target.value }))}
          >
            {aspectRatios.map((a) => <SelectItem key={a.key}>{a.label}</SelectItem>)}
          </Select>
        </div>

        <Input
          label="Mood/Suasana"
          placeholder="Contoh: vibrant, moody, minimal, bold"
          value={imageForm.mood}
          onValueChange={(v) => setImageForm((p) => ({ ...p, mood: v }))}
        />

        <Input
          label="Warna (pisahkan dengan koma)"
          placeholder="Contoh: blue, orange, warm tones"
          value={imageForm.colors}
          onValueChange={(v) => setImageForm((p) => ({ ...p, colors: v }))}
        />

        <Input
          label="Text Overlay (untuk thumbnail)"
          placeholder="Contoh: WOW!, 5 TIPS"
          value={imageForm.textOverlay}
          onValueChange={(v) => setImageForm((p) => ({ ...p, textOverlay: v }))}
        />

        <Textarea
          label="Detail Tambahan (opsional)"
          placeholder="Detail spesifik lainnya..."
          value={imageForm.additionalDetails}
          onValueChange={(v) => setImageForm((p) => ({ ...p, additionalDetails: v }))}
        />
      </CardBody>
    </Card>
  );

  const renderRelaxingForm = () => (
    <Card>
      <CardBody className="p-4 space-y-4">
        <h3 className="font-medium">Detail Relaxing/Ambient</h3>
        
        <Select
          label="Environment"
          selectedKeys={[relaxingForm.environment]}
          onChange={(e) => setRelaxingForm((p) => ({ ...p, environment: e.target.value }))}
        >
          {environments.map((e) => <SelectItem key={e.key}>{e.label}</SelectItem>)}
        </Select>

        <Input
          label="Suara Utama"
          placeholder="Contoh: rain drops, crackling fire"
          value={relaxingForm.primarySound}
          onValueChange={(v) => setRelaxingForm((p) => ({ ...p, primarySound: v }))}
        />

        <Input
          label="Suara Sekunder (pisahkan dengan koma)"
          placeholder="Contoh: distant thunder, birds chirping"
          value={relaxingForm.secondarySounds}
          onValueChange={(v) => setRelaxingForm((p) => ({ ...p, secondarySounds: v }))}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Durasi"
            selectedKeys={[relaxingForm.duration]}
            onChange={(e) => setRelaxingForm((p) => ({ ...p, duration: e.target.value }))}
          >
            {relaxingDurations.map((d) => <SelectItem key={d.key}>{d.label}</SelectItem>)}
          </Select>

          <Select
            label="Mood"
            selectedKeys={[relaxingForm.mood]}
            onChange={(e) => setRelaxingForm((p) => ({ ...p, mood: e.target.value }))}
          >
            {relaxingMoods.map((m) => <SelectItem key={m.key}>{m.label}</SelectItem>)}
          </Select>
        </div>

        <Input
          label="Visual Style (opsional, untuk video)"
          placeholder="Contoh: cozy cabin window, animated rain"
          value={relaxingForm.visualStyle}
          onValueChange={(v) => setRelaxingForm((p) => ({ ...p, visualStyle: v }))}
        />
      </CardBody>
    </Card>
  );

  const renderCreativeScanForm = () => (
    <Card>
      <CardBody className="p-4 space-y-4">
        <h3 className="font-medium">Detail Creative Scan</h3>
        <Chip color="secondary" variant="flat" size="sm">Analisis video kompetitor</Chip>
        
        <Input
          label="URL Video"
          placeholder="Masukkan URL YouTube/TikTok/Instagram"
          value={creativeScanForm.sourceUrl}
          onValueChange={(v) => setCreativeScanForm((p) => ({ ...p, sourceUrl: v }))}
        />

        <Select
          label="Tipe Analisis"
          selectedKeys={[creativeScanForm.analysisType]}
          onChange={(e) => setCreativeScanForm((p) => ({ ...p, analysisType: e.target.value }))}
        >
          {analysisTypes.map((a) => <SelectItem key={a.key}>{a.label}</SelectItem>)}
        </Select>

        <Input
          label="Niche"
          placeholder="Contoh: Gaming, Beauty, Finance"
          value={creativeScanForm.niche}
          onValueChange={(v) => setCreativeScanForm((p) => ({ ...p, niche: v }))}
        />

        <Input
          label="Fokus Analisis (pisahkan dengan koma)"
          placeholder="Contoh: hook, pacing, call to action"
          value={creativeScanForm.focusAreas}
          onValueChange={(v) => setCreativeScanForm((p) => ({ ...p, focusAreas: v }))}
        />
      </CardBody>
    </Card>
  );

  const renderCurrentForm = () => {
    switch (selectedType) {
      case 'SCRIPT': return renderScriptForm();
      case 'VOICE': return renderVoiceForm();
      case 'VIDEO_GEN': return renderVideoGenForm();
      case 'IMAGE': return renderImageForm();
      case 'RELAXING': return renderRelaxingForm();
      case 'CREATIVE_SCAN': return renderCreativeScanForm();
      default: return null;
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          isIconOnly
          variant="light"
          onPress={() => navigate('/dashboard/prompts')}
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Prompt Builder</h1>
          <p className="text-foreground/60">Buat prompt untuk konten kamu</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left - Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Prompt Type Selection */}
          <Card>
            <CardBody className="p-4 space-y-4">
              <h3 className="font-medium">Tipe Prompt</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {promptTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.key}
                      onClick={() => setSelectedType(type.key as PromptType)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedType === type.key
                          ? 'border-primary bg-primary/10'
                          : 'border-divider hover:border-primary/50'
                      }`}
                    >
                      <Icon size={18} className="mb-2 text-primary" />
                      <p className="font-medium text-sm">{type.label}</p>
                      <p className="text-xs text-foreground/60 mt-1">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Title */}
          <Card>
            <CardBody className="p-4">
              <Input
                label="Judul Prompt"
                placeholder="Contoh: Script Review iPhone 16"
                value={title}
                onValueChange={setTitle}
              />
            </CardBody>
          </Card>

          {/* Dynamic Form */}
          {renderCurrentForm()}

          {/* Generate Button */}
          <Button
            color="primary"
            size="lg"
            fullWidth
            startContent={<Sparkles size={20} />}
            onPress={handleGenerate}
            isLoading={createPrompt.isPending}
          >
            Generate Prompt
          </Button>
        </motion.div>

        {/* Right - Result */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:sticky lg:top-6 lg:self-start"
        >
          <Card className="h-[calc(100vh-12rem)] overflow-hidden">
            <CardBody className="p-0 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-divider">
                <h3 className="font-medium">Hasil Prompt</h3>
                {generatedPrompt && (
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={copied ? <Check size={16} /> : <Copy size={16} />}
                    onPress={handleCopy}
                  >
                    {copied ? 'Disalin!' : 'Salin'}
                  </Button>
                )}
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {generatedPrompt ? (
                  <pre className="whitespace-pre-wrap text-sm font-mono text-foreground/80">
                    {generatedPrompt}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-foreground/40">
                    <div className="text-center">
                      <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Hasil prompt akan muncul di sini</p>
                      <p className="text-sm mt-1">Isi form dan klik Generate</p>
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
