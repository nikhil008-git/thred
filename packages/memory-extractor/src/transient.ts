/**
 * Network faults arrive wrapped: the OpenAI SDK reports "Connection error."
 * while the underlying "fetch failed" or "ECONNRESET" sits further down the
 * cause chain. Matching only the top-level message costs a whole benchmark
 * case for one dropped socket, so walk the chain before giving up.
 */
export function isTransientNetworkError(error: unknown): boolean {
  const pattern = /timed out|timeout|econnreset|econnrefused|enotfound|eai_again|socket hang up|fetch failed|connection error|network error/i;
  let current: unknown = error;
  for (let depth = 0; current !== null && current !== undefined && depth < 5; depth += 1) {
    const message = (current as { message?: unknown }).message;
    if (typeof message === "string" && pattern.test(message)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
