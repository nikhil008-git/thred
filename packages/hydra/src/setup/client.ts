import { HydraDBClient } from "@hydradb/sdk";

let client: HydraDBClient | undefined;

/**
 * Creates the SDK lazily so importing the package never requires a production
 * secret. This package must only be used in trusted server code.
 */
export function getHydraClient(): HydraDBClient {
  if (client) return client;

  const token = process.env.HYDRA_DB_API_KEY;
  if (!token) throw new Error("HYDRA_DB_API_KEY is required for HydraDB access");

  client = new HydraDBClient({ token, maxRetries: 2, timeoutInSeconds: 120 });
  return client;
}

/**
 * Retries transient HydraDB failures (429 rate limits, 5xx, timeouts) with
 * backoff, honoring an embedded Retry-After hint when present. Free-tier
 * throughput is throttled, so this prevents a single burst from killing a case.
 */
export async function hydraWithRetry<T>(operation: () => Promise<T>, label = "hydra"): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number; statusCode?: number })?.status
        ?? (error as { statusCode?: number })?.statusCode;
      const message = String((error as { message?: string })?.message ?? "");
      // A dropped socket surfaces as "fetch failed" on the cause, not the error.
      const causeMessage = String((error as { cause?: { message?: string } })?.cause?.message ?? "");
      const retryable = status === 429 || (typeof status === "number" && status >= 500)
        || /429|rate.?limit|retry|timeout|econnreset|fetch failed|connection error|terminated|aborted|socket hang up/i.test(`${message} ${causeMessage}`);
      if (!retryable || attempt >= 7) break;
      const requestedSeconds = /retry[_ -]?after[ :]+(\d+)/i.exec(message)?.[1]
        ?? /retry_after_seconds["']?\s*[:=]\s*(\d+)/i.exec(message)?.[1];
      const delay = requestedSeconds ? Number(requestedSeconds) * 1000 + 1000 : Math.min(60_000, 2000 * 2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// sdk ijmplementation from hydra
