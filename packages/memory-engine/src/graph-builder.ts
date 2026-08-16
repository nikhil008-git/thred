import type { LongTermMemoryInput } from "@repo/hydra";
import type { LongTermMemoryClaim } from "@repo/memory-extractor";
import type { RevisionDecision } from "./revision-resolver.js";

export function buildHydraMemory(
  claim: LongTermMemoryClaim,
  decision: RevisionDecision,
  scope: { workspaceId: string; sessionId: string; evidenceEventIds: string[] },
): LongTermMemoryInput {
  const revisionNote = decision.operation === "SUPERSEDE"
    ? ` This supersedes memory ${decision.supersededMemoryId}.`
    : "";
  const reason = claim.reason ? ` Reason: ${claim.reason}.` : "";

  return {
    workspaceId: scope.workspaceId,
    sessionId: scope.sessionId,
    kind: claim.kind,
    text: `${claim.subject} ${claim.predicate} ${claim.value}.${reason}${revisionNote}`,
    confidence: claim.confidence,
    evidenceEventIds: scope.evidenceEventIds,
    sourceMessageIds: claim.sourceMessageIds,
    files: claim.files,
  };
}
