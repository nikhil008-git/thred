import { buildMemoryContext, ingestSession } from "@repo/memory-engine";
import type { MemoryExtractionModel } from "@repo/memory-extractor";
import type { AnswerModel, EvalCase, EvaluatedAnswer } from "../types.js";

function approximateTokens(value: string): number {
  return Math.ceil(value.trim().length / 4);
}

export async function runThred(input: {
  evalCase: EvalCase;
  workspaceId: string;
  extractor: MemoryExtractionModel;
  answerModel: AnswerModel;
}): Promise<EvaluatedAnswer> {
  const ingestStart = performance.now();
  let writeTokens = 0;
  const ingestion: Array<{ sessionId: string; extractedClaims: number; writtenClaims: number; decisions: string[] }> = [];
  for (const session of input.evalCase.sessions) {
    writeTokens += approximateTokens(session.messages.map((message) => message.content).join("\n"));
    const outcome = await ingestSession({
      workspaceId: input.workspaceId,
      sessionId: session.id,
      persistWorkingMemory: false,
      extractionRequest: { messages: session.messages, changedFiles: [], testResults: [], evidenceReferences: [] },
    }, { model: input.extractor });
    ingestion.push({
      sessionId: session.id,
      extractedClaims: outcome.extracted.longTerm.length,
      writtenClaims: outcome.processed.filter((claim) => claim.hydraResponse).length,
      decisions: outcome.processed.map((claim) => claim.decision.operation),
    });
  }
  const ingestLatencyMs = Math.round(performance.now() - ingestStart);
  const retrievalStart = performance.now();
  const context = await buildMemoryContext({ workspaceId: input.workspaceId, query: input.evalCase.question });
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
  const result = await input.answerModel.answer({ question: input.evalCase.question, context: context.context });
  return {
    answer: result.answer,
    abstained: result.answer.trim().toUpperCase() === "NOT_FOUND",
    evidence: { workspaceId: input.workspaceId, ingestion, retrieval: context, answerContext: context.context },
    writeTokens,
    readTokens: result.usage.inputTokens + result.usage.outputTokens,
    ingestLatencyMs,
    retrievalLatencyMs: Math.round(performance.now() - retrievalStart),
  };
}
