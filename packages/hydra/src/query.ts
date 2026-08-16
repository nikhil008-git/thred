import { getHydraClient } from "./client.js";
import { workspaceDatabaseId } from "./tenant.js";
import type { HydraMemoryQueryResponse, RecallLongTermMemoryInput } from "./types.js";

const longTermCollection = "long_term";

/** Hybrid retrieval with HydraDB graph context, restricted to one workspace. */
export async function recallLongTermMemory(
  input: RecallLongTermMemoryInput,
): Promise<HydraMemoryQueryResponse> {
  if (!input.query.trim()) throw new Error("query is required for long-term recall");

  return getHydraClient().query({
    database: workspaceDatabaseId(input.workspaceId),
    collection: longTermCollection,
    type: "memory",
    query: input.query.trim(),
    queryBy: "hybrid",
    mode: "thinking",
    maxResults: input.maxResults ?? 8,
    graphContext: true,
    queryForcefulRelations: true,
  });
}
