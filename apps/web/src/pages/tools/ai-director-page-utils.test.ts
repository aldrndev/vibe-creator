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
  it('prioritizes completed export as COMPLETED', () => {
    const session = createSession('EDITING');
    session.exportJob = { status: 'COMPLETED' };

    expect(resolveHydratedStep(session)).toBe('COMPLETED');
  });

  it('keeps export progress as EXPORTING while job exists', () => {
    const session = createSession('EDITING');
    session.exportJob = { status: 'PROCESSING' };

    expect(resolveHydratedStep(session)).toBe('EXPORTING');
  });

  it('restores publish copy step when selected clips exist', () => {
    const session = createSession('PUBLISH_COPY');
    session.selectedClips = [{ id: 'clip-1' }];

    expect(resolveHydratedStep(session)).toBe('PUBLISH_COPY');
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
