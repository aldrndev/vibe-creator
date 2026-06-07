import type { Prisma } from '@prisma/client';

export interface DirectorTranscribeProgressMeta {
  phase:
    | 'queued'
    | 'queueing-clips'
    | 'extracting-audio'
    | 'running-whisper'
    | 'translating-transcript'
    | 'saving-transcript'
    | 'cache-hit'
    | 'processing-clips'
    | 'completed'
    | 'failed';
  clipCount: number;
  clipDurationTotalMs: number;
  completedClipCount: number;
  failedClipCount: number;
  cacheHitCount: number;
  currentClipId: string | null;
  subtitleMode?: 'original' | 'translate';
  subtitleTargetLanguage?: string | null;
}

export function buildInitialTranscribeProgressMeta(input: {
  clipCount: number;
  clipDurationTotalMs: number;
  subtitleMode?: 'original' | 'translate';
  subtitleTargetLanguage?: string | null;
}): DirectorTranscribeProgressMeta {
  return {
    phase: 'queued',
    clipCount: input.clipCount,
    clipDurationTotalMs: input.clipDurationTotalMs,
    completedClipCount: 0,
    failedClipCount: 0,
    cacheHitCount: 0,
    currentClipId: null,
    subtitleMode: input.subtitleMode ?? 'original',
    subtitleTargetLanguage: input.subtitleTargetLanguage ?? null,
  };
}

export function parseTranscribeProgressMeta(value: unknown): DirectorTranscribeProgressMeta | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const payload = value as Partial<DirectorTranscribeProgressMeta>;
  if (
    typeof payload.phase !== 'string' ||
    typeof payload.clipCount !== 'number' ||
    typeof payload.clipDurationTotalMs !== 'number'
  ) {
    return null;
  }

  return {
    phase: payload.phase as DirectorTranscribeProgressMeta['phase'],
    clipCount: payload.clipCount,
    clipDurationTotalMs: payload.clipDurationTotalMs,
    completedClipCount:
      typeof payload.completedClipCount === 'number' ? payload.completedClipCount : 0,
    failedClipCount: typeof payload.failedClipCount === 'number' ? payload.failedClipCount : 0,
    cacheHitCount: typeof payload.cacheHitCount === 'number' ? payload.cacheHitCount : 0,
    currentClipId: typeof payload.currentClipId === 'string' ? payload.currentClipId : null,
    subtitleMode: payload.subtitleMode === 'translate' ? 'translate' : 'original',
    subtitleTargetLanguage:
      typeof payload.subtitleTargetLanguage === 'string' ? payload.subtitleTargetLanguage : null,
  };
}

export function updateTranscribeProgressMeta(
  current: DirectorTranscribeProgressMeta | null,
  patch: Partial<DirectorTranscribeProgressMeta>,
): DirectorTranscribeProgressMeta {
  return {
    phase: patch.phase ?? current?.phase ?? 'queued',
    clipCount: patch.clipCount ?? current?.clipCount ?? 0,
    clipDurationTotalMs: patch.clipDurationTotalMs ?? current?.clipDurationTotalMs ?? 0,
    completedClipCount: patch.completedClipCount ?? current?.completedClipCount ?? 0,
    failedClipCount: patch.failedClipCount ?? current?.failedClipCount ?? 0,
    cacheHitCount: patch.cacheHitCount ?? current?.cacheHitCount ?? 0,
    currentClipId:
      patch.currentClipId === undefined ? (current?.currentClipId ?? null) : patch.currentClipId,
    subtitleMode: patch.subtitleMode ?? current?.subtitleMode ?? 'original',
    subtitleTargetLanguage:
      patch.subtitleTargetLanguage === undefined
        ? (current?.subtitleTargetLanguage ?? null)
        : patch.subtitleTargetLanguage,
  };
}

export function toTranscribeProgressJson(
  meta: DirectorTranscribeProgressMeta,
): Prisma.InputJsonValue {
  return {
    phase: meta.phase,
    clipCount: meta.clipCount,
    clipDurationTotalMs: meta.clipDurationTotalMs,
    completedClipCount: meta.completedClipCount,
    failedClipCount: meta.failedClipCount,
    cacheHitCount: meta.cacheHitCount,
    currentClipId: meta.currentClipId,
    subtitleMode: meta.subtitleMode ?? 'original',
    subtitleTargetLanguage: meta.subtitleTargetLanguage ?? null,
  };
}
