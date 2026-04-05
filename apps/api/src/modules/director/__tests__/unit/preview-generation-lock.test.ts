import { describe, expect, it } from 'vitest';
import { runWithPreviewGenerationLock } from '@/modules/director/preview-generation-lock';

describe('runWithPreviewGenerationLock', () => {
  it('deduplicates concurrent generation tasks by key', async () => {
    let executionCount = 0;

    const task = async () => {
      executionCount += 1;
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    };

    await Promise.all([
      runWithPreviewGenerationLock('preview-a', task),
      runWithPreviewGenerationLock('preview-a', task),
      runWithPreviewGenerationLock('preview-a', task),
    ]);

    expect(executionCount).toBe(1);
  });

  it('allows a new task to run after the previous one finishes', async () => {
    let executionCount = 0;

    const task = async () => {
      executionCount += 1;
    };

    await runWithPreviewGenerationLock('preview-b', task);
    await runWithPreviewGenerationLock('preview-b', task);

    expect(executionCount).toBe(2);
  });
});
