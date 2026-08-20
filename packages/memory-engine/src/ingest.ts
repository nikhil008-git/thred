import {
  extractRelevantContext,
  type MemoryExtractionModel,
  type MemoryExtractionRequest,
} from "@repo/memory-extractor";
import { writeLongTermMemories } from "@repo/hydra";
import { saveCheckpoint } from "@repo/working-memory";
import { memorySemanticKey } from "./entity-resolver.js";
import { HydraMemoryLookup } from "./hydra-lookup.js";
import {
  processLongTermClaim,
  resolveLongTermClaim,
  type MemoryLookup,
  type ProcessedLongTermClaim,
} from "./engine.js";

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
  const keyCounts = new Map<string, number>();
  for (const claim of extracted.longTerm) {
    const key = memorySemanticKey(claim.subject, claim.predicate);
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }

  // Claims about different facts cannot supersede each other, so resolving them
  // first and persisting them in one HTTP request preserves graph semantics while
  // changing the common path from N writes/session to one write/session.
  const batch: Array<{ index: number; claim: typeof extracted.longTerm[number]; result: Awaited<ReturnType<typeof resolveLongTermClaim>> }> = [];
  for (const [index, claim] of extracted.longTerm.entries()) {
    if ((keyCounts.get(memorySemanticKey(claim.subject, claim.predicate)) ?? 0) > 1) continue;
    const result = await resolveLongTermClaim(lookup, {
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      evidenceEventIds: input.evidenceEventIds ?? [],
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      claim,
    });
    batch.push({ index, claim, result });
  }

  if (batch.some((item) => item.result.memory)) {
    const writable = batch.filter((item) => item.result.memory);
    const response = await writeLongTermMemories(writable.map((item) => item.result.memory!));
    for (const [writeIndex, item] of writable.entries()) {
      const id = response.data?.results?.[writeIndex]?.id;
      const hydraResponse = { data: { results: id ? [{ id }] : [] } };
      processed[item.index] = { decision: item.result.decision, hydraResponse };
      if (id && lookup.recordWrite) {
        lookup.recordWrite({
          workspaceId: input.workspaceId,
          memoryId: id,
          subject: item.claim.subject,
          predicate: item.claim.predicate,
          value: item.claim.value,
        });
      }
    }
    for (const item of batch.filter((item) => !item.result.memory)) {
      processed[item.index] = { decision: item.result.decision };
    }
  } else {
    for (const item of batch) processed[item.index] = { decision: item.result.decision };
  }

  for (const [index, claim] of extracted.longTerm.entries()) {
    // Same semantic key within one session must stay sequential: the later
    // claim needs the exact ID just written by the earlier one for SUPERSEDES.
    if ((keyCounts.get(memorySemanticKey(claim.subject, claim.predicate)) ?? 0) === 1) continue;
    const result = await processLongTermClaim(lookup, {
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      evidenceEventIds: input.evidenceEventIds ?? [],
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      claim,
    });
    processed[index] = result;

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
