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
  occurredAt?: string;
  /** Evaluation runs use isolated HydraDB stores, not product Workspace rows. */
  persistWorkingMemory?: boolean;
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
  const lookup: MemoryLookup = dependencies.memoryLookup ?? new HydraMemoryLookup();
  const processed: ProcessedLongTermClaim[] = [];

  for (const claim of extracted.longTerm) {
    const result = await processLongTermClaim(lookup, {
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      evidenceEventIds: input.evidenceEventIds ?? [],
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      claim,
    });
    processed.push(result);

    const writtenId = result.hydraResponse?.data?.results?.find((item) => item.id)?.id;
    if (writtenId && lookup.recordWrite) {
      lookup.recordWrite({
        workspaceId: input.workspaceId,
        memoryId: writtenId,
        subject: claim.subject,
        predicate: claim.predicate,
        value: claim.value,
      });
    }
  }

  const hydraMemoryIds = processed.flatMap((result) =>
    result.hydraResponse?.data?.results?.flatMap((item) => item.id ? [item.id] : []) ?? [],
  );

  const checkpoint = input.persistWorkingMemory !== false && extracted.workingMemory
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
