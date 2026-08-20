import {
  buildMemoryContext,
  buildMemoryHistory,
  CachedMemoryLookup,
  compactMemoryText,
  deriveQueryIntent,
  HydraMemoryLookup,
  ingestSession,
  type QueryIntent,
} from "@repo/memory-engine";
import type { MemoryExtractionModel } from "@repo/memory-extractor";
import type { AnswerModel, EvalCase, EvaluatedAnswer } from "../types.js";

function approximateTokens(value: string): number {
  return Math.ceil(value.trim().length / 4);
}

/** HydraDB indexes asynchronously; retrieving before it settles looks like an empty memory. */
async function waitForIndexedMemory(workspaceId: string, query: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const probe = await buildMemoryContext({
      workspaceId,
      query,
      maxResults: 3,
      minRelevancy: 0.1,
      expandQuery: false,
    });
    if (probe.status === "FOUND") return;
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
}

/** Temporal and revision questions need the ordered claim history, not just current state. */
async function withRevisionTimeline(input: {
  workspaceId: string;
  question: string;
  baseContext: string;
}): Promise<string> {
  const history = await buildMemoryHistory({
    workspaceId: input.workspaceId,
    query: input.question,
    maxResults: 12,
  });
  if (history.status !== "FOUND" || history.timeline.length <= 1) return input.baseContext;

  return [
    input.baseContext,
    "",
    "Revision timeline (oldest to newest):",
    ...history.timeline.map((memory, index) => `[T${index + 1}] ${compactMemoryText(memory.text)}`),
  ].join("\n");
}

/**
 * Retrieved claims answer different question shapes differently. A "how many"
 * question needs every item counted even when stored under related subjects,
 * and a "what should I use" question is answered from the preferences on record
 * rather than from a literal stored answer. Abstention stays available in both.
 */
function intentGuidance(intent: QueryIntent): string | null {
  if (intent.aggregation) {
    return "Count every distinct item in the memories above that answers the question, including items recorded under related subjects, and name each one. Several memories often describe the same item at different times, so count each real-world item once.";
  }
  if (intent.preference) {
    return "The memories above record this user's tools, settings, and stated preferences. Answer with a recommendation grounded in them, naming the specific tools and settings the user already works with. Reply NOT_FOUND only when nothing above relates to the question.";
  }
  return null;
}

export async function runThred(input: {
  evalCase: EvalCase;
  workspaceId: string;
  extractor: MemoryExtractionModel;
  answerModel: AnswerModel;
  resume?: {
    completedSessionIds: string[];
    onSessionComplete(sessionId: string): Promise<void>;
  };
}): Promise<EvaluatedAnswer> {
  const ingestStart = performance.now();
  let writeTokens = 0;
  const ingestion: Array<{ sessionId: string; extractedClaims: number; writtenClaims: number; decisions: string[] }> = [];
  // Shared across sessions so a fact revised in a later session still resolves
  // against the memory it replaces, without waiting for HydraDB to index.
  const memoryLookup = new CachedMemoryLookup(new HydraMemoryLookup());
  const completed = new Set(input.resume?.completedSessionIds ?? []);
  for (const session of input.evalCase.sessions) {
    writeTokens += approximateTokens(session.messages.map((message) => message.content).join("\n"));
    if (completed.has(session.id)) continue;
    const outcome = await ingestSession({
      workspaceId: input.workspaceId,
      sessionId: session.id,
      occurredAt: session.occurredAt,
      persistWorkingMemory: false,
      extractionRequest: { messages: session.messages, changedFiles: [], testResults: [], evidenceReferences: [] },
    }, { model: input.extractor, memoryLookup });
    ingestion.push({
      sessionId: session.id,
      extractedClaims: outcome.extracted.longTerm.length,
      writtenClaims: outcome.processed.filter((claim) => claim.hydraResponse).length,
      decisions: outcome.processed.map((claim) => claim.decision.operation),
    });
    await input.resume?.onSessionComplete(session.id);
  }
  const ingestLatencyMs = Math.round(performance.now() - ingestStart);

  await waitForIndexedMemory(input.workspaceId, input.evalCase.question);

  const retrievalStart = performance.now();
  const needsTimeline = input.evalCase.category === "temporal" || input.evalCase.category === "revision";
  const context = await buildMemoryContext({
    workspaceId: input.workspaceId,
    query: input.evalCase.question,
    minRelevancy: 0.2,
    ...(needsTimeline ? { preferRecent: true } : {}),
  });
  if (context.status === "NOT_FOUND") {
    return {
      answer: "NOT_FOUND",
      abstained: true,
      evidence: { workspaceId: input.workspaceId, ingestion, retrieval: context },
      writeTokens,
      readTokens: 0,
      ingestLatencyMs,
      retrievalLatencyMs: Math.round(performance.now() - retrievalStart),
    };
  }

  const retrievedContext = needsTimeline
    ? await withRevisionTimeline({
      workspaceId: input.workspaceId,
      question: input.evalCase.question,
      baseContext: context.context,
    })
    : context.context;
  const guidance = intentGuidance(deriveQueryIntent(input.evalCase.question));
  const answerContext = guidance ? `${retrievedContext}\n\n${guidance}` : retrievedContext;
  const result = await input.answerModel.answer({ question: input.evalCase.question, context: answerContext });
  return {
    answer: result.answer,
    abstained: result.answer.trim().toUpperCase() === "NOT_FOUND",
    evidence: { workspaceId: input.workspaceId, ingestion, retrieval: context, answerContext },
    writeTokens,
    readTokens: result.usage.inputTokens + result.usage.outputTokens,
    ingestLatencyMs,
    retrievalLatencyMs: Math.round(performance.now() - retrievalStart),
  };
}
