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
  for (const session of input.evalCase.sessions) {
    writeTokens += approximateTokens(session.messages.map((message) => message.content).join("\n"));
    await ingestSession({
      workspaceId: input.workspaceId,
      sessionId: session.id,
      extractionRequest: { messages: session.messages, changedFiles: [], testResults: [], evidenceReferences: [] },
    }, { model: input.extractor });
  }
  const ingestLatencyMs = Math.round(performance.now() - ingestStart);
  const retrievalStart = performance.now();
  const context = await buildMemoryContext({ workspaceId: input.workspaceId, query: input.evalCase.question });
  if (context.status === "NOT_FOUND") {
    return {
      answer: "NOT_FOUND",
      abstained: true,
      evidence: context,
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
    evidence: context.memories,
    writeTokens,
    readTokens: result.usage.inputTokens + result.usage.outputTokens,
    ingestLatencyMs,
    retrievalLatencyMs: Math.round(performance.now() - retrievalStart),
  };
}
