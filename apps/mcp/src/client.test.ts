import assert from "node:assert/strict";
import test, { afterEach, beforeEach, mock } from "node:test";
import { apiBaseUrl, apiKey, callMcp, DEFAULT_API_URL } from "./client.js";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.THRED_API_KEY;
const originalApiUrl = process.env.THRED_API_URL;

beforeEach(() => {
  process.env.THRED_API_KEY = "thrd_sk_test_key";
  delete process.env.THRED_API_URL;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.THRED_API_KEY;
  else process.env.THRED_API_KEY = originalApiKey;
  if (originalApiUrl === undefined) delete process.env.THRED_API_URL;
  else process.env.THRED_API_URL = originalApiUrl;
  mock.restoreAll();
});

test("apiBaseUrl defaults to production and strips trailing slash", () => {
  assert.equal(apiBaseUrl(), DEFAULT_API_URL);
  process.env.THRED_API_URL = "http://localhost:8080/";
  assert.equal(apiBaseUrl(), "http://localhost:8080");
});

test("apiKey requires THRED_API_KEY", () => {
  delete process.env.THRED_API_KEY;
  assert.throws(() => apiKey(), /THRED_API_KEY is required/);
});

test("callMcp posts JSON to the MCP route with bearer auth", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = mock.fn(async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ status: "FOUND", query: "auth" }), { status: 200 });
  }) as typeof fetch;

  const result = await callMcp<{ status: string; query: string }>("context", { query: "auth" });

  assert.equal(result.status, "FOUND");
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, `${DEFAULT_API_URL}/api/mcp/context`);
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal((calls[0]?.init?.headers as Record<string, string>).authorization, "Bearer thrd_sk_test_key");
  assert.equal(calls[0]?.init?.body, JSON.stringify({ query: "auth" }));
});

test("callMcp surfaces API error messages", async () => {
  globalThis.fetch = mock.fn(async () =>
    new Response(JSON.stringify({ error: "query is required" }), { status: 400 }),
  ) as typeof fetch;

  await assert.rejects(
    () => callMcp("context", {}),
    /query is required/,
  );
});

test("callMcp maps non-JSON failures to a status error", async () => {
  globalThis.fetch = mock.fn(async () => new Response("upstream down", { status: 502 })) as typeof fetch;

  await assert.rejects(
    () => callMcp("context", { query: "auth" }),
    /Thred API request failed \(502\)/,
  );
});

test("callMcp explains network failures with the URL and cause", async () => {
  globalThis.fetch = mock.fn(async () => {
    const cause = Object.assign(new Error("getaddrinfo ENOTFOUND api.thred.fun"), { code: "ENOTFOUND" });
    throw new TypeError("fetch failed", { cause });
  }) as typeof fetch;

  await assert.rejects(
    () => callMcp("context", { query: "auth" }),
    /Could not reach Thred API at https:\/\/api\.thred\.fun\/api\/mcp\/context \(ENOTFOUND: getaddrinfo ENOTFOUND api\.thred\.fun\)/,
  );
});
