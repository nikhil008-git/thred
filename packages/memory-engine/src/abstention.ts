import type { RankedMemory } from "./ranker.js";

export type AbstentionResult =
  | { abstain: false }
  | { abstain: true; reason: "NO_RESULTS" | "LOW_RELEVANCE" | "NO_PROVENANCE" };

/** A first-class gate: no supported recall means no claimed answer. */
export function shouldAbstain(memories: RankedMemory[]): AbstentionResult {
  const best = memories[0];
  if (!best) return { abstain: true, reason: "NO_RESULTS" };
  if (best.relevancyScore < 0.35 || best.score < 0.35) {
    return { abstain: true, reason: "LOW_RELEVANCE" };
  }
  if (best.sourceMessageIds.length === 0 && best.evidenceEventIds.length === 0) {
    return { abstain: true, reason: "NO_PROVENANCE" };
  }
  return { abstain: false };
}
