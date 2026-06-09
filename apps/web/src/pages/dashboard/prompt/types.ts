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
  language: string;
  hookStyle: string;
}

export interface VoiceFormData {
  targetModel: AIModel;
  script: string;
  voiceStyle: string;
  language: string;
  gender: string;
  emotion: string;
  pace: string;
  emphasis: string[];
  pauses: string[];
  voiceId: string;
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
  motionStrength: string;
  fps: string;
  negativePrompt: string;
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
  purpose: string;
  cameraLens: string;
  negativePrompt: string;
}

export interface RelaxingFormData {
  targetModel: AIModel;
  environment: string;
  customEnvironment: string;
  primarySound: string;
  secondarySounds: string;
  ambientDetails: string;
  duration: string;
  mood: string;
  visualStyle: string;
  intensity: string;
  loopSeamless: boolean;
  bpm: string;
  instrumentation: string;
}

export interface CreativeScanFormData {
  targetModel: AIModel;
  sourceUrl: string;
  analysisType: string;
  niche: string;
  focusAreas: string[];
}

export interface TalkingHeadFormData {
  targetModel: AIModel;
  avatar: string;
  script: string;
  voiceStyle: string;
  voiceId: string;
  background: string;
  framing: string;
  additionalDetails: string;
}

export interface SocialCopyFormData {
  targetModel: AIModel;
  niche: string;
  platform: string;
  tone: string;
  keywords: string;
  hookType: string;
  hashtagDensity: string;
  additionalContext: string;
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
  language: 'id',
  hookStyle: 'question',
};

export const defaultVoiceForm: VoiceFormData = {
  targetModel: getDefaultModel('VOICE'),
  script: '',
  voiceStyle: 'conversational',
  language: 'id',
  gender: 'neutral',
  emotion: '',
  pace: 'normal',
  emphasis: [],
  pauses: [],
  voiceId: '',
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
  motionStrength: 'balanced',
  fps: '30fps',
  negativePrompt: '',
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
  purpose: 'thumbnail',
  cameraLens: 'default',
  negativePrompt: '',
};

export const defaultRelaxingForm: RelaxingFormData = {
  targetModel: getDefaultModel('RELAXING'),
  environment: 'rain',
  customEnvironment: '',
  primarySound: '',
  secondarySounds: '',
  ambientDetails: '',
  duration: '1hour',
  mood: 'peaceful',
  visualStyle: '',
  intensity: 'moderate',
  loopSeamless: true,
  bpm: 'none',
  instrumentation: '',
};

export const defaultCreativeScanForm: CreativeScanFormData = {
  targetModel: getDefaultModel('CREATIVE_SCAN'),
  sourceUrl: '',
  analysisType: 'full',
  niche: '',
  focusAreas: [],
};

export const defaultTalkingHeadForm: TalkingHeadFormData = {
  targetModel: getDefaultModel('VIDEO_GEN'), // reuse same default
  avatar: 'male-professional',
  script: '',
  voiceStyle: 'conversational',
  voiceId: '',
  background: 'office-modern',
  framing: 'medium-close-up',
  additionalDetails: '',
};

export const defaultSocialCopyForm: SocialCopyFormData = {
  targetModel: getDefaultModel('SCRIPT'), // reuse same default
  niche: '',
  platform: 'instagram',
  tone: 'casual',
  keywords: '',
  hookType: 'question',
  hashtagDensity: 'medium',
  additionalContext: '',
};
