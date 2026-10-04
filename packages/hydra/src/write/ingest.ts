import { getHydraClient, hydraWithRetry } from "../setup/client.js";
import { workspaceDatabaseId } from "../setup/tenant.js";
import type { HydraMemoryWriteResponse, LongTermMemoryInput } from "../types.js";
import { memoryToSentence, validateMemory, type HydraSentence } from "./sentence-builder.js";

const longTermCollection = "long_term";
// HydraDB rejects ingest payloads above 1,000 memory tokens. Leave headroom
// for provider-side tokenization variance while retaining most batch savings.
const maxBatchTokens = 850;

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

  // Split into batches so each request stays under HydraDB's token limit.
  const batches: HydraSentence[][] = [];
  let batch: HydraSentence[] = [];
  let batchTokens = 0;
  for (const memory of inputs.map(memoryToSentence)) {
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

  const results: { id?: string }[] = [];
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
