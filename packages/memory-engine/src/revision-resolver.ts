import type { LongTermMemoryClaim } from "@repo/memory-extractor";
import { memorySemanticKey, normalizeEntity } from "./entity-resolver.js";

export type ExistingMemory = {
  id: string;
  subject: string;
  predicate: string;
  value: string;
  updatedAt: Date;
};

export type RevisionDecision =
  | { operation: "ADD"; semanticKey: string }
  | { operation: "IGNORE"; semanticKey: string; reason: string; existingMemoryId: string }
  | { operation: "SUPERSEDE"; semanticKey: string; supersededMemoryId: string };

/**
 * Applies the Mem0-style decision: same fact is ignored; a changed value keeps
 * history by superseding the latest current fact instead of overwriting it.
 */
export function resolveRevision(
  claim: LongTermMemoryClaim,
  existingMemories: ExistingMemory[],
): RevisionDecision {
  const semanticKey = memorySemanticKey(claim.subject, claim.predicate);
  const matching = existingMemories
    .filter((memory) => memorySemanticKey(memory.subject, memory.predicate) === semanticKey)
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

  const current = matching[0];
  if (!current) return { operation: "ADD", semanticKey };

  if (normalizeEntity(current.value) === normalizeEntity(claim.value)) {
    return {
      operation: "IGNORE",
      semanticKey,
      existingMemoryId: current.id,
      reason: "The current memory already has the same value",
    };
  }

  return {
    operation: "SUPERSEDE",
    semanticKey,
    supersededMemoryId: current.id,
  };
}
