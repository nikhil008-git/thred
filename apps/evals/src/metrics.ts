import type { CaseScore, EvaluatedAnswer } from "./types.js";

export type MetricInput = { score: CaseScore; result: EvaluatedAnswer };

function ratio(values: boolean[]): number | null {
  return values.length ? values.filter(Boolean).length / values.length : null;
}

function percentile(values: number[], ratioValue: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratioValue) - 1)]!;
}

export function summarizeMetrics(results: MetricInput[]) {
  const answer = results.flatMap((item) => item.score.answerCorrect === null ? [] : [item.score.answerCorrect]);
  const temporal = results.flatMap((item) => item.score.temporalCorrect === null ? [] : [item.score.temporalCorrect]);
  const revision = results.flatMap((item) => item.score.revisionCorrect === null ? [] : [item.score.revisionCorrect]);
  const abstention = results.flatMap((item) => item.score.isAbstention ? [item.score.abstentionCorrect] : []);
  const latency = results.map((item) => item.result.retrievalLatencyMs);
  return {
    accuracy: ratio(answer),
    temporalAccuracy: ratio(temporal),
    revisionAccuracy: ratio(revision),
    abstentionAccuracy: ratio(abstention),
    writeTokens: results.reduce((sum, item) => sum + item.result.writeTokens, 0),
    readTokens: results.reduce((sum, item) => sum + item.result.readTokens, 0),
    p50LatencyMs: percentile(latency, 0.5),
    p95LatencyMs: percentile(latency, 0.95),
  };
}
