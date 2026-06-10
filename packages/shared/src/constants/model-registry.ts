import type { PromptType } from '../types/prompt';

export enum AIModel {
  // Video Models
  SORA = 'sora', // OpenAI Sora
  GEN3 = 'gen-3', // Runway Gen-3 Alpha
  VEO = 'veo', // Google Veo
  LUMA = 'luma', // Luma Dream Machine
  KLING = 'kling', // Kling AI
  MIDJOURNEY_VIDEO = 'midjourney_video', // Midjourney (Concept/Frame)
  PIKA = 'pika', // Pika Art

  // Image Models
  MIDJOURNEY = 'midjourney',
  DALLE3 = 'dalle-3',
  STABLE_DIFFUSION_XL = 'sdxl',
  FLUX = 'flux',

  // Voice/TTS Models
  ELEVENLABS = 'elevenlabs',
  OPENAI_TTS = 'openai-tts',

  // Script/Text Models
  GPT4 = 'gpt-4',
  CLAUDE_3_OPUS = 'claude-3-opus',
}

interface ModelConfig {
  id: AIModel;
  label: string;
  description: string;
  supports: PromptType[];
  // Potential for future validation rules (e.g. maxChars)
}

export const MODEL_REGISTRY: Record<AIModel, ModelConfig> = {
  // Video
  [AIModel.SORA]: {
    id: AIModel.SORA,
    label: 'OpenAI Sora',
    description: 'Terbaik untuk durasi panjang, fisika kompleks, dan penceritaan hiper-realistis.',
    supports: ['VIDEO_GEN', 'LOOP_SOURCE', 'TALKING_HEAD'],
  },
  [AIModel.GEN3]: {
    id: AIModel.GEN3,
    label: 'Runway',
    description: 'Sangat baik untuk bidikan sinematik realistis dan kontrol kamera presisi.',
    supports: ['VIDEO_GEN', 'TALKING_HEAD'],
  },
  [AIModel.VEO]: {
    id: AIModel.VEO,
    label: 'Google Veo',
    description: 'Generasi 1080p+ definisi tinggi dengan pemahaman mendalam istilah sinematik.',
    supports: ['VIDEO_GEN', 'LOOP_SOURCE'],
  },
  [AIModel.LUMA]: {
    id: AIModel.LUMA,
    label: 'Luma Dream Machine',
    description: 'Generasi cepat dengan konsistensi gerakan yang baik.',
    supports: ['VIDEO_GEN'],
  },
  [AIModel.KLING]: {
    id: AIModel.KLING,
    label: 'Kling AI',
    description: 'Model canggih dari China, gerakan biologis yang luar biasa.',
    supports: ['VIDEO_GEN'],
  },
  [AIModel.PIKA]: {
    id: AIModel.PIKA,
    label: 'Pika Art',
    description: 'Bagus untuk gaya animasi dan memodifikasi video yang ada.',
    supports: ['VIDEO_GEN'],
  },
  [AIModel.MIDJOURNEY_VIDEO]: {
    // Used for "Image-First" approach in video prompts
    id: AIModel.MIDJOURNEY_VIDEO,
    label: 'Midjourney (Visual Only)',
    description: 'Dioptimalkan untuk menghasilkan "Frame Pertama" sempurna untuk image-to-video.',
    supports: ['VIDEO_GEN'],
  },

  // Image
  [AIModel.MIDJOURNEY]: {
    id: AIModel.MIDJOURNEY,
    label: 'Midjourney',
    description: 'Gaya artistik tingkat atas, terbaik untuk visual kreatif.',
    supports: ['IMAGE', 'RELAXING'], // Relaxing often needs thumbnails
  },
  [AIModel.DALLE3]: {
    id: AIModel.DALLE3,
    label: 'DALL-E',
    description: 'Terbaik untuk mengikuti instruksi presisi dan rendering teks.',
    supports: ['IMAGE'],
  },
  [AIModel.STABLE_DIFFUSION_XL]: {
    id: AIModel.STABLE_DIFFUSION_XL,
    label: 'Stable Diffusion XL',
    description: 'Open source, dapat dikontrol via ControlNet (prompt dioptimalkan untuk SDXL).',
    supports: ['IMAGE'],
  },
  [AIModel.FLUX]: {
    id: AIModel.FLUX,
    label: 'Flux',
    description: 'Model terbuka canggih baru dengan realisme luar biasa.',
    supports: ['IMAGE'],
  },

  // Voice
  [AIModel.ELEVENLABS]: {
    id: AIModel.ELEVENLABS,
    label: 'ElevenLabs',
    description: 'Standar emas untuk kloning suara AI dan emosi.',
    supports: ['VOICE'],
  },
  [AIModel.OPENAI_TTS]: {
    id: AIModel.OPENAI_TTS,
    label: 'OpenAI TTS',
    description: 'Cepat, kualitas tinggi, tetapi kontrol emosi lebih sedikit.',
    supports: ['VOICE'],
  },

  // Script
  [AIModel.GPT4]: {
    id: AIModel.GPT4,
    label: 'OpenAI GPT',
    description: 'Terbaik untuk penalaran dan penulisan naskah kompleks.',
    supports: ['SCRIPT', 'CREATIVE_SCAN', 'SOCIAL_COPY'],
  },
  [AIModel.CLAUDE_3_OPUS]: {
    id: AIModel.CLAUDE_3_OPUS,
    label: 'Claude (Sonnet)',
    description: 'Gaya penulisan yang lebih alami dan mirip manusia.',
    supports: ['SCRIPT', 'CREATIVE_SCAN', 'SOCIAL_COPY'],
  },
};

export const DEFAULT_MODELS: Record<PromptType, AIModel> = {
  VIDEO_GEN: AIModel.SORA,
  IMAGE: AIModel.MIDJOURNEY,
  VOICE: AIModel.ELEVENLABS,
  SCRIPT: AIModel.GPT4,
  RELAXING: AIModel.MIDJOURNEY, // Defaults to visual asset prompt
  CREATIVE_SCAN: AIModel.GPT4,
  LOOP_SOURCE: AIModel.VEO,
  TALKING_HEAD: AIModel.SORA,
  SOCIAL_COPY: AIModel.GPT4,
};

export function getModelsForType(type: PromptType): ModelConfig[] {
  return Object.values(MODEL_REGISTRY).filter((model) => model.supports.includes(type));
}
