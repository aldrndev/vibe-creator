import { describe, expect, it } from 'vitest';
import { shouldAutosaveModernEditorDraft } from './use-modern-editor-autosave';

describe('shouldAutosaveModernEditorDraft', () => {
  it('does not autosave untouched blank projects', () => {
    expect(
      shouldAutosaveModernEditorDraft({
        projectId: 'project-local',
        isDirty: false,
      }),
    ).toBe(false);
  });

  it('autosaves dirty projects with a project ID', () => {
    expect(
      shouldAutosaveModernEditorDraft({
        projectId: 'project-local',
        isDirty: true,
      }),
    ).toBe(true);
  });

  it('does not autosave dirty state without a project ID', () => {
    expect(
      shouldAutosaveModernEditorDraft({
        projectId: '',
        isDirty: true,
      }),
    ).toBe(false);
  });
});
