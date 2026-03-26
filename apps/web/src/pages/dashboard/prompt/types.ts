import { type AIModel, DEFAULT_MODELS } from '@vibe-creator/shared';

function getDefaultModel(modelType: keyof typeof DEFAULT_MODELS): AIModel {
  const model = DEFAULT_MODELS[modelType];
  if (!model) {
    throw new Error(`Missing default model for ${modelType}`);
  }

  return model;
}

export interface ScriptFormData {
  targetModel: AIModel;
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

export interface VoiceFormData {
  targetModel: AIModel;
  script: string;
  voiceStyle: string;
  language: string;
  gender: string;
  emotion: string;
  pace: string;
  emphasis: string;
  pauses: string;
}

export interface VideoGenFormData {
  targetModel: AIModel;
  concept: string;
  style: string;
  aspectRatio: string;
  duration: string;
  movement: string;
  lighting: string;
  mood: string;
  additionalDetails: string;
}

export interface ImageFormData {
  targetModel: AIModel;
  subject: string;
  style: string;
  aspectRatio: string;
  mood: string;
  colors: string;
  textOverlay: string;
  additionalDetails: string;
  // Added purpose here to fix runtime bug
  purpose: string;
}

export interface RelaxingFormData {
  targetModel: AIModel;
  environment: string;
  primarySound: string;
  secondarySounds: string;
  ambientDetails: string;
  duration: string;
  mood: string;
  visualStyle: string;
}

export interface CreativeScanFormData {
  targetModel: AIModel;
  sourceUrl: string;
  analysisType: string;
  niche: string;
  focusAreas: string;
}

export interface TimelapseScene {
  description: string;
  durationSeconds: number;
}

export interface TimelapseFormData {
  targetModel: AIModel;
  category: string;
  subject: string;
  transformation: string;
  mode: 'single' | 'storyboard';
  totalDurationSeconds: number;
  scenes: TimelapseScene[];
  style: string;
  speedMultiplier: number;
  camera: string;
  aspectRatio: string;
  lighting: string;
  additionalDetails: string;
}

// Default Values
export const defaultScriptForm: ScriptFormData = {
  targetModel: getDefaultModel('SCRIPT'),
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

export const defaultVoiceForm: VoiceFormData = {
  targetModel: getDefaultModel('VOICE'),
  script: '',
  voiceStyle: 'conversational',
  language: 'id',
  gender: 'neutral',
  emotion: '',
  pace: 'normal',
  emphasis: '',
  pauses: '',
};

export const defaultVideoGenForm: VideoGenFormData = {
  targetModel: getDefaultModel('VIDEO_GEN'),
  concept: '',
  style: 'cinematic',
  aspectRatio: '16:9',
  duration: '10s',
  movement: 'static',
  lighting: '',
  mood: '',
  additionalDetails: '',
};

export const defaultImageForm: ImageFormData = {
  targetModel: getDefaultModel('IMAGE'),
  subject: '',
  style: 'photorealistic',
  aspectRatio: '16:9',
  mood: '',
  colors: '',
  textOverlay: '',
  additionalDetails: '',
  purpose: 'thumbnail', // Default purpose
};

export const defaultRelaxingForm: RelaxingFormData = {
  targetModel: getDefaultModel('RELAXING'),
  environment: 'rain',
  primarySound: '',
  secondarySounds: '',
  ambientDetails: '',
  duration: '1hour',
  mood: 'peaceful',
  visualStyle: '',
};

export const defaultCreativeScanForm: CreativeScanFormData = {
  targetModel: getDefaultModel('CREATIVE_SCAN'),
  sourceUrl: '',
  analysisType: 'full',
  niche: '',
  focusAreas: '',
};

export const defaultTimelapseForm: TimelapseFormData = {
  targetModel: getDefaultModel('TIMELAPSE'),
  category: '',
  subject: '',
  transformation: '',
  mode: 'single',
  totalDurationSeconds: 15,
  scenes: [],
  style: 'cinematic',
  speedMultiplier: 100,
  camera: 'static',
  aspectRatio: '16:9',
  lighting: 'natural-progression',
  additionalDetails: '',
};
