import { getHydraClient } from "./client.js";
import { workspaceDatabaseId } from "./tenant.js";
import type { HydraResponse, LongTermMemoryInput } from "./types.js";

const longTermCollection = "long_term";

function validateMemory(input: LongTermMemoryInput) {
  if (!input.text.trim()) throw new Error("long-term memory text is required");
  if (!input.sessionId.trim()) throw new Error("sessionId is required for provenance");
  if (input.confidence < 0 || input.confidence > 1) {
    throw new Error("confidence must be between 0 and 1");
  }
}

/**
 * Ingests a curated, durable memory. The extraction/revision layer decides what
 * is worth writing; this adapter only persists it with readable provenance.
 */
export async function writeLongTermMemory(input: LongTermMemoryInput): Promise<HydraResponse> {
  validateMemory(input);

  const provenance = [
    `kind=${input.kind}`,
    `session=${input.sessionId}`,
    `confidence=${input.confidence}`,
    input.evidenceEventIds?.length ? `evidence=${input.evidenceEventIds.join(",")}` : undefined,
    input.sourceMessageIds?.length ? `messages=${input.sourceMessageIds.join(",")}` : undefined,
    input.files?.length ? `files=${input.files.join(",")}` : undefined,
  ].filter(Boolean).join("; ");

  return getHydraClient().context.ingest({
    database: workspaceDatabaseId(input.workspaceId),
    collection: longTermCollection,
    type: "memory",
    memories: JSON.stringify([{
      text: `${input.text.trim()}\n\n[Thred provenance: ${provenance}]`,
    }]),
  });
}
