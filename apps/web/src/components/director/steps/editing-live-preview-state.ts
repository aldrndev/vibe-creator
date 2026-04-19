export type PreviewStatus = 'idle' | 'dirty' | 'generating' | 'ready' | 'failed';

interface ResolvePreviewStatusInput {
  readonly previewPayloadJson: string | null;
  readonly previewStatus: PreviewStatus;
  readonly renderPreviewPath: string | null;
  readonly previewDownloadPath: string | null;
  readonly lastGeneratedPayloadKey: string | null;
  readonly lastAttemptPayloadKey: string | null;
}

export function resolvePreviewStatus(input: ResolvePreviewStatusInput): PreviewStatus {
  const {
    previewPayloadJson,
    previewStatus,
    renderPreviewPath,
    previewDownloadPath,
    lastGeneratedPayloadKey,
    lastAttemptPayloadKey,
  } = input;

  if (!previewPayloadJson) {
    return 'idle';
  }

  if (previewStatus === 'generating') {
    return 'generating';
  }

  const isCurrentReady =
    renderPreviewPath !== null &&
    previewDownloadPath !== null &&
    lastGeneratedPayloadKey === previewPayloadJson;

  if (isCurrentReady) {
    return 'ready';
  }

  if (renderPreviewPath) {
    return 'dirty';
  }

  const failedForCurrentPayload =
    previewStatus === 'failed' && lastAttemptPayloadKey === previewPayloadJson;

  return failedForCurrentPayload ? 'failed' : 'idle';
}

export function estimatePreviewProgressPercent(elapsedMs: number): number {
  const elapsedSec = Math.max(0, elapsedMs) / 1000;
  // Time constant = 14s → reaches ~50% at ~10s, ~75% at ~20s, ~85% at ~27s.
  // Cap at 85% to leave visible room while backend finishes processing.
  return Math.min(85, Math.round(85 * (1 - Math.exp(-elapsedSec / 14))));
}
