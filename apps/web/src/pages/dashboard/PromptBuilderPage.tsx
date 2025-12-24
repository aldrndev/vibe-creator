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
import { SelectionGrid } from '@/components/ui/SelectionGrid';
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

// === SCRIPT OPTIONS ===
const niches = [
  { key: 'gaming', label: 'Gaming' },
  { key: 'travel', label: 'Travel' },
  { key: 'tech', label: 'Technology' },
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'food', label: 'Food & Cooking' },
  { key: 'finance', label: 'Finance' },
  { key: 'education', label: 'Education' },
  { key: 'health', label: 'Health & Fitness' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'business', label: 'Business' },
  { key: 'music', label: 'Music' },
  { key: 'sports', label: 'Sports' },
  { key: 'automotive', label: 'Automotive' },
  { key: 'fashion', label: 'Fashion' },
  { key: 'parenting', label: 'Parenting' },
  { key: 'diy', label: 'DIY & Crafts' },
  { key: 'photography', label: 'Photography' },
  { key: 'pets', label: 'Pets & Animals' },
  { key: 'news', label: 'News & Current' },
];

const targetAudiences = [
  { key: 'gen-z', label: 'Gen Z (13-25)' },
  { key: 'millennials', label: 'Millennials (26-41)' },
  { key: 'gen-x', label: 'Gen X (42-57)' },
  { key: 'professionals', label: 'Professionals' },
  { key: 'parents', label: 'Parents' },
  { key: 'students', label: 'Students' },
  { key: 'entrepreneurs', label: 'Entrepreneurs' },
  { key: 'gamers', label: 'Gamers' },
  { key: 'creators', label: 'Creators' },
  { key: 'beginners', label: 'Beginners' },
  { key: 'experts', label: 'Experts' },
];

const callToActions = [
  { key: 'subscribe', label: 'Subscribe' },
  { key: 'like-share', label: 'Like & Share' },
  { key: 'comment', label: 'Comment' },
  { key: 'visit-link', label: 'Visit Link' },
  { key: 'buy-now', label: 'Buy Now' },
  { key: 'download', label: 'Download' },
  { key: 'sign-up', label: 'Sign Up' },
  { key: 'watch-more', label: 'Watch More' },
  { key: 'follow', label: 'Follow' },
  { key: 'try-free', label: 'Try Free' },
];

