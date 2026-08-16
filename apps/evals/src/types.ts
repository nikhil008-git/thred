import type { SessionMessage } from "@repo/memory-extractor";

export type EvalDataset = "longmemeval" | "longmemeval-v2" | "beam";
export type EvalCategory = "single-session" | "multi-session" | "temporal" | "revision" | "abstention";

export type EvalSession = {
  id: string;
  occurredAt: string;
  messages: SessionMessage[];
};

export type EvalCase = {
  id: string;
  dataset: EvalDataset;
  sessions: EvalSession[];
  question: string;
  expectedAnswer: string | null;
  shouldAbstain: boolean;
  category?: EvalCategory;
};

export type Usage = { inputTokens: number; outputTokens: number };

export type AnswerModel = {
  name: string;
  answer(input: { question: string; context: string }): Promise<{ answer: string; usage: Usage }>;
};

export type EvaluatedAnswer = {
  answer: string;
  abstained: boolean;
  evidence: unknown;
  writeTokens: number;
  readTokens: number;
  ingestLatencyMs: number;
  retrievalLatencyMs: number;
};

export type CaseScore = {
  answerCorrect: boolean | null;
  temporalCorrect: boolean | null;
  revisionCorrect: boolean | null;
  abstentionCorrect: boolean;
};
