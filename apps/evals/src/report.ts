import type { EvalDataset } from "./types.js";

type Summary = ReturnType<typeof import("./metrics.js").summarizeMetrics>;

function percentage(value: number | null) {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

export function renderComparisonReport(input: {
  dataset: EvalDataset;
  vectorRag: Summary;
  thred: Summary;
}): string {
  const rows = [
    ["Accuracy", percentage(input.vectorRag.accuracy), percentage(input.thred.accuracy)],
    ["Temporal accuracy", percentage(input.vectorRag.temporalAccuracy), percentage(input.thred.temporalAccuracy)],
    ["Revision accuracy", percentage(input.vectorRag.revisionAccuracy), percentage(input.thred.revisionAccuracy)],
    ["Abstention accuracy", percentage(input.vectorRag.abstentionAccuracy), percentage(input.thred.abstentionAccuracy)],
    ["Write tokens", String(input.vectorRag.writeTokens), String(input.thred.writeTokens)],
    ["Read tokens", String(input.vectorRag.readTokens), String(input.thred.readTokens)],
    ["p50 retrieval latency", `${input.vectorRag.p50LatencyMs}ms`, `${input.thred.p50LatencyMs}ms`],
    ["p95 retrieval latency", `${input.vectorRag.p95LatencyMs}ms`, `${input.thred.p95LatencyMs}ms`],
  ];
  return [
    `# Thred Track 03 evaluation — ${input.dataset}`,
    "",
    "| Metric | Vector-RAG | Thred |",
    "| --- | ---: | ---: |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
    "Both strategies use the same answer model. The vector baseline is deterministic hashed-vector retrieval.",
  ].join("\n");
}
