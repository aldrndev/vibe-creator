export type PromptType = 
  | 'SCRIPT' 
  | 'VOICE' 
  | 'VIDEO_GEN' 
  | 'IMAGE' 
  | 'RELAXING' 
  | 'CREATIVE_SCAN';

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
  | CreativeScanPromptInput;

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
}

export interface RelaxingPromptInput {
  type: 'RELAXING';
  environment: 'rain' | 'forest' | 'ocean' | 'fireplace' | 'cafe' | 'city' | 'space' | 'underwater' | 'custom';
  customEnvironment?: string;
  primarySound: string;
  secondarySounds: string[];
  ambientDetails: string[];
  duration: '30min' | '1hour' | '3hours' | '8hours' | '10hours';
  mood: 'peaceful' | 'focus' | 'sleep' | 'meditation' | 'study' | 'relaxation';
  intensity: 'subtle' | 'moderate' | 'immersive';
  visualStyle?: string;
  loopSeamless: boolean;
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

export interface CreatePromptInput {
  type: PromptType;
  title: string;
  inputData: PromptInputData;
}

export interface CreatePromptVersionInput {
  inputData: PromptInputData;
  userNotes?: string;
}
