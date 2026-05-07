import {
  buildTranscriptCues,
  type TranscriptCue,
  type TranscriptSegment,
} from '@/components/director/steps/editing-transcript-cues';
import type { SubtitleStyle } from '@/stores/director-store';

const TRANSCRIPT_EDITOR_ANIMATION: SubtitleStyle['animation'] = 'none';

const subtitlePresetBadgeLabels = {
  custom: 'Gaya Custom',
  'viral-pop': 'Gaya Viral Pop',
  'meme-pop': 'Gaya Meme Green',
  'podcast-duo': 'Gaya Podcast Duo',
  'clean-bold': 'Gaya Clean Bold',
  'neon-glow': 'Gaya Neon Glow',
  'creator-box': 'Gaya Creator Box',
  cinema: 'Gaya Cinema',
} as const satisfies Record<SubtitleStyle['stylePreset'], string>;

/**
 * Builds a stable transcript editor view that does not change when subtitle animation changes.
 */
export function buildStableTranscriptEditorCues(segments: TranscriptSegment[]): TranscriptCue[] {
  return buildTranscriptCues(segments, TRANSCRIPT_EDITOR_ANIMATION);
}

/**
 * Resolves the visible preset badge shown in the transcript editor header.
 */
export function getSubtitlePresetBadgeLabel(stylePreset: SubtitleStyle['stylePreset']): string {
  return subtitlePresetBadgeLabels[stylePreset];
}
