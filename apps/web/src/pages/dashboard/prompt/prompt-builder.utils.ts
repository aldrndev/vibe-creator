import type { PromptType } from '@vibe-creator/shared';
import type {
  CreativeScanFormData,
  ImageFormData,
  RelaxingFormData,
  ScriptFormData,
  TimelapseFormData,
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
  timelapseForm: TimelapseFormData;
}

function splitCsv(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitJourney(input: string): string[] {
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
      return {
        ...forms.voiceForm,
        emphasis: splitCsv(forms.voiceForm.emphasis),
        pauses: splitCsv(forms.voiceForm.pauses),
      };
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
    case 'TIMELAPSE':
      return { ...forms.timelapseForm };
  }
}

export function createPromptTitle(selectedType: PromptType, title: string): string {
  const normalizedTitle = title.trim();
  if (normalizedTitle) {
    return normalizedTitle;
  }

  return `${selectedType} Prompt - ${new Date().toLocaleString()}`;
}
