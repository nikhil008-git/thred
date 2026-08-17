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
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratioValue) - 1)]!;
}

export function summarizeMetrics(results: MetricInput[]) {
  const scored = results.filter((item) => !isEvalError(item.result));
  const answer = scored.flatMap((item) => item.score.answerCorrect === null ? [] : [item.score.answerCorrect]);
  const temporal = scored.flatMap((item) => item.score.temporalCorrect === null ? [] : [item.score.temporalCorrect]);
  const revision = scored.flatMap((item) => item.score.revisionCorrect === null ? [] : [item.score.revisionCorrect]);
  const abstention = scored.flatMap((item) => item.score.isAbstention ? [item.score.abstentionCorrect] : []);
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
