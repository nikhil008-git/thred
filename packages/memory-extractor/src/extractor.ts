import {
  parseExtractedRelevantContext,
  type ExtractedRelevantContext,
} from "./schema.js";

export type SessionMessage = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
};

export type MemoryExtractionRequest = {
  messages: SessionMessage[];
  changedFiles: string[];
  testResults: string[];
  evidenceReferences: string[];
};

/** Implement this adapter with structured output from OpenAI, Anthropic, etc. */
export type MemoryExtractionModel = {
  extract(request: MemoryExtractionRequest, instructions: string): Promise<unknown>;
};

export const extractionInstructions = `
You are Thred's memory extractor. Return only JSON with longTerm and optional workingMemory.

longTerm contains only durable, evidence-backed facts, decisions, architecture knowledge,
lessons, or stable preferences. Every claim must use atomic subject, predicate, and value fields;
reason is optional. Ignore greetings, temporary chatter, guesses, and raw logs.

workingMemory is a concise coding handoff: current task, status, completed work, changed
files, tests, blockers, and the next step. It may be omitted when there is no active task.

Do not invent facts. If evidence is insufficient, return an empty longTerm array and omit
workingMemory. Every long-term claim needs sourceMessageIds and confidence from 0 to 1.
`.trim();

function approximateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

/** Groq free-tier TPM is 8k–20k; keep each extraction call well under that. */
const extractionChunkTokens = 3_500;

export function chunkMessages(messages: SessionMessage[], maxTokens = extractionChunkTokens): SessionMessage[][] {
  const chunks: SessionMessage[][] = [];
  let current: SessionMessage[] = [];
  let tokens = 0;
  for (const message of messages) {
    const size = approximateTokens(message.content);
    if (current.length && tokens + size > maxTokens) {
      chunks.push(current);
      current = [];
      tokens = 0;
    }
    current.push(message);
    tokens += size;
  }
  if (current.length) chunks.push(current);
  return chunks.length ? chunks : [[]];
}

/** Extracts and validates the two relevant outputs from raw session material. */
export async function extractRelevantContext(
  model: MemoryExtractionModel,
  request: MemoryExtractionRequest,
): Promise<ExtractedRelevantContext> {
  const chunks = chunkMessages(request.messages);
  const merged: ExtractedRelevantContext = { longTerm: [] };
  for (const messages of chunks) {
    const result = await model.extract({ ...request, messages }, extractionInstructions);
    const parsed = parseExtractedRelevantContext(result);
    merged.longTerm.push(...parsed.longTerm);
    if (parsed.workingMemory) merged.workingMemory = parsed.workingMemory;
  }
  return merged;
}
