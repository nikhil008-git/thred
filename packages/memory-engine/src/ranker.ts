import type { HydraMemoryQueryResponse } from "@repo/hydra";

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

function supersededIds(text: string): string[] {
  return [...text.matchAll(/This supersedes memory ([^.\s]+)\./gi)].map((match) => match[1]!);
}

/** Scores recall chunks without inventing a new answer. */
export function rankMemories(response: HydraMemoryQueryResponse): RankedMemory[] {
  return (response.data?.chunks ?? [])
    .map((chunk): RankedMemory | null => {
      const text = chunk.chunkContent?.trim();
      const id = chunk.id ?? chunk.chunkUuid;
      if (!text || !id) return null;

      const recordedAt = chunk.sourceLastUpdatedTime ?? chunk.sourceUploadTime;
      const relevancyScore = Math.max(0, Math.min(1, chunk.relevancyScore ?? 0));
      const confidence = numberAfterLabel(text, "Confidence", 0.5);
      const score = relevancyScore * 0.7 + confidence * 0.2 + recencyScore(recordedAt) * 0.1;

      return {
        id,
        text,
        score,
        relevancyScore,
        confidence,
        ...(recordedAt ? { recordedAt } : {}),
        sourceMessageIds: listAfterLabel(text, "Source messages"),
        evidenceEventIds: listAfterLabel(text, "Evidence events"),
        files: listAfterLabel(text, "Files"),
        supersedesMemoryIds: supersededIds(text),
      };
    })
    .filter((memory): memory is RankedMemory => memory !== null)
    .sort((left, right) => right.score - left.score);
}
