import { recallLongTermMemory } from "@repo/hydra";
import { rankMemories, type RankedMemory } from "./ranker.js";

export type MemoryHistory = {
  status: "FOUND" | "NOT_FOUND";
  query: string;
  timeline: RankedMemory[];
};

/** Returns all matching revisions oldest-to-newest; unlike context this keeps superseded facts. */
export async function buildMemoryHistory(input: {
  workspaceId: string;
  query: string;
  maxResults?: number;
}): Promise<MemoryHistory> {
  const response = await recallLongTermMemory({
    workspaceId: input.workspaceId,
    query: input.query,
    maxResults: input.maxResults ?? 20,
  });
  const timeline = rankMemories(response)
    .filter((memory) => memory.relevancyScore >= 0.35)
    .sort((left, right) => (left.recordedAt ?? "").localeCompare(right.recordedAt ?? ""));

  return timeline.length
    ? { status: "FOUND", query: input.query, timeline }
    : { status: "NOT_FOUND", query: input.query, timeline: [] };
}
