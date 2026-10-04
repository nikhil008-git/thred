import type { LongTermMemoryInput, MemoryRelation } from "@repo/hydra";
import type { LongTermMemoryClaim } from "@repo/memory-extractor";
import type { RevisionDecision } from "../revision/revision-resolver.js";

type MemoryScope = {
  workspaceId: string;
  sessionId: string;
  evidenceEventIds: string[];
  occurredAt?: string;
};
// sentesces ke objexts atp, before sendint or writing it to hydradb tbh.
/**
 * Turns an extracted claim into the object we save in HydraDB:
 * readable text ("subject predicate value. Kind: ...") plus graph relations.
 */
export function buildHydraMemory(
  claim: LongTermMemoryClaim,
  decision: RevisionDecision,
  scope: MemoryScope,
): LongTermMemoryInput {
  const revisionNote = decision.operation === "SUPERSEDE"
    ? ` This supersedes memory ${decision.supersededMemoryId}.`
    : "";
  const reason = claim.reason ? ` Reason: ${claim.reason}.` : "";
  const sourceMessages = claim.sourceMessageIds.join(", ") || "none";
  const files = claim.files.join(", ") || "none";
  const evidence = scope.evidenceEventIds.join(", ") || "none";
  const relations: MemoryRelation[] = [
    { predicate: "ABOUT", target: claim.subject },
    { predicate: "FROM_SESSION", target: scope.sessionId },
  ];
  for (const messageId of claim.sourceMessageIds) {
    relations.push({ predicate: "SUPPORTS", target: `message:${messageId}` });
  }
  for (const eventId of scope.evidenceEventIds) {
    relations.push({ predicate: "SUPPORTS", target: `evidence:${eventId}` });
  }
  for (const file of claim.files) {
    relations.push({ predicate: "TOUCHED_FILE", target: file });
  }
  if (decision.operation === "SUPERSEDE") {
    relations.push({ predicate: "SUPERSEDES", target: `memory:${decision.supersededMemoryId}` });
  }

  const recordedAt = scope.occurredAt ? ` Recorded at: ${scope.occurredAt}.` : "";
  // Keep the assertion first: HydraMemoryLookup can still identify a claim by
  // subject + predicate, while the remaining fields make recall inspectable.
  const text = `${claim.subject} ${claim.predicate} ${claim.value}.`
    + ` Kind: ${claim.kind}. Confidence: ${claim.confidence}.`
    + `${recordedAt}${reason}${revisionNote}`
    + ` Source messages: ${sourceMessages}. Evidence events: ${evidence}. Files: ${files}.`;

  return {
    workspaceId: scope.workspaceId,
    sessionId: scope.sessionId,
    kind: claim.kind,
    text,
    confidence: claim.confidence,
    evidenceEventIds: scope.evidenceEventIds,
    sourceMessageIds: claim.sourceMessageIds,
    files: claim.files,
    relations,
  };
}
