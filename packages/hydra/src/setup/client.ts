import { HydraDBClient } from "@hydradb/sdk";

let client: HydraDBClient | undefined;
let clientUsesLongRetry = false;

/** Product calls fail once this much time has been spent retrying. */
const productBudgetMs = 30_000;

/**
 * Benchmark runs set HYDRA_LONG_RETRY=1. Everything else, including MCP
 * checkpoints, uses the short budget.
 */
export function usesLongHydraRetry(): boolean {
  return process.env.HYDRA_LONG_RETRY === "1";
}

/**
 * Creates the SDK lazily so importing the package never requires a production
 * secret. This package must only be used in trusted server code.
 */
export function getHydraClient(): HydraDBClient {
  const long = usesLongHydraRetry();
  if (client && clientUsesLongRetry === long) return client;

  const token = process.env.HYDRA_DB_API_KEY;
  if (!token) throw new Error("HYDRA_DB_API_KEY is required for HydraDB access");

  client = new HydraDBClient({
    token,
    maxRetries: long ? 2 : 0,
    timeoutInSeconds: long ? 120 : 30,
  });
  clientUsesLongRetry = long;
  return client;
}

function retryDelayMs(attempt: number, message: string): number {
  const requestedSeconds = /retry[_ -]?after[ :]+(\d+)/i.exec(message)?.[1]
    ?? /retry_after_seconds["']?\s*[:=]\s*(\d+)/i.exec(message)?.[1];
  if (requestedSeconds) return Number(requestedSeconds) * 1000 + 1000;
  return Math.min(60_000, 2000 * 2 ** attempt);
}

function isRetryable(error: unknown): boolean {
  const status = (error as { status?: number; statusCode?: number })?.status
    ?? (error as { statusCode?: number })?.statusCode;
  const message = String((error as { message?: string })?.message ?? "");
  const causeMessage = String((error as { cause?: { message?: string } })?.cause?.message ?? "");
  return status === 429 || (typeof status === "number" && status >= 500)
    || /429|rate.?limit|retry|timeout|econnreset|fetch failed|connection error|terminated|aborted|socket hang up/i.test(`${message} ${causeMessage}`);
}

type RetryHooks = {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Retries transient HydraDB failures (429, 5xx, timeouts). Product calls stop
 * once 30s has been spent. Eval runs (HYDRA_LONG_RETRY=1) keep the long budget.
 */
export async function hydraWithRetry<T>(
  operation: () => Promise<T>,
  label = "hydra",
  hooks: RetryHooks = {},
): Promise<T> {
  const now = hooks.now ?? Date.now;
  const sleep = hooks.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const long = usesLongHydraRetry();
  const maxAttempts = 8;
  const started = now();
  let lastError: unknown;
  let stoppedForBudget = false;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!long && now() - started >= productBudgetMs) {
      stoppedForBudget = true;
      break;
    }
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const message = String((error as { message?: string })?.message ?? "");
      if (!isRetryable(error) || attempt >= maxAttempts - 1) break;
      const delay = retryDelayMs(attempt, message);
      if (!long && delay > productBudgetMs - (now() - started)) {
        stoppedForBudget = true;
        break;
      }
      await sleep(delay);
    }
  }

  if (stoppedForBudget) {
    throw new Error(`HydraDB ${label} exceeded the 30s time budget`, { cause: lastError });
  }
  throw lastError;
}
