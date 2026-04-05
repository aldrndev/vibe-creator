import type { SelectedClip } from '@/stores/director-store';

export interface DirectorTranscribeProgressMeta {
  phase?:
    | 'queued'
    | 'queueing-clips'
    | 'extracting-audio'
    | 'running-whisper'
    | 'saving-transcript'
    | 'cache-hit'
    | 'processing-clips'
    | 'completed'
    | 'failed';
  clipCount?: number;
  clipDurationTotalMs?: number;
  completedClipCount?: number;
  failedClipCount?: number;
  cacheHitCount?: number;
  currentClipId?: string | null;
}

export function shouldPollTranscribeStatus(status: string | null | undefined): boolean {
  return status === 'PENDING' || status === 'PROCESSING';
}

export function getTranscriptText(clip: SelectedClip): string {
  return clip.transcript?.segments?.map((segment) => segment.text).join(' ') || '';
}

export function getTranscriptTextareaKey(clip: SelectedClip): string {
  const transcriptSignature =
    clip.transcript?.segments
      ?.map((segment) => `${segment.startMs}-${segment.endMs}-${segment.text}`)
      .join('|') || 'empty';

  return `${clip.id}:${transcriptSignature}`;
}

export function getTranscribeProgressMeta(job: unknown): DirectorTranscribeProgressMeta | null {
  if (typeof job !== 'object' || job === null) {
    return null;
  }

  const payload = job as { progressMeta?: DirectorTranscribeProgressMeta };
  if (!payload.progressMeta || typeof payload.progressMeta !== 'object') {
    return null;
  }

  return payload.progressMeta;
}

export function getTranscribePhaseLabel(phase: DirectorTranscribeProgressMeta['phase']): string {
  switch (phase) {
    case 'queueing-clips':
      return 'Menyiapkan antrean klip';
    case 'extracting-audio':
      return 'Mengekstrak audio klip';
    case 'running-whisper':
      return 'Menjalankan AI transcribe';
    case 'saving-transcript':
      return 'Menyimpan hasil transkripsi';
    case 'cache-hit':
      return 'Mengambil hasil dari cache';
    case 'processing-clips':
      return 'Menyelesaikan klip terpilih';
    case 'completed':
      return 'Transkripsi selesai';
    case 'failed':
      return 'Transkripsi gagal';
    default:
      return 'Menyiapkan transkripsi';
  }
}
