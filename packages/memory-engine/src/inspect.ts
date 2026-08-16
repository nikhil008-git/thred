import { getMemoryRelations, type HydraResponse } from "@repo/hydra";

/** Reads graph-backed provenance for a memory without generating an answer. */
export async function inspectMemory(input: {
  workspaceId: string;
  memoryId: string;
}): Promise<{ memoryId: string; relations: HydraResponse }> {
  return {
    memoryId: input.memoryId,
    relations: await getMemoryRelations({ workspaceId: input.workspaceId, sourceId: input.memoryId }),
  };
}
