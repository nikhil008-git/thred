import { writeLongTermMemory, type HydraMemoryWriteResponse, type LongTermMemoryInput } from "@repo/hydra";
import type { LongTermMemoryClaim } from "@repo/memory-extractor";
import { buildHydraMemory } from "./graph-builder.js";
import {
  resolveRevision,
  type ExistingMemory,
  type RevisionDecision,
} from "./revision-resolver.js";

export type MemoryLookup = {
  findCurrentBySemanticKey(input: {
    workspaceId: string;
    subject: string;
    predicate: string;
  }): Promise<ExistingMemory[]>;
  /** Implemented by lookups that track writes before HydraDB finishes indexing. */
  recordWrite?(input: {
    workspaceId: string;
    memoryId: string;
    subject: string;
    predicate: string;
    value: string;
  }): void;
};

export type ProcessLongTermClaimInput = {
  workspaceId: string;
  sessionId: string;
  evidenceEventIds: string[];
  occurredAt?: string;
  claim: LongTermMemoryClaim;
};

export type ProcessedLongTermClaim = {
  decision: RevisionDecision;
  hydraResponse?: HydraMemoryWriteResponse;
};

export type ResolvedLongTermClaim = {
  decision: RevisionDecision;
  memory?: LongTermMemoryInput;
};

/** Resolves a claim without writing it, allowing safe per-session batching. */
export async function resolveLongTermClaim(
  lookup: MemoryLookup,
  input: ProcessLongTermClaimInput,
): Promise<ResolvedLongTermClaim> {
  const existing = await lookup.findCurrentBySemanticKey({
    workspaceId: input.workspaceId,
    subject: input.claim.subject,
    predicate: input.claim.predicate,
  });
  const decision = resolveRevision(input.claim, existing);
  if (decision.operation === "IGNORE") return { decision };
  return {
    decision,
    memory: buildHydraMemory(input.claim, decision, {
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      evidenceEventIds: input.evidenceEventIds,
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
    }),
  };
}

/** Resolves a claim before any HydraDB write, preserving revision history. */
export async function processLongTermClaim(
  lookup: MemoryLookup,
  input: ProcessLongTermClaimInput,
): Promise<ProcessedLongTermClaim> {
  const resolved = await resolveLongTermClaim(lookup, input);
  if (!resolved.memory) return { decision: resolved.decision };
  const hydraResponse = await writeLongTermMemory(resolved.memory);
  return { decision: resolved.decision, hydraResponse };
}
