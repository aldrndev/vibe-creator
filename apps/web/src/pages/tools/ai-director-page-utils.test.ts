import { describe, expect, it } from 'vitest';
import { resolveHydratedStep } from '@/pages/tools/ai-director-page-utils';
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
