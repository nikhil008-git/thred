import { prisma, type EvalStrategy } from "@repo/db";
import type { CaseScore, EvalCase, EvaluatedAnswer } from "./types.js";

export async function createEvalRun(input: {
  workspaceId: string;
  dataset: string;
  strategy: EvalStrategy;
  answerModel: string;
  config: object;
}) {
  return prisma.evalRun.create({ data: input });
}

export async function saveCaseResult(input: {
  evalRunId: string;
  evalCase: EvalCase;
  result: EvaluatedAnswer;
  score: CaseScore;
}) {
  return prisma.evalCaseResult.create({
    data: {
      evalRunId: input.evalRunId,
      caseId: input.evalCase.id,
      question: input.evalCase.question,
      expectedAnswer: input.evalCase.expectedAnswer,
      answer: input.result.answer,
      shouldAbstain: input.evalCase.shouldAbstain,
      abstained: input.result.abstained,
      answerCorrect: input.score.answerCorrect,
      temporalCorrect: input.score.temporalCorrect,
      revisionCorrect: input.score.revisionCorrect,
      abstentionCorrect: input.score.abstentionCorrect,
      writeTokens: input.result.writeTokens,
      readTokens: input.result.readTokens,
      ingestLatencyMs: input.result.ingestLatencyMs,
      retrievalLatencyMs: input.result.retrievalLatencyMs,
      evidence: input.result.evidence as never,
    },
  });
}

export async function completeEvalRun(id: string) {
  return prisma.evalRun.update({ where: { id }, data: { completedAt: new Date() } });
}
