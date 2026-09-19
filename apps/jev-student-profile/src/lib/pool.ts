/** Run `worker` over `items` with up to `concurrency` in-flight jobs. */
export async function runPool<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  if (items.length === 0) return;
  const limit = Math.max(1, Math.min(concurrency, items.length));
  let next = 0;

  const runWorker = async () => {
    while (true) {
      if (signal?.aborted) return;
      const index = next;
      next += 1;
      if (index >= items.length) return;
      await worker(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: limit }, runWorker));
}

export function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  return err instanceof Error && err.name === "AbortError";
}
