import assert from "node:assert/strict";
import test from "node:test";
import { hydraWithRetry } from "./client.js";

function rateLimited(): Error {
  return Object.assign(new Error("429 rate limit, retry-after: 60"), { status: 429 });
}

test("a product Hydra call stops instead of waiting out a long Retry-After", async () => {
  const previous = process.env.HYDRA_LONG_RETRY;
  delete process.env.HYDRA_LONG_RETRY;
  let now = 0;
  const sleeps: number[] = [];
  let calls = 0;

  await assert.rejects(
    () => hydraWithRetry(async () => {
      calls += 1;
      throw rateLimited();
    }, "ingest", {
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    }),
    /exceeded the 30s time budget/,
  );

  assert.equal(calls, 1);
  assert.deepEqual(sleeps, []);
  if (previous === undefined) delete process.env.HYDRA_LONG_RETRY;
  else process.env.HYDRA_LONG_RETRY = previous;
});

test("retries that fit in 30s are kept, then the call fails", async () => {
  const previous = process.env.HYDRA_LONG_RETRY;
  delete process.env.HYDRA_LONG_RETRY;
  let now = 0;
  const sleeps: number[] = [];

  await assert.rejects(
    () => hydraWithRetry(async () => {
      throw Object.assign(new Error("503"), { status: 503 });
    }, "recall", {
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    }),
    /exceeded the 30s time budget/,
  );

  assert.deepEqual(sleeps, [2000, 4000, 8000, 16000]);
  assert.ok(sleeps.reduce((total, ms) => total + ms, 0) <= 30_000);
  if (previous === undefined) delete process.env.HYDRA_LONG_RETRY;
  else process.env.HYDRA_LONG_RETRY = previous;
});
