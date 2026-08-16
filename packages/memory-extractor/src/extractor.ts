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

/** Extracts and validates the two relevant outputs from raw session material. */
export async function extractRelevantContext(
  model: MemoryExtractionModel,
  request: MemoryExtractionRequest,
): Promise<ExtractedRelevantContext> {
  const result = await model.extract(request, extractionInstructions);
  return parseExtractedRelevantContext(result);
}
