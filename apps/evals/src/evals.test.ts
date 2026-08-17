import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDatasetRecord } from "./datasets/normalize.js";
import { parseJudgeVerdict } from "./models/openai-answer.js";
import { scoreCase } from "./scoring.js";
import { stratifiedSample } from "./datasets/stratified.js";
import { summarizeMetrics } from "./metrics.js";

test("parseJudgeVerdict accepts exact and trailing-line verdicts", () => {
  assert.equal(parseJudgeVerdict("CORRECT"), true);
  assert.equal(parseJudgeVerdict("INCORRECT"), false);
  assert.equal(parseJudgeVerdict("The candidate matches the reference.\nCORRECT"), true);
  assert.equal(parseJudgeVerdict(""), false);
});

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

test("stratified sample picks balanced categories", () => {
  const cases = [
    { id: "a1", category: "abstention" as const, dataset: "longmemeval" as const, sessions: [], question: "q", expectedAnswer: null, shouldAbstain: true },
    { id: "a2", category: "abstention" as const, dataset: "longmemeval" as const, sessions: [], question: "q", expectedAnswer: null, shouldAbstain: true },
    { id: "t1", category: "temporal" as const, dataset: "longmemeval" as const, sessions: [], question: "q", expectedAnswer: "x", shouldAbstain: false },
    { id: "r1", category: "revision" as const, dataset: "longmemeval" as const, sessions: [], question: "q", expectedAnswer: "x", shouldAbstain: false },
  ];
  const sample = stratifiedSample(cases, 1);
  assert.deepEqual(sample.map((item) => item.id).sort(), ["a1", "r1", "t1"]);
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

test("excludes EVAL_ERROR from accuracy denominator", () => {
  const good = {
    score: { answerCorrect: true, temporalCorrect: null, revisionCorrect: null, abstentionCorrect: false, isAbstention: false },
    result: { answer: "PostgreSQL", abstained: false, evidence: [], writeTokens: 1, readTokens: 1, ingestLatencyMs: 1, retrievalLatencyMs: 1 },
  };
  const error = {
    score: { answerCorrect: null, temporalCorrect: null, revisionCorrect: null, abstentionCorrect: false, isAbstention: false },
    result: { answer: "EVAL_ERROR", abstained: false, evidence: [], writeTokens: 0, readTokens: 0, ingestLatencyMs: 0, retrievalLatencyMs: 0 },
  };
  const summary = summarizeMetrics([good, error]);
  assert.equal(summary.accuracy, 1);
  assert.equal(summary.evalErrors, 1);
  assert.equal(summary.casesScored, 1);
});
