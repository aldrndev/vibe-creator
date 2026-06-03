import { describe, expect, it } from 'vitest';
import {
  createDefaultLoopDocument,
  loopCreatorProjectDocumentSchema,
} from './loop-creator-project-api';

describe('Loop Creator document defaults', () => {
  it('starts new projects in seamless mode', () => {
    expect(createDefaultLoopDocument().transition).toEqual({ mode: 'smooth' });
  });

  it('continues legacy repeat drafts without migrating their mode', () => {
    const legacy = loopCreatorProjectDocumentSchema.parse({
      ...createDefaultLoopDocument(),
      transition: { mode: 'repeat' },
    });

    expect(legacy.transition).toEqual({ mode: 'repeat' });
  });
});
