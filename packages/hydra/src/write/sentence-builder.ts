import type { LongTermMemoryInput } from "../types.js";

/** One Hydra ingest item: a single text blob, not the structured object. */
export type HydraSentence = { text: string };

export function validateMemory(input: LongTermMemoryInput) {
  if (!input.text.trim()) throw new Error("long-term memory text is required");
  if (!input.sessionId.trim()) throw new Error("sessionId is required for provenance");
  if (input.confidence < 0 || input.confidence > 1) {
    throw new Error("confidence must be between 0 and 1");
  }
}

/**
 * Turns the graph-builder object into the sentence HydraDB stores:
 * claim text + a [Thred provenance: …] block.
 */
export function memoryToSentence(input: LongTermMemoryInput): HydraSentence {
  const provenance = [
    `kind=${input.kind}`,
    `session=${input.sessionId}`,
    `confidence=${input.confidence}`,
    input.evidenceEventIds?.length ? `evidence=${input.evidenceEventIds.join(",")}` : undefined,
    input.sourceMessageIds?.length ? `messages=${input.sourceMessageIds.join(",")}` : undefined,
    input.files?.length ? `files=${input.files.join(",")}` : undefined,
    input.relations?.length
      ? `relations=${input.relations.map((relation) => `${relation.predicate}:${relation.target}`).join("|")}`
      : undefined,
  ].filter(Boolean).join("; ");

  return { text: `${input.text.trim()}\n\n[Thred provenance: ${provenance}]` };
}
