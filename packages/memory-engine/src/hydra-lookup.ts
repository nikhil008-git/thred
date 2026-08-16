import { recallLongTermMemory } from "@repo/hydra";
import { memorySemanticKey } from "./entity-resolver.js";
import type { MemoryLookup } from "./engine.js";
import type { ExistingMemory } from "./revision-resolver.js";

function valueFromMemoryText(text: string, subject: string, predicate: string): string | null {
  const prefix = `${subject} ${predicate}`.toLocaleLowerCase();
  const firstSentence = text.split(".")[0]?.trim();
  if (!firstSentence?.toLocaleLowerCase().startsWith(prefix)) return null;

  const value = firstSentence.slice(prefix.length).trim();
  return value || null;
}

/** Uses HydraDB hybrid recall to find prior claims with the same semantic key. */
export class HydraMemoryLookup implements MemoryLookup {
  async findCurrentBySemanticKey(input: {
    workspaceId: string;
    subject: string;
    predicate: string;
  }): Promise<ExistingMemory[]> {
    const response = await recallLongTermMemory({
      workspaceId: input.workspaceId,
      query: `${input.subject} ${input.predicate}`,
      maxResults: 20,
    });

    const semanticKey = memorySemanticKey(input.subject, input.predicate);

    return (response.data?.chunks ?? [])
      .map((chunk): ExistingMemory | null => {
        const text = chunk.chunkContent?.trim();
        const id = chunk.id ?? chunk.chunkUuid;
        if (!text || !id) return null;

        const value = valueFromMemoryText(text, input.subject, input.predicate);
        if (!value) return null;

        return {
          id,
          subject: input.subject,
          predicate: input.predicate,
          value,
          updatedAt: new Date(chunk.sourceLastUpdatedTime ?? chunk.sourceUploadTime ?? 0),
        };
      })
      .filter((memory): memory is ExistingMemory => memory !== null)
      .filter((memory) => memorySemanticKey(memory.subject, memory.predicate) === semanticKey);
  }
}
