const previewGenerationTasks = new Map<string, Promise<void>>();

/**
 * Ensure only one preview generation task runs per key at a time.
 * Concurrent callers with the same key await the first in-flight task.
 */
export async function runWithPreviewGenerationLock(
  key: string,
  task: () => Promise<void>,
): Promise<void> {
  const existingTask = previewGenerationTasks.get(key);
  if (existingTask) {
    await existingTask;
    return;
  }

  const nextTask = (async () => {
    await task();
  })();

  previewGenerationTasks.set(key, nextTask);

  try {
    await nextTask;
  } finally {
    if (previewGenerationTasks.get(key) === nextTask) {
      previewGenerationTasks.delete(key);
    }
  }
}
