import {
  extractRelevantContext,
  type MemoryExtractionModel,
  type MemoryExtractionRequest,
} from "@repo/memory-extractor";
import { saveCheckpoint } from "@repo/working-memory";
import { HydraMemoryLookup } from "./hydra-lookup.js";
import { processLongTermClaim, type MemoryLookup, type ProcessedLongTermClaim } from "./engine.js";

export type IngestSessionInput = {
  workspaceId: string;
  sessionId: string;
  evidenceEventIds?: string[];
  extractionRequest: MemoryExtractionRequest;
};

export type IngestSessionDependencies = {
  model: MemoryExtractionModel;
  memoryLookup?: MemoryLookup;
};

/**
 * The end-to-end write path: session material becomes a Prisma handoff and,
 * after revision resolution, durable HydraDB memories.
 */
export async function ingestSession(
  input: IngestSessionInput,
  dependencies: IngestSessionDependencies,
) {
  const extracted = await extractRelevantContext(dependencies.model, input.extractionRequest);
  const lookup = dependencies.memoryLookup ?? new HydraMemoryLookup();
  const processed: ProcessedLongTermClaim[] = [];

  for (const claim of extracted.longTerm) {
    processed.push(await processLongTermClaim(lookup, {
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      evidenceEventIds: input.evidenceEventIds ?? [],
      claim,
    }));
  }

  const hydraMemoryIds = processed.flatMap((result) =>
    result.hydraResponse?.data?.results?.flatMap((item) => item.id ? [item.id] : []) ?? [],
  );

  const checkpoint = extracted.workingMemory
    ? await saveCheckpoint({
        workspaceId: input.workspaceId,
        sessionId: input.sessionId,
        taskKey: extracted.workingMemory.taskKey,
        task: extracted.workingMemory.task,
        status: extracted.workingMemory.status,
        payload: {
          completed: extracted.workingMemory.completed,
          filesChanged: extracted.workingMemory.filesChanged,
          tests: extracted.workingMemory.tests,
          blockers: extracted.workingMemory.blockers,
          ...(extracted.workingMemory.nextStep
            ? { nextStep: extracted.workingMemory.nextStep }
            : {}),
        },
        hydraMemoryIds,
      })
    : null;

  return { extracted, processed, checkpoint };
}
