import type { CaseScore, EvaluatedAnswer } from "./types.js";

export type MetricInput = { score: CaseScore; result: EvaluatedAnswer };

function isEvalError(result: EvaluatedAnswer): boolean {
  return result.answer === "EVAL_ERROR";
}

function ratio(values: boolean[]): number | null {
  return values.length ? values.filter(Boolean).length / values.length : null;
}

function percentile(values: number[], ratioValue: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratioValue) - 1);
  return sorted[index] ?? 0;
}

export type MetricsSummary = {
  accuracy: number | null;
  temporalAccuracy: number | null;
  revisionAccuracy: number | null;
  abstentionAccuracy: number | null;
  evalErrors: number;
  casesScored: number;
  writeTokens: number;
  readTokens: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
};

export function summarizeMetrics(results: MetricInput[]): MetricsSummary {
  const scored = results.filter((item) => !isEvalError(item.result));
  // null means "not applicable to this case", so it is left out of the ratio.
  const answer: boolean[] = [];
  const temporal: boolean[] = [];
  const revision: boolean[] = [];
  const abstention: boolean[] = [];
  for (const { score } of scored) {
    if (score.answerCorrect !== null) answer.push(score.answerCorrect);
    if (score.temporalCorrect !== null) temporal.push(score.temporalCorrect);
    if (score.revisionCorrect !== null) revision.push(score.revisionCorrect);
    if (score.isAbstention) abstention.push(score.abstentionCorrect);
  }
  const latency = scored.map((item) => item.result.retrievalLatencyMs);
  return {
    accuracy: ratio(answer),
    temporalAccuracy: ratio(temporal),
    revisionAccuracy: ratio(revision),
    abstentionAccuracy: ratio(abstention),
    evalErrors: results.length - scored.length,
    casesScored: scored.length,
    writeTokens: results.reduce((sum, item) => sum + item.result.writeTokens, 0),
    readTokens: results.reduce((sum, item) => sum + item.result.readTokens, 0),
    p50LatencyMs: percentile(latency, 0.5),
    p95LatencyMs: percentile(latency, 0.95),
  };
}
