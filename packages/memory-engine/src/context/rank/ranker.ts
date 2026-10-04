import type { HydraChunk, HydraMemoryQueryResponse } from "@repo/hydra";
import { queryKeywords } from "./query-intent.js";

export type RankedMemory = {
  id: string;
  text: string;
  score: number;
  relevancyScore: number;
  confidence: number;
  recordedAt?: string;
  sourceMessageIds: string[];
  evidenceEventIds: string[];
  files: string[];
  supersedesMemoryIds: string[];
};

function listAfterLabel(text: string, label: string): string[] {
  const match = new RegExp(`${label}:\\s*([^.]*)\\.`, "i").exec(text);
  const value = match?.[1]?.trim();
  return !value || value === "none" ? [] : value.split(",").map((item) => item.trim()).filter(Boolean);
}

function provenanceField(text: string, field: string): string[] {
  const match = new RegExp(`${field}=([^;\\]]+)`, "i").exec(text);
  if (!match?.[1]) return [];
  return match[1].split(",").map((item) => item.trim()).filter(Boolean);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function numberAfterLabel(text: string, label: string, fallback: number): number {
  const match = new RegExp(`${label}:\\s*([0-9.]+)`, "i").exec(text);
  const value = Number(match?.[1]);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

function recencyScore(date?: string): number {
  if (!date) return 0.5;
  const age = Date.now() - new Date(date).getTime();
  if (!Number.isFinite(age)) return 0.5;
  // Fresh facts get a small boost, but relevance remains the dominant signal.
  return Math.max(0, 1 - age / (1000 * 60 * 60 * 24 * 180));
}

/** Facts carry their event time in the assertion text; upload time is not chronology. */
function occurredAtFromMemoryText(text: string): string | undefined {
  const value = /Recorded at:\s*([^.]*)\./i.exec(text)?.[1]?.trim();
  if (!value) return undefined;
  const parsed = new Date(value.replace(/\//g, "-"));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function supersededIds(text: string): string[] {
  const ids: string[] = [];
  for (const match of text.matchAll(/This supersedes memory ([^.\s]+)\./gi)) {
    if (match[1]) ids.push(match[1]);
  }
  return ids;
}

/**
 * Fraction of the question's content words present in the claim. Hybrid recall
 * scores can be flat across near-duplicates; lexical overlap breaks those ties
 * toward the claim that actually names the asked-about entity.
 */
export function lexicalOverlap(query: string, text: string): number {
  const keywords = queryKeywords(query);
  if (!keywords.length) return 0;
  const haystack = text.toLocaleLowerCase();
  const matched = keywords.filter((keyword) => haystack.includes(keyword)).length;
  return matched / keywords.length;
}

/** Scores one recall chunk. Returns null when the chunk has no text or id. */
function rankChunk(chunk: HydraChunk, query: string | undefined): RankedMemory | null {
  const text = chunk.chunkContent?.trim();
  const id = chunk.id ?? chunk.chunkUuid;
  if (!text || !id) return null;

  const recordedAt = occurredAtFromMemoryText(text)
    ?? chunk.sourceLastUpdatedTime
    ?? chunk.sourceUploadTime;
  const relevancyScore = Math.max(0, Math.min(1, chunk.relevancyScore ?? 0));
  const confidence = numberAfterLabel(text, "Confidence", 0.5);
  const recency = recencyScore(recordedAt);

  let score: number;
  if (query) {
    const lexical = lexicalOverlap(query, text);
    score = relevancyScore * 0.5 + lexical * 0.25 + confidence * 0.1 + recency * 0.15;
  } else {
    score = relevancyScore * 0.65 + confidence * 0.15 + recency * 0.2;
  }

  return {
    id,
    text,
    score,
    relevancyScore,
    confidence,
    recordedAt,
    sourceMessageIds: unique([
      ...listAfterLabel(text, "Source messages"),
      ...provenanceField(text, "messages"),
    ]),
    evidenceEventIds: unique([
      ...listAfterLabel(text, "Evidence events"),
      ...provenanceField(text, "evidence"),
    ]),
    files: unique([
      ...listAfterLabel(text, "Files"),
      ...provenanceField(text, "files"),
    ]),
    supersedesMemoryIds: supersededIds(text),
  };
}

/** Scores recall chunks without inventing a new answer. Best first. */
export function rankMemories(
  response: HydraMemoryQueryResponse,
  options?: { query?: string },
): RankedMemory[] {
  const query = options?.query?.trim();
  const ranked: RankedMemory[] = [];
  for (const chunk of response.data?.chunks ?? []) {
    const memory = rankChunk(chunk, query);
    if (memory) ranked.push(memory);
  }
  return ranked.sort((left, right) => right.score - left.score);
}
