import { recallLongTermMemory } from "@repo/hydra";
import { shouldAbstain } from "./abstention.js";
import { compactMemoryText } from "./memory-text.js";
import { deriveQueryIntent, expansionQueries } from "./query-intent.js";
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

/** Keeps the highest-scoring copy when expansion queries return the same claim. */
function mergeRanked(groups: RankedMemory[][]): RankedMemory[] {
  const byId = new Map<string, RankedMemory>();
  for (const memory of groups.flat()) {
    const existing = byId.get(memory.id);
    if (!existing || memory.score > existing.score) byId.set(memory.id, memory);
  }
  return [...byId.values()].sort((left, right) => right.score - left.score);
}

/** Retrieves, ranks, and validates evidence before exposing memory to an agent. */
export async function buildMemoryContext(input: {
  workspaceId: string;
  query: string;
  maxResults?: number;
  minRelevancy?: number;
  preferRecent?: boolean;
  /** Disables keyword expansion for latency-sensitive probes. */
  expandQuery?: boolean;
}): Promise<MemoryContext> {
  const intent = deriveQueryIntent(input.query);
  // "How many" questions need every matching claim, and items are often stored
  // under related subjects, so recall wide and let ranking order them.
  const recallLimit = input.maxResults ?? (intent.aggregation ? 30 : 12);
  const primary = rankMemories(
    await recallLongTermMemory({
      workspaceId: input.workspaceId,
      query: input.query,
      maxResults: recallLimit,
    }),
    { query: input.query },
  );

  // Expansion costs an extra recall, so only pay for it when the first pass is
  // weak or the question needs every matching claim rather than the best one.
  const bestScore = primary[0]?.relevancyScore ?? 0;
  const shouldExpand = input.expandQuery !== false
    && (intent.aggregation || intent.preference || !primary.length || bestScore < 0.45);
  const expanded: RankedMemory[][] = [primary];
  if (shouldExpand) {
    for (const query of expansionQueries(input.query, intent)) {
      const response = await recallLongTermMemory({
        workspaceId: input.workspaceId,
        query,
        maxResults: recallLimit,
      });
      expanded.push(rankMemories(response, { query: input.query }));
    }
  }

  let ranked = mergeRanked(expanded);
  if (input.preferRecent ?? intent.temporal) {
    ranked = [...ranked].sort((left, right) => {
      const byTime = (right.recordedAt ?? "").localeCompare(left.recordedAt ?? "");
      return byTime !== 0 ? byTime : right.score - left.score;
    });
  }
  // A newer memory that explicitly supersedes another returned candidate wins.
  // We retain the old memory in HydraDB for history, but do not expose it as
  // current context by default.
  const superseded = new Set(ranked.flatMap((memory) => memory.supersedesMemoryIds));
  const memories = ranked.filter((memory) => !superseded.has(memory.id));
  const abstention = shouldAbstain(
    memories,
    input.minRelevancy === undefined ? {} : { minRelevancy: input.minRelevancy },
  );

  if (abstention.abstain) {
    return {
      status: "NOT_FOUND",
      query: input.query,
      reason: abstention.reason,
      message: "Thred has no sufficiently relevant, provenance-backed memory for this query.",
    };
  }

  const contextSize = intent.aggregation ? 20 : 8;
  const selected = memories.slice(0, Math.min(input.maxResults ?? contextSize, contextSize));
  return {
    status: "FOUND",
    query: input.query,
    memories: selected,
    context: selected
      .map((memory, index) => `[${index + 1}] ${compactMemoryText(memory.text)}`)
      .join("\n"),
  };
}
