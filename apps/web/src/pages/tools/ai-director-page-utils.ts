import { DIRECTOR_INITIAL_CONTEXT_QUERY_KEYS } from '@/lib/ai-director-trending-context';
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

function hasSearchValue(searchParams: URLSearchParams, key: string): boolean {
  const value = searchParams.get(key);
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPlainAiDirectorEntry(searchParams: URLSearchParams): boolean {
  if (hasSearchValue(searchParams, 'session')) {
    return false;
  }

  return !DIRECTOR_INITIAL_CONTEXT_QUERY_KEYS.some((key) => hasSearchValue(searchParams, key));
}

interface PlainEntrySessionState {
  readonly isPlainEntry: boolean;
  readonly activeSessionId: string | null;
  readonly hasInitializedManualEntry: boolean;
}

export function shouldClearPlainEntrySession({
  isPlainEntry,
  activeSessionId,
  hasInitializedManualEntry,
}: PlainEntrySessionState): boolean {
  return isPlainEntry && activeSessionId !== null && !hasInitializedManualEntry;
}

interface ActiveSessionSearchSyncState {
  readonly activeSessionId: string | null;
  readonly step: DirectorStep;
  readonly hasAsset: boolean;
}

export function shouldSyncActiveSessionToSearch({
  activeSessionId,
  step,
  hasAsset,
}: ActiveSessionSearchSyncState): boolean {
  return activeSessionId !== null && (hasAsset || step !== 'IMPORT');
}
