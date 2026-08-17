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

test("recognizes official LongMemEval abstention ids and evidence sessions", () => {
  const result = normalizeDatasetRecord({
    question_id: "q_abs",
    question_type: "single-session-user",
    question: "Unknown?",
    answer: "Not mentioned",
    answer_session_ids: ["s1"],
    haystack_dates: ["2023/01/01"],
    haystack_session_ids: ["s1"],
    haystack_sessions: [[{ role: "user", content: "Known fact." }]],
  }, "longmemeval", 0);
  assert.equal(result.shouldAbstain, true);
  assert.deepEqual(result.answerSessionIds, ["s1"]);
  assert.equal(result.sessions[0]?.occurredAt, "2023/01/01");
});

test("scores abstention and reports aggregate cost and latency", async () => {
  const evalCase = { id: "q", dataset: "beam" as const, sessions: [], question: "Unknown?", expectedAnswer: null, shouldAbstain: true, category: "abstention" as const };
  const answer = { answer: "NOT_FOUND", abstained: true, evidence: [], writeTokens: 10, readTokens: 5, ingestLatencyMs: 2, retrievalLatencyMs: 7 };
  const score = await scoreCase(evalCase, answer, { name: "test", judge: async () => false });
  assert.equal(score.abstentionCorrect, true);
  assert.equal(summarizeMetrics([{ score, result: answer }]).p95LatencyMs, 7);
  assert.equal(summarizeMetrics([{
    score: { ...score, isAbstention: false },
    result: answer,
  }]).abstentionAccuracy, null);
});
