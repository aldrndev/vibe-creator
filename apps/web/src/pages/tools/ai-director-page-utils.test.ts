import { describe, expect, it } from 'vitest';
import {
  isPlainAiDirectorEntry,
  resolveHydratedStep,
  shouldClearPlainEntrySession,
  shouldSyncActiveSessionToSearch,
} from '@/pages/tools/ai-director-page-utils';
import type { DirectorStep } from '@/stores/director-store';

function createSession(step: DirectorStep) {
  return {
    step,
    exportJob: null as { status?: string | null } | null,
    selectedClips: [] as unknown[],
    analysisJob: null as { status?: string | null } | null,
    asset: null as { ingestStatus?: 'UPLOADING' | 'READY' | 'FAILED' } | null,
  };
}

describe('resolveHydratedStep', () => {
  it('ignores legacy export job and keeps editing flow when clips exist', () => {
    const session = createSession('EDITING');
    session.exportJob = { status: 'COMPLETED' };
    session.selectedClips = [{ id: 'clip-1' }];

    expect(resolveHydratedStep(session)).toBe('EDITING');
  });

  it('maps legacy exporting/completed session step back to EDITING', () => {
    const exportingSession = createSession('EXPORTING');
    exportingSession.selectedClips = [{ id: 'clip-1' }];

    const completedSession = createSession('COMPLETED');
    completedSession.selectedClips = [{ id: 'clip-1' }];

    expect(resolveHydratedStep(exportingSession)).toBe('EDITING');
    expect(resolveHydratedStep(completedSession)).toBe('EDITING');
  });

  it('maps legacy publish step to EDITING when selected clips exist', () => {
    const session = createSession('PUBLISH_COPY');
    session.selectedClips = [{ id: 'clip-1' }];

    expect(resolveHydratedStep(session)).toBe('EDITING');
  });

  it('falls back to EDITING when clips already selected', () => {
    const session = createSession('PICKING');
    session.selectedClips = [{ id: 'clip-1' }];

    expect(resolveHydratedStep(session)).toBe('EDITING');
  });

  it('falls back to PICKING when analysis already completed', () => {
    const session = createSession('ANALYZING');
    session.analysisJob = { status: 'COMPLETED' };

    expect(resolveHydratedStep(session)).toBe('PICKING');
  });
});

describe('isPlainAiDirectorEntry', () => {
  it('treats the menu route without query params as a plain entry', () => {
    expect(isPlainAiDirectorEntry(new URLSearchParams())).toBe(true);
  });

  it('does not treat an explicit session route as a plain entry', () => {
    expect(isPlainAiDirectorEntry(new URLSearchParams({ session: 'session-1' }))).toBe(false);
  });

  it('does not treat trending context as a plain entry', () => {
    expect(
      isPlainAiDirectorEntry(
        new URLSearchParams({
          source: 'trending',
          topic: 'Viral video',
          sourceUrl: 'https://www.youtube.com/watch?v=abc',
        }),
      ),
    ).toBe(false);
  });

  it('ignores blank query values when deciding plain entry', () => {
    expect(isPlainAiDirectorEntry(new URLSearchParams({ topic: '   ' }))).toBe(true);
  });
});

describe('shouldClearPlainEntrySession', () => {
  it('clears a stored active session when opening AI Director from the menu route', () => {
    expect(
      shouldClearPlainEntrySession({
        isPlainEntry: true,
        activeSessionId: 'expired-session',
        hasInitializedManualEntry: false,
      }),
    ).toBe(true);
  });

  it('keeps a fresh session created after the manual entry has initialized', () => {
    expect(
      shouldClearPlainEntrySession({
        isPlainEntry: true,
        activeSessionId: 'fresh-session',
        hasInitializedManualEntry: true,
      }),
    ).toBe(false);
  });

  it('keeps sessions opened through an explicit session URL', () => {
    expect(
      shouldClearPlainEntrySession({
        isPlainEntry: false,
        activeSessionId: 'session-from-url',
        hasInitializedManualEntry: false,
      }),
    ).toBe(false);
  });
});

describe('shouldSyncActiveSessionToSearch', () => {
  it('does not expose a freshly created import session before it has an asset', () => {
    expect(
      shouldSyncActiveSessionToSearch({
        activeSessionId: 'fresh-session',
        step: 'IMPORT',
        hasAsset: false,
      }),
    ).toBe(false);
  });

  it('exposes an import session after an asset is attached', () => {
    expect(
      shouldSyncActiveSessionToSearch({
        activeSessionId: 'asset-session',
        step: 'IMPORT',
        hasAsset: true,
      }),
    ).toBe(true);
  });

  it('exposes non-import sessions even when the asset payload is not present locally', () => {
    expect(
      shouldSyncActiveSessionToSearch({
        activeSessionId: 'analysis-session',
        step: 'ANALYZING',
        hasAsset: false,
      }),
    ).toBe(true);
  });

  it('does not expose an empty session state', () => {
    expect(
      shouldSyncActiveSessionToSearch({
        activeSessionId: null,
        step: 'IMPORT',
        hasAsset: false,
      }),
    ).toBe(false);
  });
});
