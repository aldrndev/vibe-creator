export type PromptType =
  | 'SCRIPT'
  | 'VOICE'
  | 'VIDEO_GEN'
  | 'IMAGE'
  | 'RELAXING'
  | 'CREATIVE_SCAN'
  | 'LOOP_SOURCE'
  | 'TALKING_HEAD'
  | 'SOCIAL_COPY';

export interface Prompt {
  id: string;
  userId: string;
  type: PromptType;
  title: string;
  currentVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  inputData: PromptInputData;
  generatedPrompt: string;
  userNotes: string | null;
  createdAt: Date;
}

// Input data types for each prompt type
export type PromptInputData =
  | ScriptPromptInput
  | VoicePromptInput
  | VideoGenPromptInput
  | ImagePromptInput
  | RelaxingPromptInput
  | CreativeScanPromptInput
  | LoopSourcePromptInput
  | TalkingHeadPromptInput
  | SocialCopyPromptInput;

export interface ScriptPromptInput {
  type: 'SCRIPT';
  niche: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook';
  duration: '15s' | '30s' | '60s' | '3min' | '10min' | '30min';
  tone: 'casual' | 'professional' | 'humorous' | 'educational' | 'inspirational' | 'dramatic';
  targetAudience: string;
  keywords: string[];
  contentGoal: 'awareness' | 'engagement' | 'conversion' | 'entertainment' | 'education';
  callToAction?: string;
  additionalContext?: string;
  // Storytelling specifics
  narrativeStyle: 'linear' | 'hook-problem-solution' | 'before-after' | 'story-arc' | 'listicle';
  emotionalJourney: string[];
  keyMessage: string;
  language?: string;
  hookStyle?: string;
}

export interface VoicePromptInput {
  type: 'VOICE';
  script: string;
  voiceStyle: 'narrator' | 'conversational' | 'energetic' | 'calm' | 'dramatic' | 'friendly';
  language: 'id' | 'en';
  gender: 'male' | 'female' | 'neutral';
  emotion: string;
  pace: 'slow' | 'normal' | 'fast' | 'dynamic';
  emphasis: string[];
  pausePoints: string[];
  voiceId?: string;
}

export interface VideoGenPromptInput {
  type: 'VIDEO_GEN';
  concept: string;
  style: 'realistic' | 'anime' | 'cinematic' | '3d' | 'cartoon' | 'documentary' | 'abstract';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  duration: '5s' | '10s' | '15s' | '30s';
  camera: string;
  lighting: string;
  movement: string;
  mood: string;
  colorPalette: string[];
  additionalDetails?: string;
  motionStrength?: string;
  fps?: string;
  negativePrompt?: string;
}

export interface ImagePromptInput {
  type: 'IMAGE';
  subject: string;
  style: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '4:5';
  purpose: 'thumbnail' | 'cover' | 'post' | 'story' | 'banner';
  mood: string;
  colors: string[];
  textOverlay?: string;
  brand?: string;
  additionalDetails?: string;
  cameraLens?: string;
  negativePrompt?: string;
}

export interface RelaxingPromptInput {
  type: 'RELAXING';
  environment:
    | 'rain'
    | 'forest'
    | 'ocean'
    | 'fireplace'
    | 'cafe'
    | 'city'
    | 'space'
    | 'underwater'
    | 'custom';
  customEnvironment?: string;
  primarySound: string;
  secondarySounds: string[];
  ambientDetails: string[];
  duration: '30min' | '1hour' | '3hours' | '8hours' | '10hours';
  mood: 'peaceful' | 'focus' | 'sleep' | 'meditation' | 'study' | 'relaxation';
  intensity: 'subtle' | 'moderate' | 'immersive';
  visualStyle?: string;
  loopSeamless: boolean;
  bpm?: string;
  instrumentation?: string;
}

export interface TalkingHeadPromptInput {
  type: 'TALKING_HEAD';
  avatar: string;
  script: string;
  voiceStyle: string;
  voiceId?: string;
  background: string;
  framing: string;
  additionalDetails?: string;
}

export interface SocialCopyPromptInput {
  type: 'SOCIAL_COPY';
  niche: string;
  platform: 'instagram' | 'tiktok' | 'youtube_shorts' | 'twitter' | 'linkedin' | 'facebook';
  tone: string;
  keywords: string[];
  hookType: string;
  hashtagDensity: 'low' | 'medium' | 'high';
  additionalContext?: string;
}

export interface CreativeScanPromptInput {
  type: 'CREATIVE_SCAN';
  sourceUrl?: string;
  sourceAssetId?: string;
  analysisType: 'hook' | 'structure' | 'engagement' | 'full' | 'viral-elements';
  niche: string;
  competitorInfo?: string;
  extractedFrames: ExtractedFrame[];
  focusAreas: string[];
}

export interface ExtractedFrame {
  timestamp: number;
  r2Key: string;
  description?: string;
}

export type LoopMood =
  | 'natural-calm'
  | 'cozy-warm'
  | 'cinematic-peaceful'
  | 'meditative'
  | 'sleep-ambience';

export type LoopLightingOption =
  | 'morning-soft-light'
  | 'golden-hour'
  | 'evening-warm-light'
  | 'night-ambient-light'
  | 'overcast-calm';

export type LoopVisualStyle =
  | 'photorealistic'
  | 'cinematic-natural'
  | 'ultra-realistic'
  | 'soft-cozy'
  | 'ambient-documentary';

export type LoopSceneId =
  | 'cozy-fireplace'
  | 'forest-river'
  | 'rainy-window'
  | 'ocean-shore'
  | 'night-campfire'
  | 'waterfall-retreat'
  | 'mountain-stream'
  | 'cozy-cafe-rain'
  | 'aquarium-calm'
  | 'custom';

export interface LoopSourceCustomScene {
  environment: string;
  focalPoint: string;
  continuousMotion: string;
  nativeAudio: string;
}

export interface LoopSourcePromptInput {
  type: 'LOOP_SOURCE';
  sceneId: LoopSceneId;
  customScene?: LoopSourceCustomScene;
  mood: LoopMood;
  lighting: LoopLightingOption;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  durationSeconds: 8 | 10 | 15;
  visualStyle: LoopVisualStyle;
  additionalDetail?: string;
}

export interface CreatePromptInput {
  type: PromptType;
  title: string;
  inputData: PromptInputData;
}

export interface CreatePromptVersionInput {
  inputData: PromptInputData;
  userNotes?: string;
}
