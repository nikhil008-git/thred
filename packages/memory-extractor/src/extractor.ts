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

Extraction quality rules:
- Use exact sourceMessageIds from the provided messages array for every claim.
- Keep values complete: preserve lists, counts with item names, times with units, and
  preferences with product names. Never collapse a list into a bare number.
- For a collection, emit one claim per item plus one summary claim holding the full list,
  so a later "how many" or "which ones" question can be answered from memory alone.
- Always record the concrete thing the exchange is about — the product, project, model,
  place, or artifact the user owns, bought, or is working on — as its own claim, even when
  most of the exchange is advice. Advice without the subject it applies to is not recallable.
- Record problems the user reports — faults, breakages, complaints, and things that did not
  work — as their own claims naming what was affected and when, separately from any later fix.
  A claim that only records the repair cannot answer a question about the fault.
- When a later message updates an earlier fact, emit both claims in message order using the
  same subject and predicate, oldest value first, so the revision stays traceable.
- Prefer specific subjects ("personal best 5K time", "model kits") over vague ones ("user").
- Record preferences explicitly, including what the user does not want.

workingMemory is a concise coding handoff: current task, status, completed work, changed
files, tests, blockers, and the next step. It may be omitted when there is no active task.

Do not invent facts. If evidence is insufficient, return an empty longTerm array and omit
workingMemory. Every long-term claim needs sourceMessageIds and confidence from 0 to 1.
`.trim();

/**
 * Only exact repeats are dropped. Two claims that share a subject and predicate
 * but differ in value are either list items or a revision, and the revision
 * resolver needs both to emit a SUPERSEDES edge.
 */
function claimKey(claim: { subject: string; predicate: string; value: string }): string {
  return [claim.subject, claim.predicate, claim.value]
    .map((part) => part.trim().toLowerCase())
    .join("::");
}

function backfillSourceMessageIds<T extends { sourceMessageIds: string[] }>(
  claims: T[],
  messages: SessionMessage[],
): T[] {
  const lastUser = [...messages].reverse().find((message) => message.role === "user")?.id;
  const fallback = lastUser ?? messages.at(-1)?.id;
  return claims.map((claim) => ({
    ...claim,
    sourceMessageIds: claim.sourceMessageIds.length
      ? claim.sourceMessageIds
      : fallback ? [fallback] : [],
  }));
}

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
  const seen = new Set<string>();
  const claims: ExtractedRelevantContext["longTerm"] = [];
  for (const messages of chunks) {
    const result = await model.extract({ ...request, messages }, extractionInstructions);
    const parsed = parseExtractedRelevantContext(result);
    for (const claim of parsed.longTerm) {
      const key = claimKey(claim);
      if (seen.has(key)) continue;
      seen.add(key);
      claims.push(claim);
    }
    if (parsed.workingMemory) merged.workingMemory = parsed.workingMemory;
  }
  merged.longTerm = backfillSourceMessageIds(claims, request.messages);
  return merged;
}
