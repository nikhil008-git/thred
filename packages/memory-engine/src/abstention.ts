import type { RankedMemory } from "./ranker.js";

export type AbstentionResult =
  | { abstain: false }
  | { abstain: true; reason: "NO_RESULTS" | "LOW_RELEVANCE" | "NO_PROVENANCE" };

/** A first-class gate: no supported recall means no claimed answer. */
export function shouldAbstain(
  memories: RankedMemory[],
  options?: { minRelevancy?: number },
): AbstentionResult {
  const minRelevancy = options?.minRelevancy ?? 0.25;
  const best = memories[0];
  if (!best) return { abstain: true, reason: "NO_RESULTS" };
  if (best.relevancyScore < minRelevancy && best.score < minRelevancy) {
    return { abstain: true, reason: "LOW_RELEVANCE" };
  }
  const hasProvenanceHint = best.sourceMessageIds.length > 0
    || best.evidenceEventIds.length > 0
    || /source messages:\s*(?!none\b)/i.test(best.text)
    || /messages=[^;\]]+/i.test(best.text);
  if (!hasProvenanceHint) {
    return { abstain: true, reason: "NO_PROVENANCE" };
  }
  return { abstain: false };
}