const keyMessages = [
  { key: 'save-money', label: 'Save Money' },
  { key: 'save-time', label: 'Save Time' },
  { key: 'learn-skill', label: 'Learn New Skill' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'inspiration', label: 'Inspiration' },
  { key: 'problem-solving', label: 'Problem Solving' },
  { key: 'life-hack', label: 'Life Hack' },
  { key: 'review', label: 'Review' },
  { key: 'tutorial', label: 'Tutorial' },
  { key: 'behind-scenes', label: 'Behind the Scenes' },
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

// === VOICE OPTIONS ===
const voiceStyles = [
  { key: 'narrator', label: 'Narrator' },
  { key: 'conversational', label: 'Conversational' },
  { key: 'energetic', label: 'Energetic' },
  { key: 'calm', label: 'Calm' },
  { key: 'authoritative', label: 'Authoritative' },
  { key: 'friendly', label: 'Friendly' },
  { key: 'dramatic', label: 'Dramatic' },
  { key: 'whisper', label: 'Whisper' },
  { key: 'excited', label: 'Excited' },
  { key: 'professional', label: 'Professional' },
];

const emotions = [
  { key: 'happy', label: 'Happy' },
  { key: 'sad', label: 'Sad' },
  { key: 'excited', label: 'Excited' },
  { key: 'calm', label: 'Calm' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'curious', label: 'Curious' },
  { key: 'confident', label: 'Confident' },
  { key: 'mysterious', label: 'Mysterious' },
  { key: 'playful', label: 'Playful' },
  { key: 'serious', label: 'Serious' },
];

const emphasisOptions = [
  { key: 'keywords', label: 'Keywords' },
  { key: 'statistics', label: 'Statistics' },
  { key: 'cta', label: 'CTA' },
  { key: 'questions', label: 'Questions' },
  { key: 'brand-names', label: 'Brand Names' },
  { key: 'benefits', label: 'Benefits' },
  { key: 'problems', label: 'Problems' },
];

const pauseOptions = [
  { key: 'minimal', label: 'Minimal' },
  { key: 'natural', label: 'Natural' },
  { key: 'dramatic', label: 'Dramatic' },
  { key: 'emphasis', label: 'For Emphasis' },
  { key: 'none', label: 'None' },
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

// === VIDEO GEN OPTIONS ===
const videoConcepts = [
  { key: 'product-showcase', label: 'Product Showcase' },
  { key: 'landscape', label: 'Landscape Scene' },
  { key: 'character', label: 'Character Animation' },
  { key: 'abstract', label: 'Abstract Art' },
  { key: 'tutorial', label: 'Tutorial Demo' },
  { key: 'lifestyle', label: 'Lifestyle Scene' },
  { key: 'action', label: 'Action Sequence' },
  { key: 'talking-head', label: 'Talking Head' },
  { key: 'text-animation', label: 'Text Animation' },
  { key: 'transition', label: 'Transition Effect' },
];

const videoStyles = [
  { key: 'realistic', label: 'Realistic' },
  { key: 'cinematic', label: 'Cinematic' },
  { key: 'anime', label: 'Anime' },
  { key: '3d', label: '3D Render' },
  { key: 'cartoon', label: 'Cartoon' },
  { key: 'vintage', label: 'Vintage' },
  { key: 'neon', label: 'Neon' },
  { key: 'minimalist', label: 'Minimalist' },
  { key: 'dreamy', label: 'Dreamy' },
  { key: 'cyberpunk', label: 'Cyberpunk' },
  { key: 'nature-doc', label: 'Nature Doc' },
  { key: 'vlog', label: 'Vlog Style' },
];

const cameraMovements = [
  { key: 'static', label: 'Static' },
  { key: 'pan-left', label: 'Pan Left' },
  { key: 'pan-right', label: 'Pan Right' },
  { key: 'zoom-in', label: 'Zoom In' },
  { key: 'zoom-out', label: 'Zoom Out' },
  { key: 'dolly', label: 'Dolly' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'aerial', label: 'Aerial' },
  { key: 'pov', label: 'POV' },
  { key: 'slow-motion', label: 'Slow Motion' },
];

const lightingOptions = [
  { key: 'natural', label: 'Natural' },
  { key: 'golden-hour', label: 'Golden Hour' },
  { key: 'studio', label: 'Studio' },
  { key: 'dramatic', label: 'Dramatic' },
  { key: 'neon', label: 'Neon' },
  { key: 'soft', label: 'Soft' },
  { key: 'hard-shadow', label: 'Hard Shadow' },
  { key: 'backlit', label: 'Backlit' },
  { key: 'moody', label: 'Moody' },
  { key: 'bright', label: 'Bright' },
];

const moodOptions = [
  { key: 'energetic', label: 'Energetic' },
  { key: 'calm', label: 'Calm' },
  { key: 'mysterious', label: 'Mysterious' },
  { key: 'happy', label: 'Happy' },
  { key: 'sad', label: 'Sad' },
  { key: 'intense', label: 'Intense' },
  { key: 'romantic', label: 'Romantic' },
  { key: 'futuristic', label: 'Futuristic' },
  { key: 'nostalgic', label: 'Nostalgic' },
  { key: 'epic', label: 'Epic' },
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

// === IMAGE OPTIONS ===
const imageSubjects = [
  { key: 'person', label: 'Person' },
  { key: 'product', label: 'Product' },
  { key: 'landscape', label: 'Landscape' },
  { key: 'food', label: 'Food' },
  { key: 'animal', label: 'Animal' },
  { key: 'abstract', label: 'Abstract' },
  { key: 'text-quote', label: 'Text/Quote' },
  { key: 'infographic', label: 'Infographic' },
  { key: 'before-after', label: 'Before/After' },
  { key: 'collage', label: 'Collage' },
];

const imageStyles = [
  { key: 'photorealistic', label: 'Photorealistic' },
  { key: 'digital-art', label: 'Digital Art' },
  { key: 'illustration', label: 'Illustration' },
  { key: 'minimalist', label: 'Minimalist' },
  { key: 'pop-art', label: 'Pop Art' },
  { key: 'watercolor', label: 'Watercolor' },
  { key: '3d-render', label: '3D Render' },
  { key: 'flat-design', label: 'Flat Design' },
  { key: 'vintage', label: 'Vintage' },
  { key: 'neon', label: 'Neon' },
  { key: 'gradient', label: 'Gradient' },
];

const colorOptions = [
  { key: 'vibrant', label: 'Vibrant' },
  { key: 'pastel', label: 'Pastel' },
  { key: 'monochrome', label: 'Monochrome' },
  { key: 'earth-tones', label: 'Earth Tones' },
  { key: 'neon', label: 'Neon' },
  { key: 'black-white', label: 'Black & White' },
  { key: 'brand-colors', label: 'Brand Colors' },
  { key: 'complementary', label: 'Complementary' },
  { key: 'gradient', label: 'Gradient' },
  { key: 'dark-mode', label: 'Dark Mode' },
];

const textOverlayOptions = [
  { key: 'title-only', label: 'Title Only' },
  { key: 'title-subtitle', label: 'Title + Subtitle' },
  { key: 'quote', label: 'Quote' },
  { key: 'statistics', label: 'Statistics' },
  { key: 'cta-button', label: 'CTA Button' },
  { key: 'no-text', label: 'No Text' },
  { key: 'logo-only', label: 'Logo Only' },
];

// === RELAXING OPTIONS ===
const environments = [
  { key: 'rain', label: 'Hujan' },
  { key: 'forest', label: 'Hutan' },
  { key: 'ocean', label: 'Pantai/Laut' },
  { key: 'fireplace', label: 'Perapian' },
  { key: 'cafe', label: 'Cafe' },
  { key: 'thunderstorm', label: 'Badai' },
  { key: 'city-night', label: 'Kota Malam' },
  { key: 'mountain', label: 'Pegunungan' },
  { key: 'river', label: 'Sungai' },
  { key: 'library', label: 'Perpustakaan' },
  { key: 'spa', label: 'Spa' },
  { key: 'garden', label: 'Taman' },
  { key: 'campfire', label: 'Api Unggun' },
  { key: 'snow', label: 'Salju' },
  { key: 'desert', label: 'Gurun' },
];

const primarySounds = [
  { key: 'rain-drops', label: 'Rain Drops' },
  { key: 'waves', label: 'Waves' },
  { key: 'fire-crackling', label: 'Fire Crackling' },
  { key: 'birds', label: 'Birds' },
  { key: 'wind', label: 'Wind' },
  { key: 'thunder', label: 'Thunder' },
  { key: 'water-stream', label: 'Water Stream' },
  { key: 'white-noise', label: 'White Noise' },
  { key: 'brown-noise', label: 'Brown Noise' },
  { key: 'piano', label: 'Piano' },
  { key: 'lofi', label: 'Lo-fi' },
];

const secondarySounds = [
  { key: 'birds', label: 'Birds' },
  { key: 'wind', label: 'Wind' },
  { key: 'distant-thunder', label: 'Distant Thunder' },
  { key: 'leaves', label: 'Leaves' },
  { key: 'clock-ticking', label: 'Clock Ticking' },
  { key: 'keyboard', label: 'Keyboard' },
  { key: 'coffee-shop', label: 'Coffee Shop Murmur' },
  { key: 'none', label: 'None' },
];

const relaxingMoods = [
  { key: 'peaceful', label: 'Peaceful' },
  { key: 'focus', label: 'Focus' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'meditation', label: 'Meditation' },
  { key: 'study', label: 'Study' },
  { key: 'work', label: 'Work' },
  { key: 'relaxation', label: 'Relaxation' },
  { key: 'energy', label: 'Energy' },
];

const visualStyles = [
  { key: 'static-image', label: 'Static Image' },
  { key: 'slow-motion', label: 'Slow Motion Video' },
  { key: 'animated-loop', label: 'Animated Loop' },
  { key: 'abstract-particles', label: 'Abstract Particles' },
  { key: 'nature-footage', label: 'Nature Footage' },
  { key: 'cozy-interior', label: 'Cozy Interior' },
];

const relaxingDurations = [
  { key: '30min', label: '30 menit' },
  { key: '1hour', label: '1 jam' },
  { key: '3hours', label: '3 jam' },
  { key: '10hours', label: '10 jam' },
];

// === CREATIVE SCAN OPTIONS ===
const analysisTypes = [
  { key: 'hook', label: 'Hook Analysis' },
  { key: 'structure', label: 'Content Structure' },
  { key: 'engagement', label: 'Engagement Patterns' },
  { key: 'full', label: 'Full Analysis' },
  { key: 'viral', label: 'Viral Elements' },
  { key: 'storytelling', label: 'Storytelling Technique' },
];

const focusAreas = [
  { key: 'opening-hook', label: 'Opening Hook' },
  { key: 'pacing', label: 'Pacing' },
  { key: 'cta-placement', label: 'CTA Placement' },
  { key: 'visual-style', label: 'Visual Style' },
  { key: 'audio-music', label: 'Audio/Music' },
  { key: 'transitions', label: 'Transitions' },
  { key: 'text-overlays', label: 'Text Overlays' },
  { key: 'thumbnail', label: 'Thumbnail' },
  { key: 'retention-points', label: 'Retention Points' },
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
    let validationError = '';

    switch (selectedType) {
      case 'SCRIPT':
        if (!scriptForm.niche) validationError = 'Niche harus dipilih';
        else if (!scriptForm.targetAudience) validationError = 'Target Audiens harus dipilih';
        
        inputData = {
          type: 'SCRIPT',
          niche: scriptForm.niche,
          platform: scriptForm.platform,
          duration: scriptForm.duration,
          tone: scriptForm.tone,
          targetAudience: scriptForm.targetAudience,
          keywords: scriptForm.keywords ? scriptForm.keywords.split(',').map((k) => k.trim()).filter(Boolean) : [],
          contentGoal: scriptForm.contentGoal,
          callToAction: scriptForm.callToAction || undefined,
          narrativeStyle: scriptForm.narrativeStyle,
          emotionalJourney: [],
          keyMessage: scriptForm.keyMessage || undefined,
          additionalContext: scriptForm.additionalContext || undefined,
        };
        break;

      case 'VOICE':
        if (!voiceForm.script) validationError = 'Script harus diisi';
        
        inputData = {
          type: 'VOICE',
          script: voiceForm.script,
          voiceStyle: voiceForm.voiceStyle,
          language: voiceForm.language,
          gender: voiceForm.gender,
          emotion: voiceForm.emotion || undefined,
          pace: voiceForm.pace,
          emphasis: voiceForm.emphasis ? [voiceForm.emphasis] : [],
          pauses: voiceForm.pauses || undefined,
        };
        break;

      case 'VIDEO_GEN':
        if (!videoGenForm.concept) validationError = 'Konsep Video harus dipilih';
        
        inputData = {
          type: 'VIDEO_GEN',
          concept: videoGenForm.concept,
          style: videoGenForm.style,
          aspectRatio: videoGenForm.aspectRatio,
          duration: videoGenForm.duration,
          camera: videoGenForm.camera || undefined,
          lighting: videoGenForm.lighting || undefined,
          mood: videoGenForm.mood || undefined,
          additionalDetails: videoGenForm.additionalDetails || undefined,
        };
        break;

      case 'IMAGE':
        if (!imageForm.subject) validationError = 'Subject harus dipilih';
        
        inputData = {
          type: 'IMAGE',
          subject: imageForm.subject,
          style: imageForm.style,
          aspectRatio: imageForm.aspectRatio,
          mood: imageForm.mood || undefined,
          colors: imageForm.colors ? [imageForm.colors] : [],
          textOverlay: imageForm.textOverlay || undefined,
          additionalDetails: imageForm.additionalDetails || undefined,
        };
        break;

      case 'RELAXING':
        if (!relaxingForm.primarySound) validationError = 'Suara Utama harus dipilih';
        
        inputData = {
          type: 'RELAXING',
          environment: relaxingForm.environment,
          primarySound: relaxingForm.primarySound,
          secondarySounds: relaxingForm.secondarySounds ? [relaxingForm.secondarySounds] : [],
          duration: relaxingForm.duration,
          mood: relaxingForm.mood,
          visualStyle: relaxingForm.visualStyle || undefined,
        };
        break;

      case 'CREATIVE_SCAN':
        if (!creativeScanForm.sourceUrl) validationError = 'URL Video harus diisi';
        
        inputData = {
          type: 'CREATIVE_SCAN',
          sourceUrl: creativeScanForm.sourceUrl,
          analysisType: creativeScanForm.analysisType,
          niche: creativeScanForm.niche || undefined,
          focusAreas: creativeScanForm.focusAreas ? [creativeScanForm.focusAreas] : [],
        };
        break;
    }

    if (validationError) {
      toast.error(validationError);
      return;
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
      <CardBody className="p-4 space-y-6">
        <h3 className="font-medium">Detail Script</h3>
        
        <SelectionGrid
          label="Niche / Topik"
          options={niches}
          value={scriptForm.niche}
          onChange={(v) => setScriptForm((p) => ({ ...p, niche: v }))}
          columns={5}
        />

        <SelectionGrid
          label="Target Audiens"
          options={targetAudiences}
          value={scriptForm.targetAudience}
          onChange={(v) => setScriptForm((p) => ({ ...p, targetAudience: v }))}
          columns={4}
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

        <Select
          label="Gaya Narasi"
          selectedKeys={[scriptForm.narrativeStyle]}
          onChange={(e) => setScriptForm((p) => ({ ...p, narrativeStyle: e.target.value }))}
        >
          {narrativeStyles.map((n) => <SelectItem key={n.key}>{n.label}</SelectItem>)}
        </Select>

        <SelectionGrid
          label="Pesan Utama"
          options={keyMessages}
          value={scriptForm.keyMessage}
          onChange={(v) => setScriptForm((p) => ({ ...p, keyMessage: v }))}
          columns={5}
        />

        <SelectionGrid
          label="Call to Action"
          options={callToActions}
          value={scriptForm.callToAction}
          onChange={(v) => setScriptForm((p) => ({ ...p, callToAction: v }))}
          columns={5}
        />

        <Input
          label="Keywords (pisahkan dengan koma)"
          placeholder="Contoh: iPhone, Apple, smartphone, review"
          value={scriptForm.keywords}
          onValueChange={(v) => setScriptForm((p) => ({ ...p, keywords: v }))}
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
      <CardBody className="p-4 space-y-6">
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

        <SelectionGrid
          label="Emosi"
          options={emotions}
          value={voiceForm.emotion}
          onChange={(v) => setVoiceForm((p) => ({ ...p, emotion: v }))}
          columns={5}
        />

        <SelectionGrid
          label="Penekanan"
          options={emphasisOptions}
          value={voiceForm.emphasis}
          onChange={(v) => setVoiceForm((p) => ({ ...p, emphasis: v }))}
          columns={4}
        />

        <SelectionGrid
          label="Jeda/Pause"
          options={pauseOptions}
          value={voiceForm.pauses}
          onChange={(v) => setVoiceForm((p) => ({ ...p, pauses: v }))}
          columns={5}
        />
      </CardBody>
    </Card>
  );

  const renderVideoGenForm = () => (
    <Card>
      <CardBody className="p-4 space-y-6">
        <h3 className="font-medium">Detail Video Generation</h3>

        <SelectionGrid
          label="Konsep Video"
          options={videoConcepts}
          value={videoGenForm.concept}
          onChange={(v) => setVideoGenForm((p) => ({ ...p, concept: v }))}
          columns={5}
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

        <SelectionGrid
          label="Camera Movement"
          options={cameraMovements}
          value={videoGenForm.camera}
          onChange={(v) => setVideoGenForm((p) => ({ ...p, camera: v }))}
          columns={5}
        />

        <SelectionGrid
          label="Lighting"
          options={lightingOptions}
          value={videoGenForm.lighting}
          onChange={(v) => setVideoGenForm((p) => ({ ...p, lighting: v }))}
          columns={5}
        />

        <SelectionGrid
          label="Mood"
          options={moodOptions}
          value={videoGenForm.mood}
          onChange={(v) => setVideoGenForm((p) => ({ ...p, mood: v }))}
          columns={5}
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
      <CardBody className="p-4 space-y-6">
        <h3 className="font-medium">Detail Image/Thumbnail</h3>

        <SelectionGrid
          label="Subject/Objek"
          options={imageSubjects}
          value={imageForm.subject}
          onChange={(v) => setImageForm((p) => ({ ...p, subject: v }))}
          columns={5}
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

        <SelectionGrid
          label="Mood/Suasana"
          options={moodOptions}
          value={imageForm.mood}
          onChange={(v) => setImageForm((p) => ({ ...p, mood: v }))}
          columns={5}
        />

        <SelectionGrid
          label="Warna"
          options={colorOptions}
          value={imageForm.colors}
          onChange={(v) => setImageForm((p) => ({ ...p, colors: v }))}
          columns={5}
        />

        <SelectionGrid
          label="Text Overlay"
          options={textOverlayOptions}
          value={imageForm.textOverlay}
          onChange={(v) => setImageForm((p) => ({ ...p, textOverlay: v }))}
          columns={4}
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
      <CardBody className="p-4 space-y-6">
        <h3 className="font-medium">Detail Relaxing/Ambient</h3>
        
        <Select
          label="Environment"
          selectedKeys={[relaxingForm.environment]}
          onChange={(e) => setRelaxingForm((p) => ({ ...p, environment: e.target.value }))}
        >
          {environments.map((e) => <SelectItem key={e.key}>{e.label}</SelectItem>)}
        </Select>

        <SelectionGrid
          label="Suara Utama"
          options={primarySounds}
          value={relaxingForm.primarySound}
          onChange={(v) => setRelaxingForm((p) => ({ ...p, primarySound: v }))}
          columns={4}
        />

        <SelectionGrid
          label="Suara Sekunder"
          options={secondarySounds}
          value={relaxingForm.secondarySounds}
          onChange={(v) => setRelaxingForm((p) => ({ ...p, secondarySounds: v }))}
          columns={4}
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

        <SelectionGrid
          label="Visual Style (untuk video)"
          options={visualStyles}
          value={relaxingForm.visualStyle}
          onChange={(v) => setRelaxingForm((p) => ({ ...p, visualStyle: v }))}
          columns={3}
        />
      </CardBody>
    </Card>
  );

  const renderCreativeScanForm = () => (
    <Card>
      <CardBody className="p-4 space-y-6">
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

        <SelectionGrid
          label="Niche"
          options={niches}
          value={creativeScanForm.niche}
          onChange={(v) => setCreativeScanForm((p) => ({ ...p, niche: v }))}
          columns={5}
        />

        <SelectionGrid
          label="Fokus Analisis"
          options={focusAreas}
          value={creativeScanForm.focusAreas}
          onChange={(v) => setCreativeScanForm((p) => ({ ...p, focusAreas: v }))}
          columns={3}
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
