import type { EvalDataset } from "./types.js";

type Summary = ReturnType<typeof import("./metrics.js").summarizeMetrics>;

export type FailedCaseSummary = {
  id: string;
  question: string;
  expectedAnswer: string | null;
  answer: string;
  abstained: boolean;
  reason?: string;
};

function percentage(value: number | null) {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

export function renderComparisonReport(input: {
  dataset: EvalDataset;
  vectorRag: Summary;
  thred: Summary;
  vectorRagFailures?: FailedCaseSummary[];
  thredFailures?: FailedCaseSummary[];
  vectorRagErrors?: FailedCaseSummary[];
  thredErrors?: FailedCaseSummary[];
}): string {
  const rows = [
    ["Accuracy", percentage(input.vectorRag.accuracy), percentage(input.thred.accuracy)],
    ["Temporal accuracy", percentage(input.vectorRag.temporalAccuracy), percentage(input.thred.temporalAccuracy)],
    ["Revision accuracy", percentage(input.vectorRag.revisionAccuracy), percentage(input.thred.revisionAccuracy)],
    ["Abstention accuracy", percentage(input.vectorRag.abstentionAccuracy), percentage(input.thred.abstentionAccuracy)],
    ["Eval errors", String(input.vectorRag.evalErrors), String(input.thred.evalErrors)],
    ["Cases scored", String(input.vectorRag.casesScored), String(input.thred.casesScored)],
    ["Write tokens", String(input.vectorRag.writeTokens), String(input.thred.writeTokens)],
    ["Read tokens", String(input.vectorRag.readTokens), String(input.thred.readTokens)],
    ["p50 retrieval latency", `${input.vectorRag.p50LatencyMs}ms`, `${input.thred.p50LatencyMs}ms`],
    ["p95 retrieval latency", `${input.vectorRag.p95LatencyMs}ms`, `${input.thred.p95LatencyMs}ms`],
  ];
  const failures = (strategy: string, items: FailedCaseSummary[]) => [
    `## ${strategy} failed-case summaries`,
    "",
    ...(items.length
      ? items.map((item) => `- \`${item.id}\`: expected ${JSON.stringify(item.expectedAnswer)}; got ${JSON.stringify(item.answer)}${item.abstained ? " (NOT_FOUND)" : ""}${item.reason ? `; retrieval: ${item.reason}` : ""}. Question: ${item.question}`)
      : ["- None."]),
  ];
  const errors = (strategy: string, items: FailedCaseSummary[]) => [
    `## ${strategy} eval-error summaries`,
    "",
    ...(items.length
      ? items.map((item) => `- \`${item.id}\`: ${item.reason ?? "unknown error"}. Question: ${item.question}`)
      : ["- None."]),
  ];

  return [
    `# Thred Track 03 evaluation — ${input.dataset}`,
    "",
    "| Metric | Vector-RAG | Thred |",
    "| --- | ---: | ---: |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
    "Both strategies use the same answer model. The vector baseline is deterministic hashed-vector retrieval.",
    "Accuracy excludes EVAL_ERROR cases; see eval-error summaries below.",
    "",
    ...failures("Vector-RAG", input.vectorRagFailures ?? []),
    "",
    ...failures("Thred", input.thredFailures ?? []),
    "",
    ...errors("Vector-RAG", input.vectorRagErrors ?? []),
    "",
    ...errors("Thred", input.thredErrors ?? []),
  ].join("\n");
}
