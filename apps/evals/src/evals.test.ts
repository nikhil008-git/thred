import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDatasetRecord } from "./datasets/normalize.js";
import { scoreCase } from "./scoring.js";
import { summarizeMetrics } from "./metrics.js";

test("normalizes a LongMemEval-style session record", () => {
  const result = normalizeDatasetRecord({ question_id: "q1", question: "What DB?", answer: "PostgreSQL", haystack_sessions: [{ session_id: "s1", date_time: "2026-01-01", turns: [{ role: "assistant", content: "We use PostgreSQL." }] }] }, "longmemeval", 0);
  assert.equal(result.id, "q1");
  assert.equal(result.sessions[0]?.messages[0]?.content, "We use PostgreSQL.");
});

test("scores abstention and reports aggregate cost and latency", () => {
  const evalCase = { id: "q", dataset: "beam" as const, sessions: [], question: "Unknown?", expectedAnswer: null, shouldAbstain: true, category: "abstention" as const };
  const answer = { answer: "NOT_FOUND", abstained: true, evidence: [], writeTokens: 10, readTokens: 5, ingestLatencyMs: 2, retrievalLatencyMs: 7 };
  const score = scoreCase(evalCase, answer);
  assert.equal(score.abstentionCorrect, true);
  assert.equal(summarizeMetrics([{ score, result: answer }]).p95LatencyMs, 7);
});
