import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { OpenAIMemoryExtractionModel } from "@repo/memory-extractor";
import { getWorkspaceDatabaseStatus, provisionWorkspaceDatabase } from "@repo/hydra";
import { loadDataset } from "./datasets/loaders.js";
import { stratifiedSample } from "./datasets/stratified.js";
import { summarizeMetrics } from "./metrics.js";
import { OpenAIAnswerJudge, OpenAIAnswerModel } from "./models/openai-answer.js";
import { completeEvalRun, createEvalRun, saveCaseResult } from "./persistence.js";
import { renderComparisonReport } from "./report.js";
import { runThred } from "./runners/thred.js";
import { runVectorRag } from "./runners/vector-rag.js";
import { scoreCase } from "./scoring.js";
import type { CaseScore, EvalCase, EvalDataset, EvaluatedAnswer } from "./types.js";
import type { FailedCaseSummary } from "./report.js";

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
const caseId = option("--case-id");
const hydraWorkspaceId = option("--hydra-workspace");
const resume = process.argv.includes("--resume");
const limitValue = option("--limit");
const limit = limitValue ? Number(limitValue) : undefined;
const stratifiedValue = option("--stratified");
const stratifiedPerCategory = stratifiedValue ? Number(stratifiedValue) : undefined;
const concurrencyValue = option("--concurrency");
const concurrency = concurrencyValue ? Number(concurrencyValue) : 1;
const strategyOption = option("--strategy");
type EvalStrategy = "VECTOR_RAG" | "THRED";
const allowedStrategies: EvalStrategy[] = ["VECTOR_RAG", "THRED"];
const strategyFilter = strategyOption
  ? allowedStrategies.filter((value) => value === strategyOption)
  : allowedStrategies;
if (strategyOption && strategyFilter.length === 0) {
  throw new Error(`--strategy must be one of: ${allowedStrategies.join(", ")}`);
}
if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
  throw new Error("--limit must be a positive integer");
}
if (stratifiedPerCategory !== undefined && (!Number.isInteger(stratifiedPerCategory) || stratifiedPerCategory < 1)) {
  throw new Error("--stratified must be a positive integer (cases per category)");
}
if (!Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error("--concurrency must be a positive integer");
}
if (!dataset || !inputPath || !workspaceId) {
  throw new Error("Usage: npm run eval --workspace=@repo/evals -- --dataset longmemeval-v2 --input path/to/data.json --workspace workspace-id");
}
if (hydraWorkspaceId && !caseId) {
  throw new Error("--hydra-workspace requires --case-id so evaluation cases remain isolated");
}

let evalCases = await loadDataset(inputPath, dataset);
if (caseId) {
  evalCases = evalCases.filter((evalCase) => evalCase.id === caseId);
  console.log(`Selected case: ${caseId}`);
}
if (stratifiedPerCategory !== undefined) {
  evalCases = stratifiedSample(evalCases, stratifiedPerCategory);
  console.log(`Stratified sample: ${evalCases.length} cases (${stratifiedPerCategory} per category when available)`);
}
evalCases = evalCases.slice(0, limit);
if (!evalCases.length) throw new Error("No evaluation cases found in the supplied dataset.");
const answerModel = new OpenAIAnswerModel();
const answerJudge = new OpenAIAnswerJudge();
const extractor = new OpenAIMemoryExtractionModel();
type RunResult = { evalCase: EvalCase; score: CaseScore; result: EvaluatedAnswer };
const all: Record<EvalStrategy, RunResult[]> = { VECTOR_RAG: [], THRED: [] };

async function waitForHydraDatabase(workspace: string) {
  try {
    await provisionWorkspaceDatabase(workspace);
  } catch {
    // A ConflictError means provisioning already started; keep polling status.
  }
  for (let attempt = 0; attempt < 180; attempt += 1) {
    try {
      const status = await getWorkspaceDatabaseStatus(workspace);
      const ready = Boolean((status.data as { infra?: { readyForIngestion?: boolean } } | undefined)?.infra?.readyForIngestion);
      if (ready) return;
    } catch {
      // Status may be unavailable while the database is still initializing.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`HydraDB workspace ${workspace} did not become ready in time`);
}

/** Runs `worker` over every case, with at most `concurrency` running at once. */
async function runWithConcurrency(items: EvalCase[], worker: (item: EvalCase) => Promise<void>) {
  let nextIndex = 0;
  async function workerLoop() {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      if (item) await worker(item);
    }
  }
  const loops = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i += 1) loops.push(workerLoop());
  await Promise.all(loops);
}

