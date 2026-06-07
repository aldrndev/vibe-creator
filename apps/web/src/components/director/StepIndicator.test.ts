import { describe, expect, it } from 'vitest';
import {
  getDirectorVisualStepId,
  getDirectorVisualStepIndex,
} from '@/components/director/StepIndicator';
import type { DirectorStep } from '@/stores/director-store';

describe('Director visual step mapping', () => {
  it.each([
    ['IMPORT', 'SOURCE_VIDEO', 0],
    ['ANALYZING', 'AI_ANALYSIS', 1],
    ['PICKING', 'PICK_MOMENT', 2],
    ['EDITING', 'EDIT_SHORT', 3],
    ['PUBLISH_COPY', 'EDIT_SHORT', 3],
    ['EXPORTING', 'PREVIEW_DOWNLOAD', 4],
    ['COMPLETED', 'PREVIEW_DOWNLOAD', 4],
  ] satisfies ReadonlyArray<
    readonly [DirectorStep, string, number]
  >)('maps %s to %s', (directorStep, visualStepId, visualStepIndex) => {
    expect(getDirectorVisualStepId(directorStep)).toBe(visualStepId);
    expect(getDirectorVisualStepIndex(directorStep)).toBe(visualStepIndex);
  });
});
