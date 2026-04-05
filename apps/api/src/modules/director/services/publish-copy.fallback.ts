import type { DirectorSessionWithDetails } from '../director.repo';

export interface PublishCopyPack {
  bestClipId: string | null;
  title: string;
  caption: string;
  cta: string;
  hashtags: string[];
  source: 'ai' | 'heuristic';
  provider: 'openai' | 'ollama' | 'heuristic';
  notice: {
    mode: 'ai' | 'fallback';
    message: string;
    attemptedProviders?: Array<'openai' | 'ollama'>;
    lastError?: string | null;
  };
}

interface TranscriptTextSegment {
  text: string;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function sanitizeSentence(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '')
    .trim();
}

function getTranscriptText(session: DirectorSessionWithDetails, clipId: string): string {
  const clip = session.selectedClips.find((item) => item.id === clipId);
  const segments = clip?.transcript?.segments;
  if (!Array.isArray(segments)) {
    return '';
  }

  return (
    segments
      .map((segment): TranscriptTextSegment | null => {
        if (
          typeof segment === 'object' &&
          segment !== null &&
          'text' in segment &&
          typeof segment.text === 'string'
        ) {
          return { text: segment.text.trim() };
        }

        return null;
      })
      .filter((segment): segment is TranscriptTextSegment => segment !== null)
      .map((segment) => segment.text)
      .filter(Boolean)
      .join(' ') || ''
  );
}

function pickBestClip(session: DirectorSessionWithDetails) {
  return [...session.selectedClips].sort(
    (left, right) => (right.candidate.score ?? 0) - (left.candidate.score ?? 0),
  )[0];
}

function deriveAngle(transcriptText: string): string {
  const normalized = transcriptText.toLowerCase();

  if (/\b(cara|tutorial|step|langkah|tips)\b/.test(normalized)) {
    return 'Tutorial cepat';
  }

  if (/\b(kenapa|story|cerita|pengalaman)\b/.test(normalized)) {
    return 'Storytelling pendek';
  }

  if (/\b(rahasia|trik|kesalahan|jangan)\b/.test(normalized)) {
    return 'Hook edukatif';
  }

  return 'Shorts insight';
}

export function buildFallbackPublishCopy(session: DirectorSessionWithDetails): PublishCopyPack {
  const bestClip = pickBestClip(session);
  if (!bestClip) {
    return {
      bestClipId: null,
      title: 'Shorts siap dipoles',
      caption: 'Pilih klip terbaik dulu untuk mendapatkan copy publish otomatis.',
      cta: 'Simpan ide ini untuk publish berikutnya.',
      hashtags: ['#shorts', '#viralideas'],
      source: 'heuristic',
      provider: 'heuristic',
      notice: {
        mode: 'fallback',
        message: 'Pilih klip terbaik dulu untuk mendapatkan copy publish otomatis.',
      },
    };
  }

  const transcriptText = getTranscriptText(session, bestClip.id);
  const firstSentence = sanitizeSentence(transcriptText.split(/[.!?]/)[0] ?? '');
  const angle = deriveAngle(transcriptText);
  const title = truncateText(
    firstSentence ? `${firstSentence} | ${angle}` : `${angle} yang siap diangkat jadi Shorts`,
    72,
  );
  const caption = truncateText(
    transcriptText
      ? `${angle}. ${transcriptText}`
      : 'Shorts ini punya hook yang kuat dan siap dipoles lebih lanjut sebelum publish.',
    180,
  );
  const cta =
    (bestClip.candidate.score ?? 0) >= 0.85
      ? 'Tutup dengan CTA singkat dan ajak penonton simpan video ini.'
      : 'Tambahkan CTA singkat di akhir supaya retention tetap terjaga.';
  const hashtags = ['#shorts', '#viralideas'];

  if (angle.toLowerCase().includes('tutorial')) {
    hashtags.push('#tutorial');
  } else if (angle.toLowerCase().includes('story')) {
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
    source: 'heuristic',
    provider: 'heuristic',
    notice: {
      mode: 'fallback',
      message:
        'AI copy belum tersedia, jadi sistem memakai fallback heuristik untuk membantu drafting.',
    },
  };
}

export function sanitizePublishCopy(payload: {
  bestClipId: string | null;
  title: string;
  caption: string;
  cta: string;
  hashtags: string[];
  source: 'ai' | 'heuristic';
  provider: 'openai' | 'ollama' | 'heuristic';
  notice?: PublishCopyPack['notice'];
}): PublishCopyPack {
  const hashtags = payload.hashtags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag.replace(/^#+/, '')}`))
    .filter((tag, index, array) => array.indexOf(tag) === index)
    .slice(0, 6);

  return {
    bestClipId: payload.bestClipId,
    title: truncateText(payload.title.trim() || 'Shorts siap publish', 72),
    caption: truncateText(payload.caption.trim() || 'Konten ini siap dipoles untuk publish.', 180),
    cta: truncateText(payload.cta.trim() || 'Tambahkan CTA singkat di akhir video.', 120),
    hashtags: hashtags.length > 0 ? hashtags : ['#shorts', '#viralideas'],
    source: payload.source,
    provider: payload.provider,
    notice:
      payload.notice ??
      (payload.source === 'ai'
        ? {
            mode: 'ai',
            message: `Copy publish dihasilkan via ${payload.provider === 'ollama' ? 'Ollama' : 'OpenAI'}.`,
          }
        : {
            mode: 'fallback',
            message: 'Sistem memakai fallback heuristik untuk membantu drafting.',
          }),
  };
}