type IngestionCheckpoint = { workspaceId: string; completedSessionIds: string[] };

async function loadIngestionCheckpoint(pathname: string, expectedWorkspaceId: string): Promise<IngestionCheckpoint> {
  if (!resume) {
    await rm(pathname, { force: true });
    return { workspaceId: expectedWorkspaceId, completedSessionIds: [] };
  }
  try {
    const checkpoint = JSON.parse(await readFile(pathname, "utf8")) as IngestionCheckpoint;
    return checkpoint.workspaceId === expectedWorkspaceId
      ? checkpoint
      : { workspaceId: expectedWorkspaceId, completedSessionIds: [] };
  } catch {
    return { workspaceId: expectedWorkspaceId, completedSessionIds: [] };
  }
}

/** Runs one case through Thred, saving progress so --resume can skip finished sessions. */
async function runThredCase(evalCase: EvalCase, caseWorkspaceId: string): Promise<EvaluatedAnswer> {
  const checkpointDirectory = path.resolve("reports", "checkpoints");
  await mkdir(checkpointDirectory, { recursive: true });
  const checkpointPath = path.join(checkpointDirectory, `${dataset}-${evalCase.id}.json`);
  const checkpoint = await loadIngestionCheckpoint(checkpointPath, caseWorkspaceId);
  const evaluated = await runThred({
    evalCase,
    workspaceId: caseWorkspaceId,
    extractor,
    answerModel,
    resume: {
      completedSessionIds: checkpoint.completedSessionIds,
      onSessionComplete: async (sessionId) => {
        if (!checkpoint.completedSessionIds.includes(sessionId)) checkpoint.completedSessionIds.push(sessionId);
        await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
      },
    },
  });
  await rm(checkpointPath, { force: true });
  return evaluated;
}

for (const strategy of strategyFilter) {
  const run = await createEvalRun({ workspaceId, dataset, strategy, answerModel: answerModel.name, config: { inputPath, answerJudge: answerJudge.name } });
  console.log(`[${strategy}] run=${run.id} cases=${evalCases.length}`);
  let completedCases = 0;
  await runWithConcurrency(evalCases, async (evalCase) => {
    // Every LongMemEval record is an independent history. Reusing one memory
    // database would allow facts from an earlier case to answer a later case.
    // A named single-case evaluation can reuse a pre-provisioned, isolated
    // HydraDB database. This avoids waiting for provisioning again while never
    // sharing memories across benchmark histories.
    const caseWorkspaceId = hydraWorkspaceId ?? `${workspaceId}_eval_${run.id}_${evalCase.id}`;
    let result: EvaluatedAnswer;
    let score: CaseScore;
    try {
      if (strategy === "VECTOR_RAG") {
        result = await runVectorRag(evalCase, answerModel);
      } else {
        await waitForHydraDatabase(caseWorkspaceId);
        result = await runThredCase(evalCase, caseWorkspaceId);
      }
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
        answerCorrect: null,
        temporalCorrect: null,
        revisionCorrect: null,
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

/** Short summary of one case for the report, with the error/retrieval reason if any. */
function caseSummary(item: RunResult): FailedCaseSummary {
  const evidence = item.result.evidence as { retrieval?: { reason?: string }; error?: string };
  return {
    id: item.evalCase.id,
    question: item.evalCase.question,
    expectedAnswer: item.evalCase.expectedAnswer,
    answer: item.result.answer,
    abstained: item.result.abstained,
    reason: evidence.retrieval?.reason || evidence.error || undefined,
  };
}

function isError(item: RunResult) {
  return item.result.answer === "EVAL_ERROR";
}

function isWrongAnswer(item: RunResult) {
  return !isError(item) && item.score.answerCorrect === false;
}

const report = renderComparisonReport({
  dataset,
  vectorRag: summarizeMetrics(all.VECTOR_RAG),
  thred: summarizeMetrics(all.THRED),
  vectorRagFailures: all.VECTOR_RAG.filter(isWrongAnswer).slice(0, 20).map(caseSummary),
  thredFailures: all.THRED.filter(isWrongAnswer).slice(0, 20).map(caseSummary),
  vectorRagErrors: all.VECTOR_RAG.filter(isError).slice(0, 20).map(caseSummary),
  thredErrors: all.THRED.filter(isError).slice(0, 20).map(caseSummary),
});
const reportDirectory = path.resolve("reports");
await mkdir(reportDirectory, { recursive: true });
const reportPath = path.join(reportDirectory, `${dataset}-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
await writeFile(reportPath, report);
console.log(report);
console.log(`\nReport written to ${reportPath}`);
