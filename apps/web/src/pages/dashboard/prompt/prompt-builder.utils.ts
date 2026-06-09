import type { PromptType } from '@vibe-creator/shared';
import type {
  CreativeScanFormData,
  ImageFormData,
  RelaxingFormData,
  ScriptFormData,
  SocialCopyFormData,
  TalkingHeadFormData,
  VideoGenFormData,
  VoiceFormData,
} from '../prompt/types';

export interface PromptBuilderFormState {
  scriptForm: ScriptFormData;
  voiceForm: VoiceFormData;
  videoGenForm: VideoGenFormData;
  imageForm: ImageFormData;
  relaxingForm: RelaxingFormData;
  creativeScanForm: CreativeScanFormData;
  talkingHeadForm: TalkingHeadFormData;
  socialCopyForm: SocialCopyFormData;
}

function splitCsv(input: string | string[]): string[] {
  if (Array.isArray(input)) {
    return input;
  }
  if (typeof input !== 'string') {
    return [];
  }
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitJourney(input: string | string[]): string[] {
  if (Array.isArray(input)) {
    return input;
  }
  if (typeof input !== 'string') {
    return [];
  }
  return input
    .split(/,|->/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Normalizes prompt builder form state into the API payload shape.
 */
export function buildPromptInputData(
  selectedType: PromptType,
  forms: PromptBuilderFormState,
): Record<string, unknown> {
  switch (selectedType) {
    case 'SCRIPT':
      return {
        ...forms.scriptForm,
        keywords: splitCsv(forms.scriptForm.keywords),
        emotionalJourney: splitJourney(forms.scriptForm.emotionalJourney),
      };
    case 'VOICE':
      return { ...forms.voiceForm };
    case 'VIDEO_GEN':
      return { ...forms.videoGenForm };
    case 'IMAGE':
      return {
        ...forms.imageForm,
        colors: splitCsv(forms.imageForm.colors),
      };
    case 'RELAXING':
      return {
        ...forms.relaxingForm,
        secondarySounds: splitCsv(forms.relaxingForm.secondarySounds),
        ambientDetails: splitCsv(forms.relaxingForm.ambientDetails),
      };
    case 'CREATIVE_SCAN':
      return { ...forms.creativeScanForm };

    case 'TALKING_HEAD':
      return { ...forms.talkingHeadForm };
    case 'SOCIAL_COPY':
      return {
        ...forms.socialCopyForm,
        keywords: splitCsv(forms.socialCopyForm.keywords),
      };
    case 'LOOP_SOURCE':
      throw new Error('Gunakan Loop Creator untuk membuat prompt loop source.');
  }
}

export function createPromptTitle(selectedType: PromptType, title: string): string {
  const normalizedTitle = title.trim();
  if (normalizedTitle) {
    return normalizedTitle;
  }

  return `${selectedType} Prompt - ${new Date().toLocaleString()}`;
}
