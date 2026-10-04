import {
  extractRelevantContext,
  type LongTermMemoryClaim,
  type MemoryExtractionModel,
  type MemoryExtractionRequest,
} from "@repo/memory-extractor";
import { writeLongTermMemories } from "@repo/hydra";
import { memorySemanticKey } from "../shared/entity/entity-resolver.js";
import { HydraMemoryLookup } from "./long-term/hydra/hydra-lookup.js";
import {
  processLongTermClaim,
  resolveLongTermClaim,
  type MemoryLookup,
  type ProcessLongTermClaimInput,
  type ProcessedLongTermClaim,
  type ResolvedLongTermClaim,
} from "./long-term/engine.js";
import { saveWorkingMemoryHandoff } from "./short-term/save-working-memory.js";

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

type BatchItem = {
  index: number;
  claim: LongTermMemoryClaim;
  resolved: ResolvedLongTermClaim;
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
  const claims = extracted.longTerm;
  const lookup: MemoryLookup = dependencies.memoryLookup ?? new HydraMemoryLookup();
  const processed: ProcessedLongTermClaim[] = [];

  // Count how many claims in this session talk about the same subject + predicate.
  const keyCounts = new Map<string, number>();
  for (const claim of claims) {
    const key = memorySemanticKey(claim.subject, claim.predicate);
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }
  function isRepeated(claim: LongTermMemoryClaim): boolean {
    const key = memorySemanticKey(claim.subject, claim.predicate);
    return (keyCounts.get(key) ?? 0) > 1;
  }

  function claimInput(claim: LongTermMemoryClaim): ProcessLongTermClaimInput {
    return {
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      evidenceEventIds: input.evidenceEventIds ?? [],
      occurredAt: input.occurredAt,
      claim,
    };
  }

  // Tell the lookup about a fresh write so later claims can find it right away.
  function rememberWrite(claim: LongTermMemoryClaim, memoryId: string) {
    lookup.recordWrite?.({
      workspaceId: input.workspaceId,
      memoryId,
      subject: claim.subject,
      predicate: claim.predicate,
      value: claim.value,
    });
  }

  // Step 1: claims with a unique subject + predicate cannot supersede each
  // other, so resolve them all first and save them in a single HydraDB request.
  const batch: BatchItem[] = [];
  for (const [index, claim] of claims.entries()) {
    if (isRepeated(claim)) continue;
    const resolved = await resolveLongTermClaim(lookup, claimInput(claim));
    batch.push({ index, claim, resolved });
  }

  const toWrite = batch.filter((item) => item.resolved.memory);
  const response = await writeLongTermMemories(toWrite.map((item) => item.resolved.memory!));
  for (const item of batch) {
    processed[item.index] = { decision: item.resolved.decision };
  }
  for (const [writeIndex, item] of toWrite.entries()) {
    const id = response.data?.results?.[writeIndex]?.id;
    processed[item.index] = {
      decision: item.resolved.decision,
      hydraResponse: { data: { results: id ? [{ id }] : [] } },
    };
    if (id) rememberWrite(item.claim, id);
  }

  // Step 2: repeated claims must run one by one, because a later claim needs
  // the exact ID written by the earlier one to mark it as SUPERSEDES.
  for (const [index, claim] of claims.entries()) {
    if (!isRepeated(claim)) continue;
    const result = await processLongTermClaim(lookup, claimInput(claim));
    processed[index] = result;

    const writtenId = result.hydraResponse?.data?.results?.find((item) => item.id)?.id;
    if (writtenId) rememberWrite(claim, writtenId);
  }

  // Collect every HydraDB id we wrote, to link them from the working-memory row.
  const hydraMemoryIds: string[] = [];
  for (const result of processed) {
    for (const item of result.hydraResponse?.data?.results ?? []) {
      if (item.id) hydraMemoryIds.push(item.id);
    }
  }

  let checkpoint = null;
  if (input.persistWorkingMemory !== false && extracted.workingMemory) {
    checkpoint = await saveWorkingMemoryHandoff({
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      workingMemory: extracted.workingMemory,
      hydraMemoryIds,
    });
  }

  return { extracted, processed, checkpoint };
}
