import { getTranscriptText } from '@/components/director/steps/director-step-utils';
import type { SelectedClip } from '@/stores/director-store';

const SHORTS_IDEAL_MAX_SECONDS = 45;
const STRONG_SCORE_THRESHOLD = 0.9;
const SOLID_SCORE_THRESHOLD = 0.75;
const HOOK_WORD_LIMIT = 10;

const tutorialKeywords = ['cara', 'tutorial', 'tips', 'how to', 'step', 'langkah'];
const curiosityKeywords = ['kenapa', 'mengapa', 'why', 'gimana', 'bagaimana', '?'];
const listKeywords = ['3', '5', '7', '10', 'list', 'daftar'];

export interface ClipInsight {
  readonly angle: string;
  readonly hookLine: string;
  readonly summary: string;
  readonly strengthLabel: string;
  readonly reasons: string[];
  readonly suggestedOverlay: string;
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function truncateWords(text: string, wordLimit: number): string {
  const words = text.split(' ').filter(Boolean);
  if (words.length <= wordLimit) {
    return text;
  }

  return `${words.slice(0, wordLimit).join(' ')}...`;
}

function getHookLine(text: string): string {
  const firstSentence = text.split(/[.!?\n]/)[0]?.trim();

  if (!firstSentence) {
    return 'Potongan ini punya momentum visual yang cocok untuk hook singkat.';
  }

  return truncateWords(firstSentence, HOOK_WORD_LIMIT);
}

function resolveAngle(text: string, tags: string[], durationSeconds: number): string {
  const loweredText = text.toLowerCase();
  const hasHighEnergyTag = tags.some((tag) => tag.toLowerCase().includes('high'));
  const hasTutorialKeyword = tutorialKeywords.some((keyword) => loweredText.includes(keyword));
  const hasCuriosityKeyword = curiosityKeywords.some((keyword) => loweredText.includes(keyword));
  const hasListKeyword = listKeywords.some((keyword) => loweredText.includes(keyword));

  if (hasTutorialKeyword) {
    return 'Tutorial cepat dengan payoff yang jelas di awal.';
  }

  if (hasCuriosityKeyword) {
    return 'Curiosity hook yang cocok untuk bikin penonton lanjut nonton.';
  }

  if (hasListKeyword) {
    return 'Format listicle singkat yang enak dipotong jadi Shorts.';
  }

  if (hasHighEnergyTag || durationSeconds <= 20) {
    return 'Highlight cepat dengan tempo tinggi dan ritme padat.';
  }

  return 'Story highlight yang paling cocok dibuka dengan subtitle kuat.';
}

function resolveStrengthLabel(score: number): string {
  if (score >= STRONG_SCORE_THRESHOLD) {
    return 'Sangat Kuat';
  }

  if (score >= SOLID_SCORE_THRESHOLD) {
    return 'Potensial';
  }

  return 'Perlu Dipoles';
}

function buildReasons(
  text: string,
  durationSeconds: number,
  score: number,
  tags: string[],
): string[] {
  const reasons: string[] = [];

  if (durationSeconds <= SHORTS_IDEAL_MAX_SECONDS) {
    reasons.push('Durasi aman untuk Shorts');
  }

  if (score >= STRONG_SCORE_THRESHOLD) {
    reasons.push('Skor analisis klip tinggi');
  }

  if (text.length >= 48) {
    reasons.push('Subtitle punya materi yang cukup kuat');
  }

  if (tags.some((tag) => tag.toLowerCase().includes('high'))) {
    reasons.push('Energi klip tinggi');
  }

  if (reasons.length === 0) {
    reasons.push('Butuh hook teks yang lebih tegas');
  }

  return reasons.slice(0, 3);
}

function buildSummary(durationSeconds: number, angle: string): string {
  if (durationSeconds <= 15) {
    return `Cocok untuk Shorts super singkat. ${angle}`;
  }

  if (durationSeconds <= 30) {
    return `Panjang klip masih nyaman untuk retensi cepat. ${angle}`;
  }

  return `Perlu hook visual dan subtitle yang lebih tegas di awal. ${angle}`;
}

/**
 * Derive lightweight AI-director style insights from already-available clip metadata.
 * This stays deterministic so the editor gains actionable guidance without extra backend work.
 */
export function deriveClipInsight(clip: SelectedClip): ClipInsight {
  const transcriptText = normalizeText(getTranscriptText(clip));
  const durationSeconds = Math.max(
    1,
    Math.round((clip.candidate.endMs - clip.candidate.startMs) / 1000),
  );
  const tags = clip.candidate.tags ?? [];
  const hookLine = getHookLine(transcriptText);
  const angle = resolveAngle(transcriptText, tags, durationSeconds);
  const summary = buildSummary(durationSeconds, angle);

  return {
    angle,
    hookLine,
    summary,
    strengthLabel: resolveStrengthLabel(clip.candidate.score),
    reasons: buildReasons(transcriptText, durationSeconds, clip.candidate.score, tags),
    suggestedOverlay: transcriptText
      ? truncateWords(transcriptText, 6)
      : 'Mulai dengan kalimat paling kuat di 2 detik pertama',
  };
}
