/** Runs independent work a few at a time and keeps result order. */
export async function mapWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const current = next;
      next += 1;
      results[current] = await run(items[current]!);
    }
  }

  const workers = Math.min(Math.max(limit, 1), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
