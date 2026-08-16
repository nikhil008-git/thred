import { recallLongTermMemory } from "@repo/hydra";
import { shouldAbstain } from "./abstention.js";
import { rankMemories, type RankedMemory } from "./ranker.js";

export type MemoryContext =
  | {
    status: "FOUND";
    query: string;
    memories: RankedMemory[];
    // This is source-grounded context for the calling agent, not an invented answer.
    context: string;
  }
  | {
    status: "NOT_FOUND";
    query: string;
    reason: "NO_RESULTS" | "LOW_RELEVANCE" | "NO_PROVENANCE";
    message: string;
  };

/** Retrieves, ranks, and validates evidence before exposing memory to an agent. */
export async function buildMemoryContext(input: {
  workspaceId: string;
  query: string;
  maxResults?: number;
}): Promise<MemoryContext> {
  const response = await recallLongTermMemory(input);
  const ranked = rankMemories(response);
  // A newer memory that explicitly supersedes another returned candidate wins.
  // We retain the old memory in HydraDB for history, but do not expose it as
  // current context by default.
  const superseded = new Set(ranked.flatMap((memory) => memory.supersedesMemoryIds));
  const memories = ranked.filter((memory) => !superseded.has(memory.id));
  const abstention = shouldAbstain(memories);

  if (abstention.abstain) {
    return {
      status: "NOT_FOUND",
      query: input.query,
      reason: abstention.reason,
      message: "Thred has no sufficiently relevant, provenance-backed memory for this query.",
    };
  }

  const selected = memories.slice(0, input.maxResults ?? 5);
  return {
    status: "FOUND",
    query: input.query,
    memories: selected,
    context: selected.map((memory, index) => `[${index + 1}] ${memory.text}`).join("\n\n"),
  };
}
