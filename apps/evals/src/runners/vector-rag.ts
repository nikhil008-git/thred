import type { AnswerModel, EvalCase, EvaluatedAnswer } from "../types.js";

type VectorChunk = { text: string; vector: number[]; sessionId: string; messageIds: string[] };
const dimensions = 192;

function tokens(text: string): string[] {
  return text.toLocaleLowerCase().match(/[a-z0-9_/-]+/g) ?? [];
}

// A deterministic hashed embedding keeps the baseline local and reproducible.
function embed(text: string): number[] {
  const vector = Array.from({ length: dimensions }, () => 0);
  for (const token of tokens(text)) {
    let hash = 2166136261;
    for (const character of token) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    vector[Math.abs(hash) % dimensions]! += 1;
  }
  const magnitude = Math.hypot(...vector) || 1;
  return vector.map((value) => value / magnitude);
}

function cosine(left: number[], right: number[]) {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

function buildChunks(evalCase: EvalCase): VectorChunk[] {
  return evalCase.sessions.flatMap((session) => session.messages.map((message) => ({
    text: `${message.role}: ${message.content}`,
    vector: embed(message.content),
    sessionId: session.id,
    messageIds: [message.id],
  })));
}

export async function runVectorRag(evalCase: EvalCase, answerModel: AnswerModel): Promise<EvaluatedAnswer> {
  const ingestStart = performance.now();
  const chunks = buildChunks(evalCase);
  const ingestLatencyMs = Math.round(performance.now() - ingestStart);
  const retrievalStart = performance.now();
  const query = embed(evalCase.question);
  const selected = chunks.map((chunk) => ({ chunk, score: cosine(query, chunk.vector) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
  const context = selected.map(({ chunk }) => chunk.text).join("\n\n");
  const result = await answerModel.answer({ question: evalCase.question, context });

  return {
    answer: result.answer,
    abstained: result.answer.trim().toUpperCase() === "NOT_FOUND",
    evidence: selected.map(({ chunk, score }) => ({ score, sessionId: chunk.sessionId, messageIds: chunk.messageIds })),
    writeTokens: chunks.reduce((sum, chunk) => sum + tokens(chunk.text).length, 0),
    readTokens: result.usage.inputTokens + result.usage.outputTokens,
    ingestLatencyMs,
    retrievalLatencyMs: Math.round(performance.now() - retrievalStart),
  };
}
