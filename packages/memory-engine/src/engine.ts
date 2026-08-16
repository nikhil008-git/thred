import { writeLongTermMemory, type HydraMemoryWriteResponse } from "@repo/hydra";
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
};

export type ProcessLongTermClaimInput = {
  workspaceId: string;
  sessionId: string;
  evidenceEventIds: string[];
  claim: LongTermMemoryClaim;
};

export type ProcessedLongTermClaim = {
  decision: RevisionDecision;
  hydraResponse?: HydraMemoryWriteResponse;
};

/** Resolves a claim before any HydraDB write, preserving revision history. */
export async function processLongTermClaim(
  lookup: MemoryLookup,
  input: ProcessLongTermClaimInput,
): Promise<ProcessedLongTermClaim> {
  const existing = await lookup.findCurrentBySemanticKey({
    workspaceId: input.workspaceId,
    subject: input.claim.subject,
    predicate: input.claim.predicate,
  });
  const decision = resolveRevision(input.claim, existing);

  if (decision.operation === "IGNORE") return { decision };

  const hydraResponse = await writeLongTermMemory(
    buildHydraMemory(input.claim, decision, {
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      evidenceEventIds: input.evidenceEventIds,
    }),
  );

  return { decision, hydraResponse };
}
