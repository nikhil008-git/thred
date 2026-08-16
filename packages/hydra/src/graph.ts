import { getHydraClient } from "./client.js";
import { workspaceDatabaseId } from "./tenant.js";
import type { HydraResponse } from "./types.js";

const longTermCollection = "long_term";

/** Reads HydraDB-discovered graph relations for an inspect/history response. */
export async function getMemoryRelations(input: {
  workspaceId: string;
  sourceId?: string;
  limit?: number;
}): Promise<HydraResponse> {
  return getHydraClient().context.relations({
    database: workspaceDatabaseId(input.workspaceId),
    collection: longTermCollection,
    type: "memory",
    ...(input.sourceId ? { id: input.sourceId } : {}),
    limit: input.limit ?? 100,
  });
}
