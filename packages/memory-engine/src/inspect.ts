import { getMemoryRelations, recallLongTermMemory, type HydraResponse } from "@repo/hydra";
import { parseProvenanceBlock } from "./memory-text.js";
import { rankMemories } from "./ranker.js";

/** Reads graph-backed provenance for a memory without generating an answer. */
export async function inspectMemory(input: {
  workspaceId: string;
  memoryId: string;
}): Promise<{
  memoryId: string;
  text: string | null;
  provenance: ReturnType<typeof parseProvenanceBlock>;
  relations: HydraResponse;
}> {
  const [relations, recall] = await Promise.all([
    getMemoryRelations({ workspaceId: input.workspaceId, sourceId: input.memoryId }),
    recallLongTermMemory({
      workspaceId: input.workspaceId,
      query: input.memoryId,
      maxResults: 8,
    }),
  ]);

  const memory = rankMemories(recall).find((item) => item.id === input.memoryId);

  return {
    memoryId: input.memoryId,
    text: memory?.text ?? null,
    provenance: memory ? parseProvenanceBlock(memory.text) : null,
    relations,
  };
}
