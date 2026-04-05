import { deriveClipInsight } from '@/components/director/steps/editing-insights';
import type { SelectedClip } from '@/stores/director-store';

export interface PublishPack {
  readonly bestClipId: string | null;
  readonly title: string;
  readonly caption: string;
  readonly cta: string;
  readonly hashtags: string[];
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function sanitizeHook(hook: string): string {
  return hook.replace(/[.!?]+$/, '').trim();
}

/**
 * Build ready-to-use publish copy from the strongest selected clip.
 * This keeps suggestions deterministic and instant for the editor flow.
 */
export function derivePublishPack(clips: SelectedClip[]): PublishPack {
  if (clips.length === 0) {
    return {
      bestClipId: null,
      title: 'Shorts siap dipoles',
      caption: 'Pilih klip terbaik dulu untuk mendapatkan copy publish otomatis.',
      cta: 'Simpan ide ini untuk publish berikutnya.',
      hashtags: ['#shorts', '#viralideas'],
    };
  }

  const bestClip = [...clips].sort(
    (left, right) => right.candidate.score - left.candidate.score,
  )[0];
  if (!bestClip) {
    return {
      bestClipId: null,
      title: 'Shorts siap dipoles',
      caption: 'Pilih klip terbaik dulu untuk mendapatkan copy publish otomatis.',
      cta: 'Simpan ide ini untuk publish berikutnya.',
      hashtags: ['#shorts', '#viralideas'],
    };
  }

  const insight = deriveClipInsight(bestClip);
  const cleanHook = sanitizeHook(insight.hookLine);
  const title = truncateText(`${cleanHook} | ${insight.strengthLabel}`, 72);
  const caption = truncateText(
    `${insight.summary} Hook utama: ${cleanHook}. Overlay pembuka: ${insight.suggestedOverlay}.`,
    180,
  );
  const cta =
    insight.strengthLabel === 'Sangat Kuat'
      ? 'Tutup dengan CTA singkat dan ajak penonton simpan video ini.'
      : 'Tambahkan CTA singkat di akhir supaya retention tetap terjaga.';
  const hashtags = ['#shorts', '#viralideas'];

  if (insight.angle.toLowerCase().includes('tutorial')) {
    hashtags.push('#tutorial');
  } else if (insight.angle.toLowerCase().includes('story')) {
    hashtags.push('#storytelling');
  } else {
    hashtags.push('#contentcreator');
  }

  return {
    bestClipId: bestClip.id,
    title,
    caption,
    cta,
    hashtags,
  };
}
