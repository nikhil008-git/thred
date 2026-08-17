import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { OpenAIMemoryExtractionModel } from "@repo/memory-extractor";
import { getWorkspaceDatabaseStatus, provisionWorkspaceDatabase } from "@repo/hydra";
import { loadDataset } from "./datasets/loaders.js";
import { summarizeMetrics } from "./metrics.js";
import { OpenAIAnswerJudge, OpenAIAnswerModel } from "./models/openai-answer.js";
import { completeEvalRun, createEvalRun, saveCaseResult } from "./persistence.js";
import { renderComparisonReport } from "./report.js";
import { runThred } from "./runners/thred.js";
import { runVectorRag } from "./runners/vector-rag.js";
import { scoreCase } from "./scoring.js";
import type { EvalCase, EvalDataset, EvaluatedAnswer } from "./types.js";

// npm workspace scripts execute from apps/evals, while local credentials live at
// the repository root. Loading this explicitly keeps CLI invocation reproducible.
loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const dataset = option("--dataset") as EvalDataset | undefined;
const inputPath = option("--input");
const workspaceId = option("--workspace");
const limitValue = option("--limit");
const limit = limitValue ? Number(limitValue) : undefined;
const concurrencyValue = option("--concurrency");
const concurrency = concurrencyValue ? Number(concurrencyValue) : 4;
if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
  throw new Error("--limit must be a positive integer");
}
if (!Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error("--concurrency must be a positive integer");
}
if (!dataset || !inputPath || !workspaceId) {
  throw new Error("Usage: npm run eval --workspace=@repo/evals -- --dataset longmemeval-v2 --input path/to/data.json --workspace workspace-id");
}

const evalCases = (await loadDataset(inputPath, dataset)).slice(0, limit);
if (!evalCases.length) throw new Error("No evaluation cases found in the supplied dataset.");
const answerModel = new OpenAIAnswerModel();
const answerJudge = new OpenAIAnswerJudge();
const extractor = new OpenAIMemoryExtractionModel();
type RunResult = { evalCase: EvalCase; score: Awaited<ReturnType<typeof scoreCase>>; result: EvaluatedAnswer };
const all = { VECTOR_RAG: [] as RunResult[], THRED: [] as RunResult[] };

async function waitForHydraDatabase(workspace: string) {
  await provisionWorkspaceDatabase(workspace);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const status = await getWorkspaceDatabaseStatus(workspace);
      const ready = Boolean((status.data as { infra?: { readyForIngestion?: boolean } } | undefined)?.infra?.readyForIngestion);
      if (ready) return;
    } catch {
      // Provisioning is asynchronous; retry until the service reports readiness.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`HydraDB workspace ${workspace} did not become ready in time`);
}

async function runWithConcurrency<T>(items: T[], worker: (item: T) => Promise<void>) {
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      if (item) await worker(item);
    }
  }));
}

for (const strategy of ["VECTOR_RAG", "THRED"] as const) {
  const run = await createEvalRun({ workspaceId, dataset, strategy, answerModel: answerModel.name, config: { inputPath, answerJudge: answerJudge.name } });
  console.log(`[${strategy}] run=${run.id} cases=${evalCases.length}`);
  let completedCases = 0;
  await runWithConcurrency(evalCases, async (evalCase) => {
    // Every LongMemEval record is an independent history. Reusing one memory
    // database would allow facts from an earlier case to answer a later case.
    const caseWorkspaceId = `${workspaceId}_eval_${run.id}_${evalCase.id}`;
    if (strategy === "THRED") await waitForHydraDatabase(caseWorkspaceId);
    let result: EvaluatedAnswer;
    let score: Awaited<ReturnType<typeof scoreCase>>;
    try {
      result = strategy === "VECTOR_RAG"
        ? await runVectorRag(evalCase, answerModel)
        : await runThred({ evalCase, workspaceId: caseWorkspaceId, extractor, answerModel });
      score = await scoreCase(evalCase, result, answerJudge);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result = {
        answer: "EVAL_ERROR",
        abstained: false,
        evidence: { workspaceId: caseWorkspaceId, error: message },
        writeTokens: 0,
        readTokens: 0,
        ingestLatencyMs: 0,
        retrievalLatencyMs: 0,
      };
      score = {
        answerCorrect: false,
        temporalCorrect: evalCase.category === "temporal" ? false : null,
        revisionCorrect: evalCase.category === "revision" ? false : null,
        abstentionCorrect: false,
        isAbstention: evalCase.shouldAbstain,
      };
      console.error(`[${strategy}] case=${evalCase.id} error=${message}`);
    }
    all[strategy].push({ evalCase, score, result });
    await saveCaseResult({ evalRunId: run.id, evalCase, result, score });
    completedCases += 1;
    if (completedCases === evalCases.length || completedCases % 10 === 0) {
      console.log(`[${strategy}] ${completedCases}/${evalCases.length}`);
    }
  });
  await completeEvalRun(run.id);
  console.log(`[${strategy}] complete run=${run.id}`);
}

const report = renderComparisonReport({
  dataset,
  vectorRag: summarizeMetrics(all.VECTOR_RAG),
  thred: summarizeMetrics(all.THRED),
  vectorRagFailures: all.VECTOR_RAG
    .filter((item) => item.score.answerCorrect === false)
    .slice(0, 20)
    .map((item) => ({
      id: item.evalCase.id,
      question: item.evalCase.question,
      expectedAnswer: item.evalCase.expectedAnswer,
      answer: item.result.answer,
      abstained: item.result.abstained,
    })),
  thredFailures: all.THRED
    .filter((item) => item.score.answerCorrect === false)
    .slice(0, 20)
    .map((item) => {
      const evidence = item.result.evidence as { retrieval?: { reason?: string }; error?: string };
      return {
        id: item.evalCase.id,
        question: item.evalCase.question,
        expectedAnswer: item.evalCase.expectedAnswer,
        answer: item.result.answer,
        abstained: item.result.abstained,
        ...(evidence.retrieval?.reason
          ? { reason: evidence.retrieval.reason }
          : evidence.error ? { reason: evidence.error } : {}),
      };
    }),
});
const reportDirectory = path.resolve("reports");
await mkdir(reportDirectory, { recursive: true });
const reportPath = path.join(reportDirectory, `${dataset}-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
await writeFile(reportPath, report);
console.log(report);
console.log(`\nReport written to ${reportPath}`);
