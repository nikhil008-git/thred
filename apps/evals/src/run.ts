import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { OpenAIMemoryExtractionModel } from "@repo/memory-extractor";
import { loadDataset } from "./datasets/loaders.js";
import { summarizeMetrics } from "./metrics.js";
import { OpenAIAnswerModel } from "./models/openai-answer.js";
import { completeEvalRun, createEvalRun, saveCaseResult } from "./persistence.js";
import { renderComparisonReport } from "./report.js";
import { runThred } from "./runners/thred.js";
import { runVectorRag } from "./runners/vector-rag.js";
import { scoreCase } from "./scoring.js";
import type { EvalDataset, EvaluatedAnswer } from "./types.js";

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const dataset = option("--dataset") as EvalDataset | undefined;
const inputPath = option("--input");
const workspaceId = option("--workspace");
if (!dataset || !inputPath || !workspaceId) {
  throw new Error("Usage: npm run eval --workspace=@repo/evals -- --dataset longmemeval-v2 --input path/to/data.json --workspace workspace-id");
}

const evalCases = await loadDataset(inputPath, dataset);
const answerModel = new OpenAIAnswerModel();
const extractor = new OpenAIMemoryExtractionModel();
const all = { VECTOR_RAG: [] as { score: ReturnType<typeof scoreCase>; result: EvaluatedAnswer }[], THRED: [] as { score: ReturnType<typeof scoreCase>; result: EvaluatedAnswer }[] };

for (const strategy of ["VECTOR_RAG", "THRED"] as const) {
  const run = await createEvalRun({ workspaceId, dataset, strategy, answerModel: answerModel.name, config: { inputPath } });
  for (const evalCase of evalCases) {
    const result = strategy === "VECTOR_RAG"
      ? await runVectorRag(evalCase, answerModel)
      : await runThred({ evalCase, workspaceId: `${workspaceId}_eval_${run.id}`, extractor, answerModel });
    const score = scoreCase(evalCase, result);
    all[strategy].push({ score, result });
    await saveCaseResult({ evalRunId: run.id, evalCase, result, score });
  }
  await completeEvalRun(run.id);
}

const report = renderComparisonReport({
  dataset,
  vectorRag: summarizeMetrics(all.VECTOR_RAG),
  thred: summarizeMetrics(all.THRED),
});
const reportDirectory = path.resolve("reports");
await mkdir(reportDirectory, { recursive: true });
const reportPath = path.join(reportDirectory, `${dataset}-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
await writeFile(reportPath, report);
console.log(report);
console.log(`\nReport written to ${reportPath}`);
