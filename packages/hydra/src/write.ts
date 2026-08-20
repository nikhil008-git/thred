import { getHydraClient, hydraWithRetry } from "./client.js";
import { workspaceDatabaseId } from "./tenant.js";
import type { HydraMemoryWriteResponse, LongTermMemoryInput } from "./types.js";

const longTermCollection = "long_term";
// HydraDB rejects ingest payloads above 1,000 memory tokens. Leave headroom
// for provider-side tokenization variance while retaining most batch savings.
const maxBatchTokens = 850;

function validateMemory(input: LongTermMemoryInput) {
  if (!input.text.trim()) throw new Error("long-term memory text is required");
  if (!input.sessionId.trim()) throw new Error("sessionId is required for provenance");
  if (input.confidence < 0 || input.confidence > 1) {
    throw new Error("confidence must be between 0 and 1");
  }
}

function serializeMemory(input: LongTermMemoryInput) {
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

/**
 * Persists independent claims from one session in one request. The caller keeps
 * claims that revise one another on the sequential path so their SUPERSEDES
 * links retain the exact previous-memory ID.
 */
export async function writeLongTermMemories(
  inputs: LongTermMemoryInput[],
): Promise<HydraMemoryWriteResponse> {
  if (!inputs.length) return { data: { results: [] } };
  inputs.forEach(validateMemory);
  const workspaceId = inputs[0]!.workspaceId;
  if (inputs.some((input) => input.workspaceId !== workspaceId)) {
    throw new Error("a batched HydraDB write must use one workspace");
  }

  const batches: Array<Array<ReturnType<typeof serializeMemory>>> = [];
  let batch: Array<ReturnType<typeof serializeMemory>> = [];
  let batchTokens = 0;
  for (const memory of inputs.map(serializeMemory)) {
    const tokens = Math.max(1, Math.ceil(memory.text.length / 4));
    if (batch.length && batchTokens + tokens > maxBatchTokens) {
      batches.push(batch);
      batch = [];
      batchTokens = 0;
    }
    batch.push(memory);
    batchTokens += tokens;
  }
  if (batch.length) batches.push(batch);

  const results: Array<{ id?: string }> = [];
  for (const memories of batches) {
    const response = await hydraWithRetry(() => getHydraClient().context.ingest({
      database: workspaceDatabaseId(workspaceId),
      collection: longTermCollection,
      type: "memory",
      memories: JSON.stringify(memories),
    }), "ingest");
    results.push(...(response.data?.results ?? []));
  }
  return { data: { results } };
}

/**
 * Ingests a curated, durable memory. The extraction/revision layer decides what
 * is worth writing; this adapter only persists it with readable provenance.
 */
export async function writeLongTermMemory(
  input: LongTermMemoryInput,
): Promise<HydraMemoryWriteResponse> {
  return writeLongTermMemories([input]);
}
