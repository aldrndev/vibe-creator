import type { DirectorStep } from '@/stores/director-store';

export interface DirectorHydrationStepInput {
  readonly step: DirectorStep;
  readonly exportJob?: {
    readonly status?: string | null;
  } | null;
  readonly selectedClips?: readonly unknown[] | null;
  readonly analysisJob?: {
    readonly status?: string | null;
  } | null;
  readonly asset?: {
    readonly ingestStatus?: 'UPLOADING' | 'READY' | 'FAILED';
  } | null;
}

export function resolveHydratedStep(session: DirectorHydrationStepInput): DirectorStep {
  if (
    (session.step === 'EXPORTING' || session.step === 'COMPLETED') &&
    (session.selectedClips?.length ?? 0) > 0
  ) {
    return 'EDITING';
  }

  if (session.step === 'PUBLISH_COPY' && (session.selectedClips?.length ?? 0) > 0) {
    return 'EDITING';
  }

  if ((session.selectedClips?.length ?? 0) > 0) {
    return 'EDITING';
  }

  if (session.analysisJob?.status === 'COMPLETED') {
    return 'PICKING';
  }

  if (session.asset?.ingestStatus === 'UPLOADING') {
    return 'IMPORT';
  }

  return session.step;
}
